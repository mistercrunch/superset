FROM lyft/opsbase:caeebb8308bdb84831261a75530a010fbee2478d
ARG IAM_ROLE
COPY . /code/superset-private
RUN cd /code/superset-private && git submodule update --init --recursive
COPY ops /code/superset-private/ops
COPY requirements.* piptools_requirements.* /code/superset-private/
COPY manifest.yaml /code/superset-private/manifest.yaml
RUN SERVICE_NAME=superset CODE_ROOT=/code/superset-private /code/ops/base/build_service.sh
