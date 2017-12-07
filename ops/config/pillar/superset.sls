{% if grains.service_instance == 'development' %}
  {% set conf = {
    'web_workers': 2,
    'celery_workers': 2,
    'timeout_sec': 120,
  }%}
{% else %}
  {% set conf = {
    'web_workers': grains.num_cpus,
    'celery_workers': grains.num_cpus * 4,
    'timeout_sec': 120,
  } %}
{% endif %}

python_executable: python3.6

workers:
  web: >
    gunicorn
    superset:app
    --workers={{ conf.web_workers }}
    --keep-alive {{ conf.timeout_sec }}
    --forwarded-allow-ips="*"
    -k gevent
    --timeout {{ conf.timeout_sec }}
    --worker-connections=1000
    -c /etc/gunicorn/gunicorn.conf
  celery: superset worker -w {{ conf.celery_workers  }}

envoy_with_gunicorn: True

enable_envoy_custom_config: True

envoy_custom_config:
  redis:
    supersetmultiredis:
      port: 6380
      op_timeout_ms: 400

frozen_venv: True
