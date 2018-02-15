FROM lyft/opsbase:cff17fab1b151de471f6af8a860a0b1a2ffbabe5
ARG IAM_ROLE
COPY . /code/superset-private
RUN cd /code/superset-private && make init_submodule
COPY ops /code/superset-private/ops
COPY requirements.* piptools_requirements.* /code/superset-private/
COPY manifest.yaml /code/superset-private/manifest.yaml
RUN SERVICE_NAME=superset CODE_ROOT=/code/superset-private /code/ops/base/build_service.sh
