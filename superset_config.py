"""Config file for Superset"""
import os
from flask_appbuilder.security.manager import AUTH_OAUTH
from flask_appbuilder.security.sqla.manager import SecurityManager

ROW_LIMIT = 5000
SUPERSET_WORKERS = 4

# Your App secret key
SECRET_KEY = os.getenv("CREDENTIALS_SUPERSET_SECRET_KEY") or "NOSECRET!"

# The SQLAlchemy connection string to your database backend
# This connection defines the path to the database that stores your
# superset metadata (slices, connections, tables, dashboards, ...).
# Note that the connection information to connect to the datasources
# you want to explore are managed directly in the web UI
if os.getenv("APPLICATION_ENV") in ('production', 'staging'):
    SQLALCHEMY_DATABASE_URI = 'mysql://{user}:{password}@{host}:5432/{database}'.format(
        user=os.getenv("CREDENTIALS_SUPERSET_USERNAME"),
        password=os.getenv("CREDENTIALS_SUPERSET_PASSWORD"),
        host=os.getenv("CREDENTIALS_INCENTIVES_HOST"),
        database=os.getenv("CREDENTIALS_SUPERSET_DATABASE"))

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
        'consumer_key': os.getenv('CREDENTIALS_SUPERSET_OAUTH_CONSUMER_KEY'),
        'consumer_secret': os.getenv("CREDENTIALS_SUPERSET_OAUTH_SECRET"),
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
