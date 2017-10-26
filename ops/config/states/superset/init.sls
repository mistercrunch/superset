include:
  - base
  - .dependencies
  - lyft-python
  - .mysql

Ensure manage.py script is available globally:
  file.managed:
    - name: /usr/local/bin/manage
    - makedirs: True
    - mode: 755
    - contents: |
        #!/bin/bash
        cd /srv/service/current
        service_venv python manage.py "$@"

Ensure database is upgraded:
 cmd.run:
   - name: /usr/local/bin/service_venv superset db upgrade
   - cwd: /srv/service/current

Ensure basic roles and permissions are defined:
 cmd.run:
   - name: /usr/local/bin/service_venv superset init
   - cwd: /srv/service/current
