# Workshop

A simple example of a python micro-service that provides HTTP APIs.

## Adding a new service.

This is a brief guide to adding a new service to lyft's platform. The first step is to settle on a service name. For operations resources its recommended service names should be alphanumeric single words.

### Step 1: Creating a repository

Create a new blank github repository under the lyft organization. The repo name should be the same as your service name. In your repo settings add the dev team as collaborators: https://github.com/lyft/SERVICE/settings/collaboration

```bash
sh setup.sh
cd ../<your_service_directory>
git remote -v
git status .
git commit . -m "your commit"
git push origin master
```

### Step 2: Adding your service to the primary list

Add your service name to the primary service list in ops.

```bash
git clone git@github.com:lyft/ops.git
cd ops
git branch add_SERVICE_to_list
git checkout add_SERVICE_to_list
```

Edit **base/ops/config/pillar/services.sls** and add a yaml block to the end the service dictionary.

```yaml
SERVICE:
  address: {{subnet}}.{{addr}}{% set addr=addr+1 %}
```

Commit and push, and then create a PR.

```bash
git commit -a -m 'added a new SERVICE to the list'
git push origin HEAD
```

Merge your PR and deploy using the base pipeline: https://jenkins.lyft.net/view/base


### Step 3: Creating jenkins jobs

Once you have a new repo setup on github we want to create jenkins jobs before making more modifications. The main reason to do this is that jenkins will create development images used by devbox. This will make further development easier.

```bash
cd ops
git branch add_SERVICE_to_jenkins
git checkout add_SERVICE_to_jenkins
```

Now we want to edit jenkins/ops/config/pillar/jenkins.sls to add your service. This is a standard template which can be added to the bottom of the file. It creates two test jobs, a job that builds master, a job that builds PRs, deployment jobs, and image jobs.

```yaml
- name: SERVICE
  repo: SERVICE
  container: SERVICE
  tests:
    - name: unit
      cmd: make test_unit
    - name: int
      cmd: make test_integration
      containers:
        - local
        - api
  deploy:
    - name: staging
      next:
        manual:
          - production
    - name: production
```

The test block specifies two test jobs one for unit tests and one for integration tests. The integration test block specifies a list of auxiliary services needed to run the integration tests. Jenkins will make sure those services are setup before starting the test command.

Once your ready push your change into an ops branch, and go to github to create a PR.

```bash
git commit -a -m 'added a new SERVICE'
git push origin HEAD
```

After merging start a jenkins deployment using the jenkins pipeline: https://jenkins.lyft.net/view/jenkins. Jenkins deploys through jenkins.

### Step 4: Making a Docker Image

After jenkins has finished deploying loading https://jenkins.lyft.net should show a new set of jobs created for your service. Use the **SERVICE-build-image** job to create a new docker image. This image is used to launch and deploy services in all environments except staging and production.

Once the image as been built use the **SERVICE-tag-image** job to tag a vagrant copy of the image. The tag parameter should be "vagrant". This tag allows devbox to update less frequently than the CI and onebox systems. This prevents devs from wasting time downloading new images. Run the tag image job.

### Step 5: Adding to DevBox

Devbox maintains its own service list in **conf/enviroment**

```bash
git clone git@github.com:lyft/devbox.git
cd devbox
git branch add_SERVICE
git checkout add_SERVICE
# edit conf/environment and add in your service name
git commit -a -m 'added service X'
git push origin HEAD
```

Merge your PR.

### Step 6: Start in DevBox

You can now start your service in devbox.

```bash
./service start SERVICE
```

The first time this will download your new image.

### Step 7: Setup configuration management.

Make any alterations to the **ops/config** settings. Since these alerations are not python code and are configuration management you'll need to rerun salt to apply them to the devbox service.

```bash
./service enter SERVICE
# to apply config changes
sudo salt-call state.highstate
```

When you are done also test that alterations work properly container startup.

```bash
./service stop SERVICE
./service start SERVICE
# now runs with new config management code
```

### Step 8: Setup orchestration.

Make any alterations needed to **ops/orca**. This would include adding SQS queues, Cloudwatch Alarms, Dynamo tables, etc. See relevant sections at the end of this doc.

### Step 9: Rebuild Image

If you added pip packages or added any apt packages rebuild the service image in jenkins. This can be done by rerunning the build image job for your service. This caches new packages within the docker image and prevents them from being downloaded and installed on every service start. Optionally you can also re-tag the new image afterwards to force a new download to devbox.

### Step 10: Onebox

The easiest way to get your api working in the cloud is to launch a onebox. Use the onebox-assign jenkins job to name an unused onebox. Then use onebox-deploy to deploy your service and any dependent services. Once the job finishes your service will be live at **SERVICE-ONEBOX_NAME.onebox.lyft.net**

### Step 11: Deploying to Staging and Production

When your service is ready use the jenkins deploy pipeline to create cloud resouces and deploy a staging and production environment.


## Project Structure

The following sections explain in detail the structure of the template.

### ops

This directory provides settings for two major operation systems.

* config -  Settings for configuration management. This determines the packages, environment, and processes that will run within a service instance.
* orca - Settings for service orchestration. This determines the cloud resources, operation tools, monitoring settings that run around a service.

The following scripts can also be placed in the directory. They will get called at different points in service deployment.

* post_release.sh - Runs after the release. Mainly used to restart processes when code changes.

#### config

Configuration management is done using a salt state system. Each service has a **highstate** which defined the correct within instance state for a service. Salt has three main concepts.

* grains - YAML key value pairs which define **instance** specific information. These are defined by the ops/base project.
  * service_name - the name of the service
  * service_instance - "development, staging, production", the environment type
  * service_node - "03485854 or mleventi, rlane", the name of the node
  * service_group - "SERVICE_NAME-development", combination of the service name and service instance
* pillar - YAML key value pairs which define **service** specific information.
* states - YAML structure which define states that setup packages, files, services etc.

Subfolders in config define service specific settings for grains, pillar, and states. These are then combined with lyft wide standard settings in https://github.com/lyft/ops/tree/master/base. Services automatically includes pillar and states:

* base (pillar): https://github.com/lyft/ops/tree/master/base/ops/config/pillar
* base (states): https://github.com/lyft/ops/tree/master/base/ops/config/states/base
* lyft-python (states): https://github.com/lyft/ops/tree/master/base/ops/config/states/lyft-python

##### pillar

In python pillar has two main files: env.sls and SERVICE_NAME.sls. env.sls defines environmental variables accessable within the python processes. SERVICE_NAME.sls defines the python processes which should run on the service nodes.

##### states

The states define how a instance should be setup. dependencies.sls allows package installs that happen before python pip environments are setup.


### test

The template has two test frameworks, unit tests and integration tests. Unit tests should not require other services or databases and must be able to run with just python. Integration tests can require other platform pieces and use the local container for mocking AWS.

#### unit

Unit tests are run by jenkins using the make test_unit target. Jenkins runs unit tests using pytest and outputs an xUnit file in build/unit.xml

#### integration

Integration tests are run by jenkins using the make test_integration target. Jenkins runs integration tests using pytest and outputs an xUnit file in build/integration.xml

### Makefile

The makefile is the main control point for all common build, deployment, and test tasks. The template defines a few common targets.

* **make deploy** - This target is run by X-deploy in jenkins. It creates a deployment artifact based on the directory contents of the git repository. The deployment artifact is versioned by the current git commit SHA.
* **make release_staging** - This target updates the staging instances to use the current commit SHA deployment artifact. This is run by jenkins in the X-deploy-staging job.
* **make release_production** - This target updates production instances io use the current commit SHA.
* **make test_unit** - This runs the unit tests.
* **make test_integration** - This runs the integration tests.

### requirements.txt

The python requirements file defines all pip packages and versions for the project. This is installed on the system by salt states in the lyft-python import. This python requirements.txt file is combined with a standard set of requirements provided by:

* ops project - base/ops/config/states/lyft-python/requirements.txt
