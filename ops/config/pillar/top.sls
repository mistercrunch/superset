base:
  # All environments.
  '*':
    - base
    - env
    - {{ grains.service_name }}
  'service_group:{{ grains["service_group"] }}':
    - match: grain
    - {{ grains['service_group'] }}
    # The top file doesn't have a set order, and we need to ensure pillars are
    # overridden properly.
    - order: 10
    - ignore_missing: True
