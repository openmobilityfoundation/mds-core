# Overview

This is a Typescript implementation of MDS.

## Installation

### Dependencies
* PostgreSQL
* Redis
* [Yarn](https://yarnpkg.com/en/docs/install#mac-stable)

Install [Lerna](https://lerna.js.org/)
```sh
yarn global add lerna
```

Install all packages.  Uses Yarn workspaces.
```sh
yarn install
```

Now you can work with each package
```
cd packages/mds-audit
yarn test
yarn start
```

### Package Management - Lerna

This repository is a monorepo and uses Lerna for working with its packages.

#### Example commands
Run all test suites at once
```
lerna run test
```

Run all tests suites sequentially
```
lerna run test --concurrency 1
```

Run tests for a particular package
```
lerna run test --scope mds-audit
```

Clean all dependencies
```
lerna run clean
```

Format all files
```
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

## Contributing
See [CONTRIBUTING.md](.github/CONTRIBUTING.md)
