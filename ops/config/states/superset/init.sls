include:
  - base
  - .dependencies
  - lyft-python

Ensure manage.py script is available globally:
  file.managed:
    - name: /usr/local/bin/manage
    - makedirs: True
    - mode: 755
    - contents: |
        #!/bin/bash
        cd /srv/service/current
        service_venv python manage.py "$@"

Install superset submodule:
 cmd.run:
   - name: sudo /usr/local/bin/service_venv pip install -e upstream/
   - cwd: /srv/service/current

Ensure database is upgraded:
 cmd.run:
   - name: /usr/local/bin/service_venv superset db upgrade
   - cwd: /srv/service/current

Ensure basic roles and permissions are defined:
 cmd.run:
   - name: /usr/local/bin/service_venv superset init
   - cwd: /srv/service/current

{% if grains.service_instance == 'development' %}

Ensure load mock admin user:
  file.managed:
    - name: /etc/starter/post/9-ensure-repos
    - makedirs: True
    - mode: 755
    - contents: |
        #!/bin/bash
        /usr/local/bin/service_venv service_venv fabmanager create-admin --app superset --username admin --firstname Superset --lastname Lyft --password password --email superset@lyft.com

Ensure superset examples are loaded:
 cmd.run:
   - name: /usr/local/bin/service_venv superset load_examples
   - cwd: /srv/service/current

{% endif %}
