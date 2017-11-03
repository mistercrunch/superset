{% if grains.service_instance == 'development' %}
{% set workers = 1 %}
{% set extra_args = '--reload' %}
{% else %}
{% set workers = grains.num_cpus %}
{% set extra_args = '' %}
{% endif %}

python_executable: python3.6

workers:
  web: /usr/local/bin/service_venv gunicorn superset:app --workers={{ workers }} --forwarded-allow-ips="*" -k gevent --timeout 120 --worker-connections=1000 -c /etc/gunicorn/gunicorn.conf

envoy_with_gunicorn: True

enable_envoy_custom_config: True

frozen_venv: True

# Uncomment this section to override local_service defaults and/or to add hosts to communicate with
# See https://github.com/lyft/envoy-private/blob/master/docs/config.md for more information.
# envoy_custom_config:
#   local_service:
#       circuit_breakers:
#           default:
#               max_connections: 100
#       hosts_url: 'tcp://127.0.0.1:8080'
#       ingress_ports: [9211, 80]
#   internal_hosts:
#       host_name1:
#   external_hosts:
#       host_name1:
#   mongos:
#       host_name1:
