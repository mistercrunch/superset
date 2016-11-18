from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

from datetime import datetime
import logging

from flask import request, redirect, Response, flash
from flask_appbuilder import expose
from flask_appbuilder.security.decorators import has_access

from superset import db, models, utils, app, sm
from superset.views.base import BaseSupersetView
from flask_babel import gettext as __

config = app.config
log_this = models.Log.log_this


class DruidView(BaseSupersetView):
    route_base = '/superset'

    @has_access
    @expose("/sync_druid/", methods=['POST'])
    @log_this
    def sync_druid_source(self):
        """Syncs the druid datasource in main db with the provided config.

        The endpoint takes 3 arguments:
            user - user name to perform the operation as
            cluster - name of the druid cluster
            config - configuration stored in json that contains:
                name: druid datasource name
                dimensions: list of the dimensions, they become druid columns
                    with the type STRING
                metrics_spec: list of metrics (dictionary). Metric consists of
                    2 attributes: type and name. Type can be count,
                    etc. `count` type is stored internally as longSum
            other fields will be ignored.

            Example: {
                "name": "test_click",
                "metrics_spec": [{"type": "count", "name": "count"}],
                "dimensions": ["affiliate_id", "campaign", "first_seen"]
            }
        """
        payload = request.get_json(force=True)
        druid_config = payload['config']
        user_name = payload['user']
        cluster_name = payload['cluster']

        user = sm.find_user(username=user_name)
        if not user:
            err_msg = __("Can't find User '%(name)s', please ask your admin "
                         "to create one.", name=user_name)
            logging.error(err_msg)
            return self.json_error_response(err_msg)
        cluster = db.session.query(models.DruidCluster).filter_by(
            cluster_name=cluster_name).first()
        if not cluster:
            err_msg = __("Can't find DruidCluster with cluster_name = "
                         "'%(name)s'", name=cluster_name)
            logging.error(err_msg)
            return self.json_error_response(err_msg)
        try:
            models.DruidDatasource.sync_to_db_from_config(
                druid_config, user, cluster)
        except Exception as e:
            logging.exception(utils.error_msg_from_exception(e))
            return self.json_error_response(utils.error_msg_from_exception(e))
        return Response(status=201)

    @has_access
    @expose("/refresh_datasources/")
    def refresh_datasources(self):
        """endpoint that refreshes druid datasources metadata"""
        session = db.session()
        for cluster in session.query(models.DruidCluster).all():
            cluster_name = cluster.cluster_name
            try:
                cluster.refresh_datasources()
            except Exception as e:
                flash(
                    "Error while processing cluster '{}'\n{}".format(
                        cluster_name, utils.error_msg_from_exception(e)),
                    "danger")
                logging.exception(e)
                return redirect('/druidclustermodelview/list/')
            cluster.metadata_last_refreshed = datetime.now()
            flash(
                "Refreshed metadata from cluster "
                "[" + cluster.cluster_name + "]",
                'info')
        session.commit()
        return redirect("/druiddatasourcemodelview/list/")
