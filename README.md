# Overview

Repo for LADOT MDS implementation for contribution to the Open Mobility Foundation.  It represents what is currently up and running for Los Angeles production MDS as well as new features under development.  Includes the following:

* A current LADOT implementation of all MDS endpoints
* Development versions of mds-audit, mds-policy, and mds-compliance
* MDS logging (mds-logger), daily metrics (mds-daily) and Google sheet reporting app for technical compliance.

## Installation

### Dependencies

* PostgreSQL
* Redis
* [Yarn](https://yarnpkg.com/en/docs/install#mac-stable)

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

#### Package setup
Install [Lerna](https://lerna.js.org/)

```sh
yarn global add lerna
```

Install all packages.  Uses Yarn workspaces.

```sh
yarn install
```

#### Launching a local server for a package
Now you can work with each package

```sh
cd packages/mds-audit
yarn test
yarn start
```

#### Running the tests
You can also run all tests from the project root with
```
yarn test
```

### Package Management - Lerna

This repository is a monorepo and uses Lerna for working with its packages.

#### Example commands

Run all test suites at once

```sh
lerna run test
```

Run all tests suites sequentially

```sh
lerna run test --concurrency 1
```

Run tests for a particular package

```sh
lerna run test --scope mds-audit
```

Clean all dependencies

```sh
lerna run clean
```

Format all files

```sh
lerna run prettier
```

## Debugging with Visual Studio Code

### Node.js: Express Server

* Select the `Node.js Express Server` debug configuration
* Select the file that implements the Node/Express server for a package (typically `server.ts`) in the Explorer panel
* Press `F5`

### Mocha Tests

* Select the `Node.js: Mocha Tests` debug configuration
* Select any one of the files in a package's test folder
* Press `F5`

### [Kubernetes](https://kubernetes.io)/[Istio](https://istio.io)

MDS can be provisioned to a Kubernetes cluster as follows:

* Install and configure [Docker Desktop](https://download.docker.com/mac/stable/Docker.dmg)
  * `preferences / advanced`: cpus:6, memory:8G, swap:1G
  * `preferences / kubernetes`: enabled kubernetes
* Add `kubectl` to your PATH environment, e.g. for OSX:
  * `export PATH=/Applications/Docker.app/Contents/Resources/bin:${PATH}`
* Ensure an active kubernetes cluster is configured and accessible:
  * `kubectl config set-context docker-desktop`

Lastly, build and deploy MDS to your kubernetes cluster:

```bash
./bin/mdsctl bootstrap build install:mds test:integration
```

To cleanup the MDS cluster consider:

```bash
./bin/mdsctl uninstall
```

For a complete listing of available operations consider:

```bash
./bin/mdsctl
```

## Contributing

See [CONTRIBUTING.md](.github/CONTRIBUTING.md)
