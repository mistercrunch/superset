# Superset

Internal visualization tool for interactively exploring lyft data using [apache/incubator-superset](https://github.com/apache/incubator-superset).

### Running in devbox

To start the service, run the following command
```bash
$ control start -g superset.dev
```

While in development, the service loads examples and creates an admin with credentials username and password equal to `admin` and `password`, respectively.

### Deploy to staging and production environments

NB: the deploy pipeline is **not** created for hackathon projects. New services built as Hackathon projects should **not** be created with a staging and production environments. Instead they should be run in onebox environments. See below for instructions on deploying to onebox.

Kick off a build of the onebox image by going to [superset-build-image-onebox jenkins job](https://jenkins.lyft.net/job/superset-build-image-onebox) and clicking "Build now".  Once the onebox image is built you can run [superset deployment pipeline](https://jenkins.lyft.net/job/superset-deploy).

### Deploy to a onebox

Kick off a build of the onebox image by going to [superset-build-image-onebox jenkins job](https://jenkins.lyft.net/job/superset-build-image-onebox) and clicking "Build now".
Assign a onebox through the [onebox-assign job](https://jenkins-onebox.lyft.net/job/onebox-assign/build?delay=0sec).  [Setup the onebox](https://jenkins-onebox.lyft.net/job/onebox-control/build?delay=0sec) with the superset profile.

The superset profile will start by default the local and superset containers. If other services/containers are needed add them to the [jenkins profiles file](https://github.com/lyft/ops/blob/master/base/ops/config/pillar/profiles.sls) and [deploy with the base pipeline](https://jenkins.lyft.net/view/base-deploy).

### Resolving dependencies and libraries

There's no need to run pip locally.  Salt will handle all of these for you.

If changes are made to requirements.txt it may be necessary to do a full salt run:

```bash
cd devbox
control enter superset
salt-call state.highstate
```
