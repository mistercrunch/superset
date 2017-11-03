import os

ROW_LIMIT = 5000
SUPERSET_WORKERS = 4

# Your App secret key
SECRET_KEY = os.getenv("CREDENTIALS_SUPERSET_SECRET_KEY") or "NOSECRET!"

# The SQLAlchemy connection string to your database backend
# This connection defines the path to the database that stores your
# superset metadata (slices, connections, tables, dashboards, ...).
# Note that the connection information to connect to the datasources
# you want to explore are managed directly in the web UI
if os.getenv("APPLICATION_ENV") == 'production':
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
