# Superset

Internal visualization tool for interactively exploring lyft data using [apache/incubator-superset](https://github.com/apache/incubator-superset)

## Running

To start the service, run `control start -g superset.dev` While in development, the service loads examples and creates an admin with credentials username and password equal to `admin` and `password`, respectively.

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
