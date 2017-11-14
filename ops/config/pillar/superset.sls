{% if grains.service_instance == 'development' %}
  {% set conf = {
    'web_workers': 2,
    'celery_workers': 2,
  }%}
{% else %}
  {% set conf = {
    'web_workers': 8,
    'celery_workers': 32,
  }%}
{% endif %}

python_executable: python3.6

workers:
  web: >
    /usr/local/bin/service_venv gunicorn
    superset:app
    --workers={{ conf.web_workers }}
    --forwarded-allow-ips="*"
    -k gevent
    --timeout 120
    --worker-connections=1000
    -c /etc/gunicorn/gunicorn.conf
  celery: /usr/local/bin/service_venv superset worker -w {{ conf.celery_workers  }}

envoy_with_gunicorn: True

enable_envoy_custom_config: True

envoy_custom_config:
  redis:
    supersetmultiredis:
      port: 6380
      op_timeout_ms: 400

frozen_venv: True
