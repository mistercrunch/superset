from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

from flask import request, redirect
from flask_babel import gettext as __

from werkzeug.routing import BaseConverter

from superset import appbuilder, models, app
from superset.views.core import CoreView
from superset.views.redirects import R
from superset.views.sql_lab import SqlLab

config = app.config
log_this = models.Log.log_this


@app.route('/health')
def health():
    return "OK"


@app.route('/ping')
def ping():
    return "OK"

# Registering views classes
appbuilder.add_view_no_menu(CoreView)
appbuilder.add_view_no_menu(R)
appbuilder.add_view_no_menu(SqlLab)

if config.get('DRUID_IS_ACTIVE'):
    from superset.views.druid import DruidView
    appbuilder.add_link(
        "Refresh Druid Metadata",
        label=__("Refresh Druid Metadata"),
        href='/superset/refresh_datasources/',
        category='Sources',
        category_label=__("Sources"),
        category_icon='fa-database',
        icon="fa-cog")
    appbuilder.add_view_no_menu(DruidView)


@app.after_request
def apply_caching(response):
    """Applies the configuration's http headers to all responses"""
    for k, v in config.get('HTTP_HEADERS').items():
        response.headers[k] = v
    return response


# ---------------------------------------------------------------------
# Redirecting URL from previous names
class RegexConverter(BaseConverter):
    def __init__(self, url_map, *items):
        super(RegexConverter, self).__init__(url_map)
        self.regex = items[0]
app.url_map.converters['regex'] = RegexConverter


@app.route('/<regex("panoramix\/.*"):url>')
def panoramix(url):  # noqa
    return redirect(request.full_path.replace('panoramix', 'superset'))
# ---------------------------------------------------------------------
