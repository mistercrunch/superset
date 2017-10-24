export ORCA_DISABLED=true
# we use the pipefail option below, which is bash specific.
SHELL := /bin/bash

ifneq ("$(wildcard /srv/repos/ops/base.mk)","")
include /srv/repos/ops/base.mk
else ifneq ("$(wildcard ../ops/base.mk)","")
include ../ops/base.mk
else
$(error Cannot find base.mk)
endif

BANDIT_ENFORCED=true

SERVICE_NAME=superset

.PHONY: releases # show all releases
releases:
	-aws s3 ls s3://lyft-infra/build/$(SERVICE_NAME)/
	-aws s3 cp s3://lyft-infra/build/$(SERVICE_NAME)/currentRevision.staging . >/dev/null 2>&1
	-aws s3 cp s3://lyft-infra/build/$(SERVICE_NAME)/currentRevision.production . >/dev/null 2>&1
	@echo "CURRENT PRODUCTION REVISION:" `cat currentRevision.production`
	@echo "CURRENT STAGING REVISION:" `cat currentRevision.staging`
	-rm -f currentRevision.staging currentRevision.production

.PHONY: test # run all test suites
test: test_unit test_integration

.PHONY: test_unit # run unit tests
test_unit:
	mkdir -p build
	set -o pipefail; service_venv flake8 | sed "s#^\./##" > build/flake8.txt || (cat build/flake8.txt && exit 1)
	set -o pipefail; service_venv pylint --py3k app | sed "s#^\./##" > build/pylint.txt || (cat build/pylint.txt && exit 1)
	service_venv py.test --junitxml=build/unit.xml --cov=app --cov-report=xml --no-cov-on-fail tests/unit

.PHONY: coverage # build HTML coverage report
coverage:
	mkdir -p build/coverage
	service_venv py.test --cov=app --cov-report=html tests/unit

.PHONY: test_integration # run integration tests
test_integration:
	mkdir -p build
	service_venv py.test --junit-xml=build/int.xml tests/integration

.PHONY: deploy # deploy the current SHA
deploy:
	$(PULLDEPLOY)/deploy.py -b . -p $(SERVICE_NAME)

.PHONY: release_staging # release current SHA to staging
release_staging:
	$(PULLDEPLOY)/release.py -p $(SERVICE_NAME) staging
	$(CHECK) $(SERVICE_NAME) $(SERVICE_NAME) staging

.PHONY: release_canary # release current SHA to canary
release_canary:
	$(PULLDEPLOY)/release.py --canary -p $(SERVICE_NAME) production
	$(CHECK) $(SERVICE_NAME) $(SERVICE_NAME) production --canary

.PHONY: release_production # release current SHA to production
release_production:
	$(PULLDEPLOY)/release.py -p $(SERVICE_NAME) production
	$(CHECK) $(SERVICE_NAME) $(SERVICE_NAME) production

.PHONY: test_highstate # test config management highstate syntax
test_highstate:
	sudo salt-call state.show_highstate
