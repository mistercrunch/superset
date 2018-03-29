FROM lyft/opsbase:aceb94d6b291f145e9d613346267a00ef5bc567f
ARG IAM_ROLE
COPY . /code/superset-private
RUN cd /code/superset-private && make init_submodule
COPY ops /code/superset-private/ops
COPY requirements.* piptools_requirements.* /code/superset-private/
COPY manifest.yaml /code/superset-private/manifest.yaml
RUN SERVICE_NAME=superset CODE_ROOT=/code/superset-private /code/ops/base/build_service.sh
