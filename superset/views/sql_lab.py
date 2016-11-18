from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import json
import logging

from flask import g, request, redirect, Response
from flask_appbuilder import expose
from flask_appbuilder.security.decorators import has_access, has_access_api

from superset import db, models, utils, app, sql_lab
from superset.views.base import BaseSupersetView

config = app.config
log_this = models.Log.log_this
can_access = utils.can_access
QueryStatus = models.QueryStatus


class SqlLab(BaseSupersetView):
    route_base = '/superset'

    @has_access_api
    @expose("/sql_json/", methods=['POST', 'GET'])
    @log_this
    def sql_json(self):
        """Runs arbitrary sql and returns and json"""
        async = request.form.get('runAsync') == 'true'
        sql = request.form.get('sql')
        database_id = request.form.get('database_id')

        session = db.session()
        mydb = session.query(models.Database).filter_by(id=database_id).first()

        if not mydb:
            return self.json_error_response(
                'Database with id {} is missing.'.format(database_id))

        if not self.database_access(mydb):
            return self.json_error_response(
                self.get_database_access_error_msg(mydb.database_name))
        session.commit()

        query = models.Query(
            database_id=int(database_id),
            limit=int(app.config.get('SQL_MAX_ROW', None)),
            sql=sql,
            schema=request.form.get('schema'),
            select_as_cta=request.form.get('select_as_cta') == 'true',
            start_time=utils.now_as_float(),
            tab_name=request.form.get('tab'),
            status=QueryStatus.PENDING if async else QueryStatus.RUNNING,
            sql_editor_id=request.form.get('sql_editor_id'),
            tmp_table_name=request.form.get('tmp_table_name'),
            user_id=int(g.user.get_id()),
            client_id=request.form.get('client_id'),
        )
        session.add(query)
        session.commit()
        query_id = query.id

        # Async request.
        if async:
            # Ignore the celery future object and the request may time out.
            sql_lab.get_sql_results.delay(
                query_id, return_results=False, store_results=not query.select_as_cta)
            return Response(
                json.dumps({'query': query.to_dict()},
                           default=utils.json_int_dttm_ser,
                           allow_nan=False),
                status=202,  # Accepted
                mimetype="application/json")

        # Sync request.
        try:
            SQLLAB_TIMEOUT = config.get("SQLLAB_TIMEOUT")
            with utils.timeout(
                    seconds=SQLLAB_TIMEOUT,
                    error_message=(
                        "The query exceeded the {SQLLAB_TIMEOUT} seconds "
                        "timeout. You may want to run your query as a "
                        "`CREATE TABLE AS` to prevent timeouts."
                    ).format(**locals())):
                data = sql_lab.get_sql_results(query_id, return_results=True)
        except Exception as e:
            logging.exception(e)
            return Response(
                json.dumps({'error': "{}".format(e)}),
                status=500,
                mimetype="application/json")
        return Response(
            data,
            status=200,
            mimetype="application/json")

    @has_access
    @expose("/sqllab_viz/")
    @log_this
    def sqllab_viz(self):
        data = json.loads(request.args.get('data'))
        table_name = data.get('datasourceName')
        viz_type = data.get('chartType')
        table = (
            db.session.query(models.SqlaTable)
            .filter_by(table_name=table_name)
            .first()
        )
        if not table:
            table = models.SqlaTable(table_name=table_name)
        table.database_id = data.get('dbId')
        table.sql = data.get('sql')
        db.session.add(table)
        cols = []
        dims = []
        metrics = []
        for column_name, config in data.get('columns').items():
            is_dim = config.get('is_dim', False)
            col = models.TableColumn(
                column_name=column_name,
                filterable=is_dim,
                groupby=is_dim,
                is_dttm=config.get('is_date', False),
            )
            cols.append(col)
            if is_dim:
                dims.append(col)
            agg = config.get('agg')
            if agg:
                metrics.append(models.SqlMetric(
                    metric_name="{agg}__{column_name}".format(**locals()),
                    expression="{agg}({column_name})".format(**locals()),
                ))
        if not metrics:
            metrics.append(models.SqlMetric(
                metric_name="count".format(**locals()),
                expression="count(*)".format(**locals()),
            ))
        table.columns = cols
        table.metrics = metrics
        db.session.commit()
        params = {
            'viz_type': viz_type,
            'groupby': dims[0].column_name if dims else '',
            'metrics': metrics[0].metric_name if metrics else '',
            'metric': metrics[0].metric_name if metrics else '',
            'since': '100 years ago',
            'limit': '0',
        }
        params = "&".join([k + '=' + v for k, v in params.items()])
        url = '/superset/explore/table/{table.id}/?{params}'.format(**locals())
        return redirect(url)

    @has_access
    @expose("/sqllab")
    def sqllab(self):
        """SQL Editor"""
        return self.render_template(
            'superset/sqllab.html', title="SQL Lab")
