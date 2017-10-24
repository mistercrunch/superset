base:
  'service_instance:development':
    - match: grain
    - development
  'service_instance:staging':
    - match: grain
    - {{ grains.service_name }}
  'service_instance:production':
    - match: grain
    - {{ grains.service_name }}
