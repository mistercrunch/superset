import os
from flask import Blueprint
from caravel.plugin_manager import BaseCaravelPlugin

bp = Blueprint('hellow_world_plugin', __name__)


class HelloWorldViz(BaseCaravelPlugin.BaseViz):
    viz_type = "hello"
    verbose_name = "Hello World"
    fieldsets = ({
        'label': None,
        'fields': []
    },)
    is_timeseries = False

    @property
    def javascript(self):
        return os.path.abspath(os.path.dirname(__file__)) + '/hello.js'


class HelloWorldPlugin(BaseCaravelPlugin):
    blueprint = bp
    viz_class = HelloWorldViz
