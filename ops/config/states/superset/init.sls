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
