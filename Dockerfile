FROM lyft/opsbase:43b3c026d5de6bff9a143654b063430359528cd5
ARG IAM_ROLE
COPY ops /code/superset/ops
COPY requirements.* piptools_requirements.* /code/superset/
COPY manifest.yaml /code/superset/manifest.yaml
RUN SERVICE_NAME=superset CODE_ROOT=/code/superset /code/ops/base/build_service.sh
COPY . /code/superset
