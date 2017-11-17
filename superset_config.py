"""Config file for Superset"""
import os

from flask_appbuilder.security.manager import AUTH_OAUTH
from flask_appbuilder.security.sqla.manager import SecurityManager
from werkzeug.contrib.cache import FileSystemCache

from superset.stats_logger import StatsdStatsLogger


ENV = os.getenv("APPLICATION_ENV")

ROW_LIMIT = 5000
SUPERSET_WORKERS = 4

SECRET_KEY = os.getenv("CREDENTIALS_SUPERSET_SECRET_KEY") or 'NOSECRET!'

if ENV in ('production', 'staging'):
    SQLALCHEMY_DATABASE_URI = 'mysql://{user}:{password}@{host}:5432/{database}'.format(
        user=os.getenv("CREDENTIALS_SUPERSET_USERNAME"),
        password=os.getenv("CREDENTIALS_SUPERSET_PASSWORD"),
        host=os.getenv("CREDENTIALS_INCENTIVES_HOST"),
        database=os.getenv("CREDENTIALS_SUPERSET_DATABASE"))
    REDIS_URL = 'redis://localhost:6380/0'
    CELERY_BROKER_URL = 'sqs://@'
    CELERY_BROKER_TRANSPORT_OPTIONS = {
        'queue_name_prefix': 'superset-{}-'.format(ENV),
    }
    RESULTS_BACKEND = FileSystemCache('/tmp')
else:
    REDIS_URL = 'redis://redis-server.devbox.lyft.net:6379/0'
    CELERY_BROKER_URL = 'sqla+sqlite:////tmp/celery_results.sqlite'
    CELERY_BROKER_TRANSPORT_OPTIONS = {}
    RESULTS_BACKEND = FileSystemCache('/tmp')

STATS_LOGGER = StatsdStatsLogger(
    host='localhost', port=8125, prefix='superset_' + ENV)

# Flask-WTF flag for CSRF
CSRF_ENABLED = True

# Set this API key to enable Mapbox visualizations
MAPBOX_API_KEY = os.getenv("CREDENTIALS_MAPBOX_API_KEY")
ENABLE_PROXY_FIX = True

AUTH_TYPE = AUTH_OAUTH
AUTH_USER_REGISTRATION = True
AUTH_USER_REGISTRATION_ROLE = "Alpha"

OAUTH_PROVIDERS = [{
    'name':'google', 'icon':'fa-google', 'token_key':'access_token',
    'remote_app': {
        'consumer_key': os.getenv('CREDENTIALS_SUPERSET_OAUTH_CONSUMER_KEY', 'foobar'),
        'consumer_secret': os.getenv("CREDENTIALS_SUPERSET_OAUTH_SECRET", 'foobar'),
        'base_url':'https://www.googleapis.com/oauth2/v2/',
        'request_token_params': {
            'scope': 'email profile',
        },
        'request_token_url':None,
        'access_token_url':'https://accounts.google.com/o/oauth2/token',
        'authorize_url':'https://accounts.google.com/o/oauth2/auth'
    }
}]


class LyftSecurityManager(SecurityManager):
    """Lyft-specific FAB security manager"""

    def get_oauth_user_info(self, provider, resp=None):
        """Overriding this method to force a @lyft.com email"""
        user = self.appbuilder.sm.oauth_remotes[provider].get('userinfo')
        email = user.data.get('email', '')

        assert provider == 'google'
        assert email.endswith('lyft.com')

        return {
            'username': "google_" + user.data.get('id', ''),
            'first_name': user.data.get('given_name', ''),
            'last_name': user.data.get('family_name', ''),
            'email': user.data.get('email', '')
        }


CUSTOM_SECURITY_MANAGER = LyftSecurityManager

SUPERSET_WEBSERVER_TIMEOUT = 120

# Caching configuration
CACHE_CONFIG = {
    'CACHE_TYPE': 'redis',
    'CACHE_DEFAULT_TIMEOUT': 60 * 60 * 24,
    'CACHE_KEY_PREFIX': 'superset_',
    'CACHE_REDIS_URL': REDIS_URL,
}

"""
## SQS related links & references

### Mock server source reference.
It appears the mock doesn't support self.sqs.list_queues
making it unusable with Celery
https://github.com/lyft/containers/tree/master/sqs

### Jobscheduler uses SQS, here's a link to how it's configured
https://github.com/lyft/jobscheduler/blob/b3291e298693cc8fcf9ca7562ef11bcfe866d377/jobscheduler/settings.py#L43

### Celery docs about SQS
http://docs.celeryproject.org/en/latest/getting-started/brokers/sqs.html

### Kombu source for SQS details more option than documented in the Celery docs
https://github.com/celery/kombu/blob/master/kombu/transport/SQS.py
"""


class CeleryConfig(object):
    BROKER_URL = CELERY_BROKER_URL
    CELERY_IMPORTS = ('superset.sql_lab', )
    CELERY_ANNOTATIONS = {'tasks.add': {'rate_limit': '10/s'}}
    CELERY_IMPORTS = ('superset.sql_lab', )
    CELERY_ANNOTATIONS = {'tasks.add': {'rate_limit': '10/s'}}
    CELERYD_LOG_LEVEL = 'DEBUG'
    CELERYD_PREFETCH_MULTIPLIER = 1
    CELERY_ACCEPT_CONTENT = ['json']
    CELERY_ACKS_LATE = True
    BROKER_TRANSPORT_OPTIONS = CELERY_BROKER_TRANSPORT_OPTIONS

CELERY_CONFIG = CeleryConfig
