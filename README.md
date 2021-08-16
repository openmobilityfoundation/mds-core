# Introduction

The `mds-core` repo contains a deployable reference implementation for working with MDS data. It is a beta release meant for testing by cities and other entities to gather feedback and improve the product.

The [Mobility Data Specification](https://github.com/openmobilityfoundation/mobility-data-specification/) (MDS) is a project of the [Open Mobility Foundation](http://www.openmobilityfoundation.org) (OMF) focused on digitally managing dockless e-scooters, bicycles and carshare in public spaces.

`mds-core` is...

- a reference MDS implementation usable by cities
- on-ramp for developers joining MDS ecosystem
- a tool for validating software implementations and data

`mds-core` is not...

- the only implementation of MDS
- where the specification is officially defined
- a place to define local policies or performance metrics
- a cloud service that will be operated by the OMF

**See the `mds-core` [Wiki](https://github.com/openmobilityfoundation/mds-core/wiki) for more details and help, including how to use it, architecture diagrams, release goals, how to help, the technical stack used, and slideshows and a video presentation.**

# Overview of `mds-core`

The included code represents what is currently up and running for Los Angeles as well as new features under development. Includes the following:

- A current LADOT implementation of all MDS endpoints
- Development versions of mds-audit, mds-policy, and mds-compliance
- MDS logging (mds-logger), daily metrics (mds-daily) and Google sheet reporting app for technical compliance.

![Applications Overview](https://i.imgur.com/AGRubjE.png)

# Contributing, Code of Coduct, Licensing

Read the [CONTRIBUTING.md](.github/CONTRIBUTING.md) document for rules and guidelines on contribution, code of conduct, license, development dependencies, and release guidelines.

# Contents

### Stable Content

#### APIs

| API        | Compatible Versions |
| ---------- | ------------------- |
| MDS-Agency | `v1.0.0`            |
| MDS-Policy | `v1.0.0`            |

### Experimental Content

#### APIs

1. MDS-Audit [PR](https://github.com/openmobilityfoundation/mobility-data-specification/pull/326)
2. MDS-Compliance [PR](https://github.com/openmobilityfoundation/mobility-data-specification/pull/333)
3. MDS-Geography-Author
4. MDS-Policy-Author
5. MDS-Transaction

## Installation

### Dependencies

- PostgreSQL
- Redis
- [NVM](https://github.com/nvm-sh/nvm#installation-and-update)

#### Database config on macOS

If you haven't installed PostegreSQL and Redis you can install them with homebrew on macOS

```
brew install postgresql
brew install redis
```

Make sure they are running before you run the tests

```
brew services start postgresql
brew services start redis
```

If you encounter the following error:
`FATAL: database “<user>” does not exist`

The following command should fix your issue
`createdb -h localhost`

To run tests, you will need this:
`createdb -h localhost mdstest`

Then add `export PG_NAME=mdstest` to your shell's environment file. (The name is not important, but you'll need to point it somehwere.)

#### Node setup

You should have NVM already installed from the link above. The top level directory of the project has a `.nvmrc` file and you should be able to run `nvm install` to get the right version of Node.

#### Package manager setup

Install [pnpm](https://pnpm.js.org/)

```sh
npm install -g pnpm
```

Install all packages. Uses pnpm workspaces.

```sh
pnpm install
```

#### Launching a local server for a package

Now you can work with each package

```sh
cd packages/mds-audit
pnpm test
pnpm start
```

#### Running the tests

You can also run all tests from the project root with

```
pnpm test
```

## Debugging with Visual Studio Code

### Node.js: Express Server

- Select the `Node.js Express Server` debug configuration
- Select the file that implements the Node/Express server for a package (typically `server.ts`) in the Explorer panel
- Press `F5`

### Mocha Tests

- Select the `Node.js: Mocha Tests` debug configuration
- Select any one of the files in a package's test folder
- Press `F5`

## Kubernetes

MDS can readily be provisioned to a [Kubernetes](https://kubernetes.io) capable cluster, be it a local or remote. The following steps describe how to build, deploy and operate against a local MDS cluster.

### Prerequisites

Obtain a local working copy of MDS:

```sh
git clone https://github.com/lacuna-tech/mds-core
cd mds-core
```

#### Docker/Kubernetes

OSX (Linux and Windows tbd)

Install [Docker Desktop](https://download.docker.com/mac/stable/Docker.dmg):

```sh
open https://download.docker.com/mac/stable/Docker.dmg
```

Start Docker-Desktop:

```sh
open /Applications/Docker.app
```

Configure Kubernetes in Docker:

```txt
select the 'Preferences' option
select the 'Resources' option
  apply the following minimal resource changes:
    CPUs: 4
    Memory: 8G
    Swap: 1G
select the 'Kubernetes' option
  select 'Enable Kubernetes' option
select 'Apply & Restart'
```

Verify:

```sh
which kubectl
kubectl config use-context docker-desktop
kubectl cluster-info
```

#### Install Helm/Tiller

This implementation of MDS uses a Helm v2 chart for installation. Helm can be installed to your local system with Homebrew (MacOS), or by downloading the correct executable for your system from https://github.com/helm/helm/releases/tag/v2.16.9

### Build : compile source into deployable images

Once you have the `helm` executable on your local system, you can set up the k8s side with the following commands:

```sh
kubectl -n kube-system create serviceaccount tiller
kubectl create clusterrolebinding tiller \
        --serviceaccount kube-system:tiller \
        --clusterrole cluster-admin
helm init --service-account tiller --history-max 20
```

WARNING: This will give helm full permissions to your entire kubernetes cluster. This should only be used on local systems or private clusters with fully-trusted users. DO NOT USE IN PRODUCTION

#### Install Istio

Istio is a service mesh for Kubernetes. This MDS implementation uses Istio for its built-in handling of JWT authentication, advanced HTTP routing, and (optionally) mTLS.

```sh
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.5.10 sh -
cd istio-1.5.10
helm install --name istio-init --namespace istio-system ./install/kubernetes/helm/istio-init
helm install --name istio --namespace istio-system ./install/kubernetes/helm/istio \
        --values ./install/kubernetes/helm/istio/values-istio-demo.yaml
```

### Build source into deployable images

This will run the build, and create the docker container images.

```sh
pnpm clean
NODE_ENV=development pnpm image
```

note that setting `NODE_ENV=development` will enable images to be built with the `:latest` tag instead of a specific version-branch-commit tag. If you choose not to use this, the images will be built with tags matching the format `:version-branch-commit`. You can generate a manifest with these image tags by running `pnpm values`. This manifest can be included in a helm install with the switch `--values dist/values.yaml`.

Verify:

```sh
docker images --filter reference='mds-*'
```

### Install MDS

```sh
kubectl create namespace mds
kubectl label namespace mds istio-injection=enabled
cd helm/mds
helm dep up
helm install --name mds --namespace mds .
```

Verify:

```sh
curl localhost/agency
```

### In-Cluster Development

Due to the nature of `mds-core` being a highly portable Typescript project that compiles down into minified javascript for its images, rapidly development in-cluster can be quite challenging. `mds-core` utilizes [Okteto](https://okteto.com) to enable developers to actively develop their code in-cluster.

After following the above steps to set up a local MDS cluster, you can override an existing service's deployment with these steps.

1. Update `mds-core/okteto.yml`'s `name` field to be set to the service you wish to replace (e.g. `mds-agency`)
2.

```sh
curl https://get.okteto.com -sSfL | sh
```

3. Install the `Remote - Kubernetes` VSCode extension.
4. Run `> Okteto Up` from the VSCode command palette.

- After the remote session opens, execute this in the new shell window:

```sh
pnpm install
cd packages/${SERVICE_NAME}
pnpm start
```

5. This session is now safe to close, and you can reattach with the `okteto.${SERVICE_NAME}` ssh profile automatically added for you using the VSCode `Remote - SSH` package.
6. When you're completely done with your session, run `> Okteto Down` from the VSCode command palette, or `okteto down` from terminal to revert the changes made by Okteto, and return your service to its previous deployment.

### Additional Considerations

Access the database:

```sh
kubectl port-forward svc/mds-postgresql 5432 &
psql -h localhost -U mdsadmin mds
```

Access the cache:

```sh
kubectl port-forward svc/mds-redis-master 6379 &
redis-cli
```

### Cleanup

```sh
helm del --purge mds
```

## Other

### CI/CD

This project includes a Jenkinsfile to run as a pipeline with the Jenkins CI/CD application. You can test the syntax of this file with the following command:

```sh
curl --user user:password -X POST -F "jenkinsfile=<Jenkinsfile" http://localhost:8080/pipeline-model-converter/validate
```

This assumes you have a jenkins server running on port 8080 of your local machine. Note that this will only validate syntax, not whether the pipeline can actually be run.

To commit code, you will need the pre-commit tool, which can be installed via `brew install pre-commit`. For more information, see [SECURITY.md](.github/SECURITY.md)

### Adding tests

#### Using multiple services/APIs within one test suite

In order to use multiple APIs/services within one test suite, it is important to ensure that random ports are assigned to each API/Service to avoid collision. To do this, we utilize Jest's setupFiles configuration in conjunction with a port randomization function. See [`.jest/configurePorts.ts`](.jest/configurePorts.ts) and `setupFiles` in [`.jest/jest.config.js`](.jest/jest.config.js). Ensure that whenever new APIs/services are added, there is a corresponding entry in `configurePorts.ts`.
