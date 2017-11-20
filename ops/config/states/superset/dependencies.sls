# To include, uncomment '- .dependencies' from init.sls
#
# This file can include any dependencies that are needed before lyft-python is
# included.
#
# For example:
#
#    Ensure pip dependencies are installed:
#      pkg.installed:
#        - pkgs:
#          - python-paver

Ensure pip dependencies for superset are installed:
  pkg.installed:
    - pkgs:
      - build-essential
      - libffi-dev
      - libsasl2-dev
      - libldap2-dev
      - runit
      - libmysqlclient-dev
      - libcurl4-openssl-dev

# Start python3.6 dependencies

Ensure openssl is installed:
  pkg.installed:
    - name: openssl
    - refresh: True

Ensure libssl-dev is installed:
  pkg.installed:
    - name: libssl-dev

Ensure Python 3.6 is installed:
  pkg.installed:
    - name: python3.6

Ensure virtualenv is up to date:
  pip.installed:
    - name: virtualenv >= 15.1.0, <= 16.0.0

# End python3.6 dependencies

