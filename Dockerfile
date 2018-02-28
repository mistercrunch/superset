FROM lyft/opsbase:1bd5934c75f98d3723e46318ab69159d3c8c290e
ARG IAM_ROLE
COPY . /code/superset-private
RUN cd /code/superset-private && make init_submodule
COPY ops /code/superset-private/ops
COPY requirements.* piptools_requirements.* /code/superset-private/
COPY manifest.yaml /code/superset-private/manifest.yaml
RUN SERVICE_NAME=superset CODE_ROOT=/code/superset-private /code/ops/base/build_service.sh
