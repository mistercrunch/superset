Ensure mysqldb package is installed:
  pkg.installed:
    - pkgs:
      - python-mysqldb

libmysqlclient-dev:
  pkg.installed:
    - pkgs:
      - libmysqlclient-dev

debconf-package:
  pkg.installed:
    - pkgs:
      - debconf-utils

mysql_setup:
  debconf.set:
    - name: mysql-server
    - data:
        mysql-server/root_password': {'type': 'string', 'value': 'masterpassword'}
        mysql-server/root_password_again': {'type': 'string', 'value': 'masterpassword'}
    - require:
      - pkg: debconf-package

mysql-server:
  pkg.installed:
    - pkgs:
      - mysql-server
    - require:
      - debconf: mysql_setup

start mysql server:
  cmd.run:
    - name: sudo service mysql restart

Ensure mysqlclient is installed:
  pip.installed:
    - name: mysqlclient
    - exists_action: i # ignore

Ensure mysqldb is installed:
  pip.installed:
    - name: MySQL-python==1.2.5
    - exists_action: i # ignore
