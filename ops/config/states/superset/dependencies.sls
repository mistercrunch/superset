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


# Start python3.6 dependencies

Ensure openssl is installed:
  pkg.installed:
    - name: openssl
    - version: 1.0.1f-1ubuntu2.22
    - refresh: True

Ensure libssl-dev is installed:
  pkg.installed:
    - name: libssl-dev
    - version: 1.0.2h-1+deb.sury.org~trusty+1

Ensure Python 3.6 is installed:
  pkg.installed:
    - name: python3.6

Ensure virtualenv is up to date:
  pip.installed:
    - name: virtualenv >= 15.1.0, <= 16.0.0

# End python3.6 dependencies
