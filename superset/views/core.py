from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

from datetime import datetime, timedelta
import json
import logging
import pickle
import sys
import time
import zlib

import sqlalchemy as sqla

from flask import (
    g, request, redirect, flash, Response, render_template)
from flask_appbuilder import expose
from flask_appbuilder.security.decorators import has_access, has_access_api
from flask_babel import gettext as __

from sqlalchemy import create_engine

from superset import (
    cache, db, models, viz, utils, app,
    sm, ascii_art, results_backend,
)
from superset.source_registry import SourceRegistry
from superset.models import DatasourceAccessRequest as DAR
from superset.views.base import api, BaseSupersetView, get_error_msg

config = app.config
log_this = models.Log.log_this
can_access = utils.can_access
QueryStatus = models.QueryStatus


class CoreView(BaseSupersetView):

    """The base views for Superset!"""

    route_base = '/superset'

    @has_access_api
    @expose("/override_role_permissions/", methods=['POST'])
    def override_role_permissions(self):
        """Updates the role with the give datasource permissions.

          Permissions not in the request will be revoked. This endpoint should
          be available to admins only. Expects JSON in the format:
           {
            'role_name': '{role_name}',
            'database': [{
                'datasource_type': '{table|druid}',
                'name': '{database_name}',
                'schema': [{
                    'name': '{schema_name}',
                    'datasources': ['{datasource name}, {datasource name}']
                }]
            }]
        }
        """
        data = request.get_json(force=True)
        role_name = data['role_name']
        databases = data['database']

        db_ds_names = set()
        for dbs in databases:
            for schema in dbs['schema']:
                for ds_name in schema['datasources']:
                    fullname = utils.get_datasource_full_name(
                        dbs['name'], ds_name, schema=schema['name'])
                    db_ds_names.add(fullname)

        existing_datasources = SourceRegistry.get_all_datasources(db.session)
        datasources = [
            d for d in existing_datasources if d.full_name in db_ds_names]
        role = sm.find_role(role_name)
        # remove all permissions
        role.permissions = []
        # grant permissions to the list of datasources
        granted_perms = []
        for datasource in datasources:
            view_menu_perm = sm.find_permission_view_menu(
                    view_menu_name=datasource.perm,
                    permission_name='datasource_access')
            # prevent creating empty permissions
            if view_menu_perm and view_menu_perm.view_menu:
                role.permissions.append(view_menu_perm)
                granted_perms.append(view_menu_perm.view_menu.name)
        db.session.commit()
        return Response(json.dumps({
            'granted': granted_perms,
            'requested': list(db_ds_names)
        }), status=201)

    @log_this
    @has_access
    @expose("/request_access/")
    def request_access(self):
        datasources = set()
        dashboard_id = request.args.get('dashboard_id')
        if dashboard_id:
            dash = (
                db.session.query(models.Dashboard)
                .filter_by(id=int(dashboard_id))
                .one()
            )
            datasources |= dash.datasources
        datasource_id = request.args.get('datasource_id')
        datasource_type = request.args.get('datasource_type')
        if datasource_id:
            ds_class = SourceRegistry.sources.get(datasource_type)
            datasource = (
                db.session.query(ds_class)
                .filter_by(id=int(datasource_id))
                .one()
            )
            datasources.add(datasource)
        if request.args.get('action') == 'go':
            for datasource in datasources:
                access_request = DAR(
                    datasource_id=datasource.id,
                    datasource_type=datasource.type)
                db.session.add(access_request)
                db.session.commit()
            flash(__("Access was requested"), "info")
            return redirect('/')

        return self.render_template(
            'superset/request_access.html',
            datasources=datasources,
            datasource_names=", ".join([o.name for o in datasources]),
        )

    @log_this
    @has_access
    @expose("/approve")
    def approve(self):
        datasource_type = request.args.get('datasource_type')
        datasource_id = request.args.get('datasource_id')
        created_by_username = request.args.get('created_by')
        role_to_grant = request.args.get('role_to_grant')
        role_to_extend = request.args.get('role_to_extend')

        session = db.session
        datasource = SourceRegistry.get_datasource(
            datasource_type, datasource_id, session)

        if not datasource:
            flash(self.DATASOURCE_MISSING_ERR, "alert")
            return self.json_error_response(self.DATASOURCE_MISSING_ERR)

        requested_by = sm.find_user(username=created_by_username)
        if not requested_by:
            flash(self.USER_MISSING_ERR, "alert")
            return self.json_error_response(self.USER_MISSING_ERR)

        requests = (
            session.query(DAR)
            .filter(
                DAR.datasource_id == datasource_id,
                DAR.datasource_type == datasource_type,
                DAR.created_by_fk == requested_by.id)
            .all()
        )

        if not requests:
            flash(self.ACCESS_REQUEST_MISSING_ERR, "alert")
            return self.json_error_response(self.ACCESS_REQUEST_MISSING_ERR)

        # check if you can approve
        if self.all_datasource_access() or g.user.id == datasource.owner_id:
            # can by done by admin only
            if role_to_grant:
                role = sm.find_role(role_to_grant)
                requested_by.roles.append(role)
                flash(__(
                    "%(user)s was granted the role %(role)s that gives access "
                    "to the %(datasource)s",
                    user=requested_by.username,
                    role=role_to_grant,
                    datasource=datasource.full_name), "info")

            if role_to_extend:
                perm_view = sm.find_permission_view_menu(
                    'datasource_access', datasource.perm)
                sm.add_permission_role(sm.find_role(role_to_extend), perm_view)
                flash(__("Role %(r)s was extended to provide the access to"
                         " the datasource %(ds)s",
                         r=role_to_extend, ds=datasource.full_name), "info")

        else:
            flash(__("You have no permission to approve this request"),
                  "danger")
            return redirect('/accessrequestsmodelview/list/')
        for r in requests:
            session.delete(r)
        session.commit()
        return redirect('/accessrequestsmodelview/list/')

    def get_viz(
            self,
            slice_id=None,
            args=None,
            datasource_type=None,
            datasource_id=None):
        if slice_id:
            slc = db.session.query(models.Slice).filter_by(id=slice_id).one()
            return slc.get_viz()
        else:
            viz_type = args.get('viz_type', 'table')
            datasource = SourceRegistry.get_datasource(
                datasource_type, datasource_id, db.session)
            viz_obj = viz.viz_types[viz_type](
                datasource, request.args if request.args else args)
            return viz_obj

    @has_access
    @expose("/slice/<slice_id>/")
    def slice(self, slice_id):
        viz_obj = self.get_viz(slice_id)
        return redirect(viz_obj.get_url(**request.args))

    @log_this
    @has_access_api
    @expose(
        "/update_explore/<datasource_type>/<datasource_id>/", methods=['POST'])
    def update_explore(self, datasource_type, datasource_id):
        """Send back new viz on POST request for updating update explore view"""
        form_data = json.loads(request.form.get('data'))
        error_redirect = '/slicemodelview/list/'
        try:
            viz_obj = self.get_viz(
                datasource_type=datasource_type,
                datasource_id=datasource_id,
                args=form_data)
        except Exception as e:
            flash('{}'.format(e), "alert")
            return redirect(error_redirect)
        return viz_obj.get_json()

    @has_access_api
    @expose("/explore_json/<datasource_type>/<datasource_id>/")
    def explore_json(self, datasource_type, datasource_id):
        try:
            viz_obj = self.get_viz(
                datasource_type=datasource_type,
                datasource_id=datasource_id,
                args=request.args)
        except Exception as e:
            logging.exception(e)
            return self.json_error_response(utils.error_msg_from_exception(e))

        if not self.datasource_access(viz_obj.datasource):
            return Response(
                json.dumps(
                    {'error': self.DATASOURCE_ACCESS_ERR}),
                status=404,
                mimetype="application/json")

        payload = ""
        try:
            payload = viz_obj.get_json()
        except Exception as e:
            logging.exception(e)
            return self.json_error_response(utils.error_msg_from_exception(e))

        return Response(
            payload,
            status=200,
            mimetype="application/json")

    @expose("/import_dashboards", methods=['GET', 'POST'])
    @log_this
    def import_dashboards(self):
        """Overrides the dashboards using pickled instances from the file."""
        f = request.files.get('file')
        if request.method == 'POST' and f:
            current_tt = int(time.time())
            data = pickle.load(f)
            for table in data['datasources']:
                models.SqlaTable.import_obj(table, import_time=current_tt)
            for dashboard in data['dashboards']:
                models.Dashboard.import_obj(
                    dashboard, import_time=current_tt)
            db.session.commit()
            return redirect('/dashboardmodelview/list/')
        return self.render_template('superset/import_dashboards.html')

    @log_this
    @has_access
    @expose("/explore/<datasource_type>/<datasource_id>/")
    def explore(self, datasource_type, datasource_id):
        viz_type = request.args.get("viz_type")
        slice_id = request.args.get('slice_id')
        slc = None
        if slice_id:
            slc = db.session.query(models.Slice).filter_by(id=slice_id).first()

        error_redirect = '/slicemodelview/list/'
        datasource_class = SourceRegistry.sources[datasource_type]
        datasources = db.session.query(datasource_class).all()
        datasources = sorted(datasources, key=lambda ds: ds.full_name)

        try:
            viz_obj = self.get_viz(
                datasource_type=datasource_type,
                datasource_id=datasource_id,
                args=request.args)
        except Exception as e:
            flash('{}'.format(e), "alert")
            return redirect(error_redirect)

        if not viz_obj.datasource:
            flash(self.DATASOURCE_MISSING_ERR, "alert")
            return redirect(error_redirect)

        if not self.datasource_access(viz_obj.datasource):
            flash(
                __(self.get_datasource_access_error_msg(
                    viz_obj.datasource.name)),
                "danger")
            return redirect(
                'superset/request_access/?'
                'datasource_type={datasource_type}&'
                'datasource_id={datasource_id}&'
                ''.format(**locals()))

        if not viz_type and viz_obj.datasource.default_endpoint:
            return redirect(viz_obj.datasource.default_endpoint)

        # slc perms
        slice_add_perm = self.can_access('can_add', 'SliceModelView')
        slice_edit_perm = self.check_ownership(slc, raise_if_false=False)
        slice_download_perm = self.can_access('can_download', 'SliceModelView')

        # handle save or overwrite
        action = request.args.get('action')
        if action in ('saveas', 'overwrite'):
            return self.save_or_overwrite_slice(
                request.args, slc, slice_add_perm, slice_edit_perm)

        # handle different endpoints
        if request.args.get("csv") == "true":
            payload = viz_obj.get_csv()
            return Response(
                payload,
                status=200,
                headers=self.generate_download_headers("csv"),
                mimetype="application/csv")
        elif request.args.get("standalone") == "true":
            return self.render_template(
                "superset/standalone.html", viz=viz_obj, standalone_mode=True)
        elif request.args.get("V2") == "true":
            # bootstrap data for explore V2
            bootstrap_data = {
                "can_add": slice_add_perm,
                "can_download": slice_download_perm,
                "can_edit": slice_edit_perm,
                # TODO: separate endpoint for fetching datasources
                "datasources": [(d.id, d.full_name) for d in datasources],
                "datasource_id": datasource_id,
                "datasource_name": viz_obj.datasource.name,
                "datasource_type": datasource_type,
                "user_id": g.user.get_id() if g.user else None,
                "viz": json.loads(viz_obj.get_json())
            }
            return self.render_template(
                "superset/explorev2.html",
                bootstrap_data=json.dumps(bootstrap_data),
                slice_name=slc.slice_name,
                table_name=viz_obj.datasource.table_name)
        else:
            return self.render_template(
                "superset/explore.html",
                viz=viz_obj, slice=slc, datasources=datasources,
                can_add=slice_add_perm, can_edit=slice_edit_perm,
                can_download=slice_download_perm,
                userid=g.user.get_id() if g.user else ''
            )

    def save_or_overwrite_slice(
            self, args, slc, slice_add_perm, slice_edit_perm):
        """Save or overwrite a slice"""
        slice_name = args.get('slice_name')
        action = args.get('action')

        # TODO use form processing form wtforms
        d = args.to_dict(flat=False)
        del d['action']
        del d['previous_viz_type']

        as_list = ('metrics', 'groupby', 'columns', 'all_columns',
                   'mapbox_label', 'order_by_cols')
        for k in d:
            v = d.get(k)
            if k in as_list and not isinstance(v, list):
                d[k] = [v] if v else []
            if k not in as_list and isinstance(v, list):
                d[k] = v[0]

        datasource_type = args.get('datasource_type')
        datasource_id = args.get('datasource_id')

        if action in ('saveas'):
            d.pop('slice_id')  # don't save old slice_id
            slc = models.Slice(owners=[g.user] if g.user else [])

        slc.params = json.dumps(d, indent=4, sort_keys=True)
        slc.datasource_name = args.get('datasource_name')
        slc.viz_type = args.get('viz_type')
        slc.datasource_type = datasource_type
        slc.datasource_id = datasource_id
        slc.slice_name = slice_name

        if action in ('saveas') and slice_add_perm:
            self.save_slice(slc)
        elif action == 'overwrite' and slice_edit_perm:
            self.overwrite_slice(slc)

        # Adding slice to a dashboard if requested
        dash = None
        if request.args.get('add_to_dash') == 'existing':
            dash = (
                db.session.query(models.Dashboard)
                .filter_by(id=int(request.args.get('save_to_dashboard_id')))
                .one()
            )
            flash(
                "Slice [{}] was added to dashboard [{}]".format(
                    slc.slice_name,
                    dash.dashboard_title),
                "info")
        elif request.args.get('add_to_dash') == 'new':
            dash = models.Dashboard(
                dashboard_title=request.args.get('new_dashboard_name'),
                owners=[g.user] if g.user else [])
            flash(
                "Dashboard [{}] just got created and slice [{}] was added "
                "to it".format(
                    dash.dashboard_title,
                    slc.slice_name),
                "info")

        if dash and slc not in dash.slices:
            dash.slices.append(slc)
            db.session.commit()

        if request.args.get('goto_dash') == 'true':
            return redirect(dash.url)
        else:
            return redirect(slc.slice_url)

    def save_slice(self, slc):
        session = db.session()
        msg = "Slice [{}] has been saved".format(slc.slice_name)
        session.add(slc)
        session.commit()
        flash(msg, "info")

    def overwrite_slice(self, slc):
        can_update = self.check_ownership(slc, raise_if_false=False)
        if not can_update:
            flash("You cannot overwrite [{}]".format(slc), "danger")
        else:
            session = db.session()
            session.merge(slc)
            session.commit()
            msg = "Slice [{}] has been overwritten".format(slc.slice_name)
            flash(msg, "info")

    @api
    @has_access_api
    @expose("/checkbox/<model_view>/<id_>/<attr>/<value>", methods=['GET'])
    def checkbox(self, model_view, id_, attr, value):
        """endpoint for checking/unchecking any boolean in a sqla model"""
        views = sys.modules[__name__]
        model_view_cls = getattr(views, model_view)
        model = model_view_cls.datamodel.obj

        obj = db.session.query(model).filter_by(id=id_).first()
        if obj:
            setattr(obj, attr, value == 'true')
            db.session.commit()
        return Response("OK", mimetype="application/json")

    @api
    @has_access_api
    @expose("/activity_per_day")
    def activity_per_day(self):
        """endpoint to power the calendar heatmap on the welcome page"""
        Log = models.Log  # noqa
        qry = (
            db.session
            .query(
                Log.dt,
                sqla.func.count())
            .group_by(Log.dt)
            .all()
        )
        payload = {str(time.mktime(dt.timetuple())):
                   ccount for dt, ccount in qry if dt}
        return Response(json.dumps(payload), mimetype="application/json")

    @api
    @has_access_api
    @expose("/tables/<db_id>/<schema>")
    def tables(self, db_id, schema):
        schema = None if schema in ('null', 'undefined') else schema
        database = (
            db.session
            .query(models.Database)
            .filter_by(id=db_id)
            .one()
        )
        payload = {
            'tables': database.all_table_names(schema),
            'views': database.all_view_names(schema),
        }
        return Response(
            json.dumps(payload), mimetype="application/json")

    @api
    @has_access_api
    @expose("/save_dash/<dashboard_id>/", methods=['GET', 'POST'])
    def save_dash(self, dashboard_id):
        """Save a dashboard's metadata"""
        data = json.loads(request.form.get('data'))
        positions = data['positions']
        slice_ids = [int(d['slice_id']) for d in positions]
        session = db.session()
        Dash = models.Dashboard  # noqa
        dash = session.query(Dash).filter_by(id=dashboard_id).first()
        self.check_ownership(dash, raise_if_false=True)
        dash.slices = [o for o in dash.slices if o.id in slice_ids]
        positions = sorted(data['positions'], key=lambda x: int(x['slice_id']))
        dash.position_json = json.dumps(positions, indent=4, sort_keys=True)
        md = dash.params_dict
        if 'filter_immune_slices' not in md:
            md['filter_immune_slices'] = []
        if 'filter_immune_slice_fields' not in md:
            md['filter_immune_slice_fields'] = {}
        md['expanded_slices'] = data['expanded_slices']
        dash.json_metadata = json.dumps(md, indent=4)
        dash.css = data['css']
        session.merge(dash)
        session.commit()
        session.close()
        return "SUCCESS"

    @api
    @has_access_api
    @expose("/add_slices/<dashboard_id>/", methods=['POST'])
    def add_slices(self, dashboard_id):
        """Add and save slices to a dashboard"""
        data = json.loads(request.form.get('data'))
        session = db.session()
        Slice = models.Slice  # noqa
        dash = (
            session.query(models.Dashboard).filter_by(id=dashboard_id).first())
        self.check_ownership(dash, raise_if_false=True)
        new_slices = session.query(Slice).filter(
            Slice.id.in_(data['slice_ids']))
        dash.slices += new_slices
        session.merge(dash)
        session.commit()
        session.close()
        return "SLICES ADDED"

    @api
    @has_access_api
    @expose("/testconn", methods=["POST", "GET"])
    def testconn(self):
        """Tests a sqla connection"""
        try:
            uri = request.json.get('uri')
            db_name = request.json.get('name')
            if db_name:
                database = (
                    db.session
                    .query(models.Database)
                    .filter_by(database_name=db_name)
                    .first()
                )
                if database and uri == database.safe_sqlalchemy_uri():
                    # the password-masked uri was passed
                    # use the URI associated with this database
                    uri = database.sqlalchemy_uri_decrypted
            connect_args = (
                request.json
                .get('extras', {})
                .get('engine_params', {})
                .get('connect_args', {}))
            engine = create_engine(uri, connect_args=connect_args)
            engine.connect()
            return json.dumps(engine.table_names(), indent=4)
        except Exception as e:
            return Response((
                "Connection failed!\n\n"
                "The error message returned was:\n{}").format(e),
                status=500,
                mimetype="application/json")

    @api
    @has_access_api
    @expose("/warm_up_cache/", methods=['GET'])
    def warm_up_cache(self):
        """Warms up the cache for the slice or table."""
        slices = None
        session = db.session()
        slice_id = request.args.get('slice_id')
        table_name = request.args.get('table_name')
        db_name = request.args.get('db_name')

        if not slice_id and not (table_name and db_name):
            return self.json_error_response(__(
                "Malformed request. slice_id or table_name and db_name "
                "arguments are expected"), status=400)
        if slice_id:
            slices = session.query(models.Slice).filter_by(id=slice_id).all()
            if not slices:
                return self.json_error_response(__(
                    "Slice %(id)s not found", id=slice_id), status=404)
        elif table_name and db_name:
            table = (
                session.query(models.SqlaTable)
                .join(models.Database)
                .filter(
                    models.Database.database_name == db_name or
                    models.SqlaTable.table_name == table_name)
            ).first()
            if not table:
                self.json_error_response(__(
                    "Table %(t)s wasn't found in the database %(d)s",
                    t=table_name, s=db_name), status=404)
            slices = session.query(models.Slice).filter_by(
                datasource_id=table.id,
                datasource_type=table.type).all()

        for slice in slices:
            try:
                obj = slice.get_viz()
                obj.get_json(force=True)
            except Exception as e:
                return self.json_error_response(utils.error_msg_from_exception(e))
        return Response(
            json.dumps(
                [{"slice_id": slc.id, "slice_name": slc.slice_name}
                 for slc in slices]),
            status=200,
            mimetype="application/json")

    @expose("/favstar/<class_name>/<obj_id>/<action>/")
    def favstar(self, class_name, obj_id, action):
        session = db.session()
        FavStar = models.FavStar  # noqa
        count = 0
        favs = session.query(FavStar).filter_by(
            class_name=class_name, obj_id=obj_id,
            user_id=g.user.get_id()).all()
        if action == 'select':
            if not favs:
                session.add(
                    FavStar(
                        class_name=class_name,
                        obj_id=obj_id,
                        user_id=g.user.get_id(),
                        dttm=datetime.now()
                    )
                )
            count = 1
        elif action == 'unselect':
            for fav in favs:
                session.delete(fav)
        else:
            count = len(favs)
        session.commit()
        return Response(
            json.dumps({'count': count}),
            mimetype="application/json")

    @has_access
    @expose("/dashboard/<dashboard_id>/")
    def dashboard(self, dashboard_id):
        """Server side rendering for a dashboard"""
        session = db.session()
        qry = session.query(models.Dashboard)
        if dashboard_id.isdigit():
            qry = qry.filter_by(id=int(dashboard_id))
        else:
            qry = qry.filter_by(slug=dashboard_id)

        dash = qry.one()
        datasources = {slc.datasource for slc in dash.slices}
        for datasource in datasources:
            if not self.datasource_access(datasource):
                flash(
                    __(self.get_datasource_access_error_msg(datasource.name)),
                    "danger")
                return redirect(
                    'superset/request_access/?'
                    'dashboard_id={dash.id}&'
                    ''.format(**locals()))

        # Hack to log the dashboard_id properly, even when getting a slug
        @log_this
        def dashboard(**kwargs):  # noqa
            pass
        dashboard(dashboard_id=dash.id)
        dash_edit_perm = self.check_ownership(dash, raise_if_false=False)
        dash_save_perm = \
            dash_edit_perm and self.can_access('can_save_dash', 'Superset')
        standalone = request.args.get("standalone") == "true"
        context = dict(
            user_id=g.user.get_id(),
            dash_save_perm=dash_save_perm,
            dash_edit_perm=dash_edit_perm,
            standalone_mode=standalone,
        )
        return self.render_template(
            "superset/dashboard.html",
            dashboard=dash,
            context=json.dumps(context),
            standalone_mode=standalone,
        )

    @has_access
    @expose("/table/<database_id>/<table_name>/<schema>/")
    @log_this
    def table(self, database_id, table_name, schema):
        schema = None if schema in ('null', 'undefined') else schema
        mydb = db.session.query(models.Database).filter_by(id=database_id).one()
        cols = []
        indexes = []
        t = mydb.get_columns(table_name, schema)
        try:
            t = mydb.get_columns(table_name, schema)
            indexes = mydb.get_indexes(table_name, schema)
            primary_key = mydb.get_pk_constraint(table_name, schema)
            foreign_keys = mydb.get_foreign_keys(table_name, schema)
        except Exception as e:
            return Response(
                json.dumps({'error': utils.error_msg_from_exception(e)}),
                mimetype="application/json")
        keys = []
        if primary_key and primary_key.get('constrained_columns'):
            primary_key['column_names'] = primary_key.pop('constrained_columns')
            primary_key['type'] = 'pk'
            keys += [primary_key]
        for fk in foreign_keys:
            fk['column_names'] = fk.pop('constrained_columns')
            fk['type'] = 'fk'
        keys += foreign_keys
        for idx in indexes:
            idx['type'] = 'index'
        keys += indexes

        for col in t:
            dtype = ""
            try:
                dtype = '{}'.format(col['type'])
            except:
                pass
            cols.append({
                'name': col['name'],
                'type': dtype.split('(')[0] if '(' in dtype else dtype,
                'longType': dtype,
                'keys': [
                    k for k in keys
                    if col['name'] in k.get('column_names')
                ],
            })
        tbl = {
            'name': table_name,
            'columns': cols,
            'selectStar': mydb.select_star(
                table_name, schema=schema, show_cols=True, indent=True),
            'primaryKey': primary_key,
            'foreignKeys': foreign_keys,
            'indexes': keys,
        }
        return Response(json.dumps(tbl), mimetype="application/json")

    @has_access
    @expose("/extra_table_metadata/<database_id>/<table_name>/<schema>/")
    @log_this
    def extra_table_metadata(self, database_id, table_name, schema):
        schema = None if schema in ('null', 'undefined') else schema
        mydb = db.session.query(models.Database).filter_by(id=database_id).one()
        payload = mydb.db_engine_spec.extra_table_metadata(
            mydb, table_name, schema)
        return Response(json.dumps(payload), mimetype="application/json")

    @has_access
    @expose("/select_star/<database_id>/<table_name>/")
    @log_this
    def select_star(self, database_id, table_name):
        mydb = db.session.query(
            models.Database).filter_by(id=database_id).first()
        quote = mydb.get_quoter()
        t = mydb.get_table(table_name)

        # Prevent exposing column fields to users that cannot access DB.
        if not self.datasource_access(t.perm):
            flash(self.get_datasource_access_error_msg(t.name), 'danger')
            return redirect("/tablemodelview/list/")

        fields = ", ".join(
            [quote(c.name) for c in t.columns] or "*")
        s = "SELECT\n{}\nFROM {}".format(fields, table_name)
        return self.render_template(
            "superset/ajah.html",
            content=s
        )

    @expose("/theme/")
    def theme(self):
        return self.render_template('superset/theme.html')

    @has_access_api
    @expose("/cached_key/<key>/")
    @log_this
    def cached_key(self, key):
        """Returns a key from the cache"""
        resp = cache.get(key)
        if resp:
            return resp
        return "nope"

    @has_access_api
    @expose("/results/<key>/")
    @log_this
    def results(self, key):
        """Serves a key off of the results backend"""
        blob = results_backend.get(key)
        if blob:
            json_payload = zlib.decompress(blob)
            obj = json.loads(json_payload)
            db_id = obj['query']['dbId']
            session = db.session()
            mydb = session.query(models.Database).filter_by(id=db_id).one()

            if not self.database_access(mydb):
                return self.json_error_response(
                    self.get_database_access_error_msg(mydb.database_name))

            return Response(
                json_payload,
                status=200,
                mimetype="application/json")
        else:
            return Response(
                json.dumps({
                    'error': (
                        "Data could not be retrived. You may want to "
                        "re-run the query."
                    )
                }),
                status=410,
                mimetype="application/json")

    @has_access
    @expose("/csv/<client_id>")
    @log_this
    def csv(self, client_id):
        """Download the query results as csv."""
        query = (
            db.session.query(models.Query)
            .filter_by(client_id=client_id)
            .one()
        )

        if not self.database_access(query.database):
            flash(self.get_database_access_error_msg(
                query.database.database_name))
            return redirect('/')

        sql = query.select_sql or query.sql
        df = query.database.get_df(sql, query.schema)
        # TODO(bkyryliuk): add compression=gzip for big files.
        csv = df.to_csv(index=False, encoding='utf-8')
        response = Response(csv, mimetype='text/csv')
        response.headers['Content-Disposition'] = (
            'attachment; filename={}.csv'.format(query.name))
        return response

    @has_access
    @expose("/fetch_datasource_metadata")
    @log_this
    def fetch_datasource_metadata(self):
        session = db.session
        datasource_type = request.args.get('datasource_type')
        datasource_class = SourceRegistry.sources[datasource_type]
        datasource = (
            session.query(datasource_class)
            .filter_by(id=request.args.get('datasource_id'))
            .first()
        )

        datasources = db.session.query(datasource_class).all()
        datasources = sorted(datasources, key=lambda ds: ds.full_name)

        # Check if datasource exists
        if not datasource:
            return self.json_error_response(self.DATASOURCE_MISSING_ERR)
        # Check permission for datasource
        if not self.datasource_access(datasource):
            return self.json_error_response(self.DATASOURCE_ACCESS_ERR)

        gb_cols = [(col, col) for col in datasource.groupby_column_names]
        all_cols = [(c, c) for c in datasource.column_names]
        order_by_choices = []
        for s in sorted(datasource.column_names):
            order_by_choices.append((json.dumps([s, True]), s + ' [asc]'))
            order_by_choices.append((json.dumps([s, False]), s + ' [desc]'))
        grains = datasource.database.grains()
        grain_choices = []
        if grains:
            grain_choices = [(grain.name, grain.name) for grain in grains]
        field_options = {
            'datasource': [(d.id, d.full_name) for d in datasources],
            'metrics': datasource.metrics_combo,
            'order_by_cols': order_by_choices,
            'metric':  datasource.metrics_combo,
            'secondary_metric': datasource.metrics_combo,
            'groupby': gb_cols,
            'columns': gb_cols,
            'all_columns': all_cols,
            'all_columns_x': all_cols,
            'all_columns_y': all_cols,
            'granularity_sqla': [(c, c) for c in datasource.dttm_cols],
            'time_grain_sqla': grain_choices,
            'timeseries_limit_metric': [('', '')] + datasource.metrics_combo,
            'series': gb_cols,
            'entity': gb_cols,
            'x': datasource.metrics_combo,
            'y': datasource.metrics_combo,
            'size': datasource.metrics_combo,
            'mapbox_label': all_cols,
            'point_radius': [(c, c) for c in (["Auto"] + datasource.column_names)],
        }

        return Response(
            json.dumps({'field_options': field_options}),
            mimetype="application/json"
        )

    @has_access
    @expose("/queries/<last_updated_ms>")
    @log_this
    def queries(self, last_updated_ms):
        """Get the updated queries."""
        if not g.user.get_id():
            return Response(
                json.dumps({'error': "Please login to access the queries."}),
                status=403,
                mimetype="application/json")

        # Unix time, milliseconds.
        last_updated_ms_int = int(float(last_updated_ms)) if last_updated_ms else 0

        # UTC date time, same that is stored in the DB.
        last_updated_dt = utils.EPOCH + timedelta(seconds=last_updated_ms_int / 1000)

        sql_queries = (
            db.session.query(models.Query)
            .filter(
                models.Query.user_id == g.user.get_id(),
                models.Query.changed_on >= last_updated_dt,
            )
            .all()
        )
        dict_queries = {q.client_id: q.to_dict() for q in sql_queries}
        return Response(
            json.dumps(dict_queries, default=utils.json_int_dttm_ser),
            status=200,
            mimetype="application/json")

    @has_access
    @expose("/search_queries")
    @log_this
    def search_queries(self):
        """Search for queries."""
        query = db.session.query(models.Query)
        search_user_id = request.args.get('user_id')
        database_id = request.args.get('database_id')
        search_text = request.args.get('search_text')
        status = request.args.get('status')
        # From and To time stamp should be Epoch timestamp in seconds
        from_time = request.args.get('from')
        to_time = request.args.get('to')

        if search_user_id:
            # Filter on db Id
            query = query.filter(models.Query.user_id == search_user_id)

        if database_id:
            # Filter on db Id
            query = query.filter(models.Query.database_id == database_id)

        if status:
            # Filter on status
            query = query.filter(models.Query.status == status)

        if search_text:
            # Filter on search text
            query = query \
                .filter(models.Query.sql.like('%{}%'.format(search_text)))

        if from_time:
            query = query.filter(models.Query.start_time > int(from_time))

        if to_time:
            query = query.filter(models.Query.start_time < int(to_time))

        query_limit = config.get('QUERY_SEARCH_LIMIT', 5000)
        sql_queries = query.limit(query_limit).all()
        dict_queries = {q.client_id: q.to_dict() for q in sql_queries}

        return Response(
            json.dumps(dict_queries, default=utils.json_int_dttm_ser),
            status=200,
            mimetype="application/json")

    @app.errorhandler(500)
    def show_traceback(self):
        error_msg = get_error_msg()
        return render_template(
            'superset/traceback.html',
            error_msg=error_msg,
            title=ascii_art.stacktrace,
            art=ascii_art.error), 500

    @expose("/welcome")
    def welcome(self):
        """Personalized welcome page"""
        return self.render_template('superset/welcome.html', utils=utils)
