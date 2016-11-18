from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

from datetime import datetime
import json
import logging
import traceback

import functools

from flask import g, Response
from flask_appbuilder import BaseView
from flask_babel import gettext as __

from superset import appbuilder, db, models, utils, app

config = app.config
log_this = models.Log.log_this
can_access = utils.can_access
QueryStatus = models.QueryStatus


def generate_download_headers(extension):
    filename = datetime.now().strftime("%Y%m%d_%H%M%S")
    content_disp = "attachment; filename={}.{}".format(filename, extension)
    headers = {
        "Content-Disposition": content_disp,
    }
    return headers


def get_database_access_error_msg(database_name):
    return __("This view requires the database %(name)s or "
              "`all_datasource_access` permission", name=database_name)


def get_datasource_exist_error_mgs(full_name):
    return __("Datasource %(name)s already exists", name=full_name)


def get_error_msg():
    if config.get("SHOW_STACKTRACE"):
        error_msg = traceback.format_exc()
    else:
        error_msg = "FATAL ERROR \n"
        error_msg += (
            "Stacktrace is hidden. Change the SHOW_STACKTRACE "
            "configuration setting to enable it")
    return error_msg


def api(f):
    """
    A decorator to label an endpoint as an API. Catches uncaught exceptions and
    return the response in the JSON format
    """
    def wraps(self, *args, **kwargs):
        try:
            return f(self, *args, **kwargs)
        except Exception as e:
            logging.exception(e)
            resp = Response(
                json.dumps({
                    'message': get_error_msg()
                }),
                status=500,
                mimetype="application/json")
            return resp

    return functools.update_wrapper(wraps, f)


def check_ownership(obj, raise_if_false=True):
    """Meant to be used in `pre_update` hooks on models to enforce ownership

    Admin have all access, and other users need to be referenced on either
    the created_by field that comes with the ``AuditMixin``, or in a field
    named ``owners`` which is expected to be a one-to-many with the User
    model. It is meant to be used in the ModelView's pre_update hook in
    which raising will abort the update.
    """
    if not obj:
        return False

    security_exception = utils.SupersetSecurityException(
              "You don't have the rights to alter [{}]".format(obj))

    if g.user.is_anonymous():
        if raise_if_false:
            raise security_exception
        return False
    roles = (r.name for r in get_user_roles())
    if 'Admin' in roles:
        return True
    session = db.create_scoped_session()
    orig_obj = session.query(obj.__class__).filter_by(id=obj.id).first()
    owner_names = (user.username for user in orig_obj.owners)
    if (
            hasattr(orig_obj, 'created_by') and
            orig_obj.created_by and
            orig_obj.created_by.username == g.user.username):
        return True
    if (
            hasattr(orig_obj, 'owners') and
            g.user and
            hasattr(g.user, 'username') and
            g.user.username in owner_names):
        return True
    if raise_if_false:
        raise security_exception
    else:
        return False


def get_user_roles():
    if g.user.is_anonymous():
        return [appbuilder.sm.find_role('Public')]
    return g.user.roles


class BaseSupersetView(BaseView):

    """Base view class for Superset"""

    ALL_DATASOURCE_ACCESS_ERR = __(
        "This endpoint requires the `all_datasource_access` permission")
    DATASOURCE_MISSING_ERR = __("The datasource seems to have been deleted")
    ACCESS_REQUEST_MISSING_ERR = __(
        "The access requests seem to have been deleted")
    USER_MISSING_ERR = __("The user seems to have been deleted")
    DATASOURCE_ACCESS_ERR = __("You don't have access to this datasource")

    def get_datasource_access_error_msg(self, datasource_name):
        return __(
            "This endpoint requires the datasource %(name)s, database or "
            "`all_datasource_access` permission", name=datasource_name)

    def json_error_response(self, msg, status=None):
        data = {'error': msg}
        status = status if status else 500

        return Response(
            json.dumps(data), status=status, mimetype="application/json")

    def can_access(self, permission_name, view_name):
        return utils.can_access(appbuilder.sm, permission_name, view_name)

    def all_datasource_access(self):
        return self.can_access(
            "all_datasource_access", "all_datasource_access")

    def database_access(self, database):
        return (
            self.can_access("all_database_access", "all_database_access") or
            self.can_access("database_access", database.perm)
        )

    def datasource_access(self, datasource):
        return (
            self.database_access(datasource.database) or
            self.can_access("all_database_access", "all_database_access") or
            self.can_access("datasource_access", datasource.perm)
        )

    def check_ownership(self, obj, raise_if_false=True):
        return check_ownership(obj, raise_if_false)

    def generate_download_headers(self, extension):
        return generate_download_headers(extension)
