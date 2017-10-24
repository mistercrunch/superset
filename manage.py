#!/usr/bin/env python

from __future__ import absolute_import
import gevent.monkey

gevent.monkey.patch_all()

from flask.ext.script import Manager  # noqa:E402

from app import app  # noqa:E402
from app.scripts.hello import Hello  # noqa:E402

manager = Manager(app)

manager.add_command("hello", Hello)

if __name__ == "__main__":
    manager.run()
