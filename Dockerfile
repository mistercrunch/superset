FROM lyft/opsbase:3af1919639648fe62da60444038ea5c8cb446ab3
ARG IAM_ROLE
COPY . /code/superset-private
RUN cd /code/superset-private && make init_submodule
COPY ops /code/superset-private/ops
COPY requirements.* piptools_requirements.* /code/superset-private/
COPY manifest.yaml /code/superset-private/manifest.yaml
RUN SERVICE_NAME=superset CODE_ROOT=/code/superset-private /code/ops/base/build_service.sh
