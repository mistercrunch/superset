environment:
  common:
    LC_ALL: C.UTF-8
    LANG: C.UTF-8
  development:
    PORT: 80
    APPLICATION_MONGODB_DBNAME: {{ grains.service_group }}
    APPLICATION_MONGODB_HOST: local-development-iad-onebox.lyft.net
    APPLICATION_MONGODB_URI: mongodb://local-development-iad-onebox.lyft.net:27017/{{ grains.service_group }}
    APPLICATION_ENV: {{ grains.service_instance }}
    USE_AUTH: false
    DEBUG: true
    REDIS_URL: redis://local-development-iad-onebox.lyft.net:6379
    REDIS_KEY_PREFIX: '{{ grains.service_name }}-'
  staging:
    PORT: 80
    APPLICATION_ENV: {{ grains.service_instance }}
  production:
    PORT: 80
    APPLICATION_ENV: {{ grains.service_instance }}
