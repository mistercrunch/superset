# Superset

Internal visualization tool for interactively exploring lyft data using [apache/incubator-superset](https://github.com/apache/incubator-superset)

## Running

To start the service, run `control start -g superset.dev` While in development, the service loads examples and creates an admin with credentials username and password equal to `admin`.

## Intialization

Create a new admin user
```bash
make create_admin 
```

Load examples
```bash
make init_examples
```

## Requirements
* `requirements.txt` for Python dependencies: remember to update `lyft-stdlib` to the [latest version](https://github.com/lyft/python-lyft-stdlib/releases)

## Configuration
Configuration is handled via environment variables. See `app.settings` and
`ops/config/pillar/env.sls`.

## Does your service require envoy?

If this service is intended to receive calls from other services, it needs to be added into our
internal routing configurations. You should familiarize yourself with the envoy documentation
found [here](https://github.com/lyft/envoy-private/blob/master/docs/getting_started.md)

## UI

To include UI in your project, merge in the
[feature-include-ui](https://github.com/lyft/python-service-template/tree/feature-include-ui) branch


### Develop and test superset in Devbox

See [devbox](https://github.com/lyft/devbox).


### Integrate superset in our Jenkins system

Commit and push the service addition to the primary list in the **ops** directory. Create a PR.

```bash
cd ops.git/
git commit -a -m 'Add superset service to the list'
git push origin add_superset_service
```

Get your PR reviewed and :rocket:. See the #base-train Slack channel for deploy schedule.

After a few minutes all the service Jenkins jobs for continuous integration as well as the service deployment pipeline are available in Jenkins.

### Publish superset git repository to Github

Create a repository in github named superset.

Push the local repository to github:

```bash
cd superset/
git push --set-upstream --force origin master
```

Add the Dev team to the [list of repository collaborators](https://github.com/lyft/superset/settings/collaboration).

### Deploy to staging and production environments

NB: the deploy pipeline is **not** created for hackathon projects. New services built as Hackathon projects should **not** be created with a staging and production environments. Instead they should be run in onebox environments. See below for instructions on deploying to onebox.

Kick off a build of the onebox image by going to [superset-build-image-onebox jenkins job](https://jenkins.lyft.net/job/superset-build-image-onebox) and clicking "Build now".  Once the onebox image is built you can run [superset deployment pipeline](https://jenkins.lyft.net/job/superset-deploy).

### Deploy to a onebox

Kick off a build of the onebox image by going to [superset-build-image-onebox jenkins job](https://jenkins.lyft.net/job/superset-build-image-onebox) and clicking "Build now".
Assign a onebox through the [onebox-assign job](https://jenkins-onebox.lyft.net/job/onebox-assign/build?delay=0sec).  [Setup the onebox](https://jenkins-onebox.lyft.net/job/onebox-control/build?delay=0sec) with the superset profile.

The superset profile will start by default the local and superset containers. If other services/containers are needed add them to the [jenkins profiles file](https://github.com/lyft/ops/blob/master/base/ops/config/pillar/profiles.sls) and [deploy with the base pipeline](https://jenkins.lyft.net/view/base-deploy).

## Reference

### Resolving dependencies and libraries

There's no need to run pip locally.  Salt will handle all of these for you.

If changes are made to requirements.txt it may be necessary to do a full salt run:

```bash
cd devbox
control enter superset
salt-call state.highstate
```

# Tests

## Unit

```bash
control enter superset.legacy

# Run flake8 tests and unit tests
make test_unit

# Run a specific unit test file
service_venv nosetests tests/unit/path_to_test/test_file.py
```

## Writing Python Unit Tests for superset
Python unit tests are written with [py.test](http://pytest.org/latest/), and generally
use module-level functions that follow certain [naming conventions](https://pytest.org/latest/goodpractices.html).

Tests can be grouped by module, and have setup and tear-down behaviors per test, or per module. If you feel there is a strong reason to use classes, a class can simply inherit from `object`, as long as the name adheres to the aforementioned naming conventions.

**For new services going forward, you are not allowed to use `unittest` anywhere.**
[Assertions should be made](https://pytest.org/latest/assert.html#assert-with-the-assert-statement)
with the built-in `assert` statement. Py.test overloads this to do introspection, and
provides very detailed test output, which you don't get when you use `unittest` asserts.

### For example:

```python
# NO
self.assertTrue(my_var)

# YES
assert my_var is True
```

For more details, see the [py.test examples page](https://pytest.org/latest/example/index.html).

### Fixtures
Fixtures are pre-configured objects and functions that make writing tests easier and less error prone.

Py.test uses function argument injection to provide fixtures to tests. It's very
powerful, and a huge time-saver, but many new developers to py.test find it
a bit magical. Make sure you review the [py.test fixture docs](https://pytest.org/latest/fixture.html)
if you want to use them for your service.

#### Example:
```python
@pytest.fixture
def client():
    "Returns a Flask client for the app."
    return app.test_client()

def test_my_cool_feature(client):
    result = client.get('/my/path')
    assert result.status_code == 200
```

### Mocks and Patching
* **mocker**: A [handy library](https://github.com/pytest-dev/pytest-mock/) that makes
    the `mock` package easier to use with `py.test`. Function decorators are sometimes
    tricky to use with func arg injection, and nesting context managers can get
    ugly. Mocker makes it a little neater.

    ```python
    def my_test_func(mocker):
        mocker.patch('some.gnarly.lib')
        # proceed with mocked out dependency
    ```

### Code coverage
The test\_unit target generates a code coverage report. The minimum coverage
level is set in **setup.cfg** with the **fail_under** option (a 95% code
coverage is a good target).

An html code coverage report can be generated using the coverage target:
```bash
make coverage
```

The html report is available under **build/coverage**.

Additionally, your line coverage percentage will be reported to grafana during the superset-test-unit jenkins job, which is run when a PR has been submitted to master. The metric will be reported as `cluster.git.superset.coverage.line`. More information here: http://go.lyft.com/coverage-stats.

## Integration
```bash
# Run all integration tests
make test_int

# Run a specific integration test file
service_venv nosetests tests/integration/path_to_test/test_file.py
```

## Scripts
```bash
control enter superset.legacy
service_venv python manage.py hello --name=superset
```
