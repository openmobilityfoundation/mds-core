# How To Contribute

The following is a set of guidelines for contributing to this project. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

#### Table of Contents

[Code of Conduct](#code-of-conduct)

[Development Dependencies](#development-dependencies)

## Code of Conduct

This project and everyone participating in it is governed by the Code of Conduct from the [Contributor Covenant](https://www.contributor-covenant.org/), version 1.4, available at https://www.contributor-covenant.org/version/1/4/code-of-conduct.html

By participating, you are expected to uphold this code.

## Development Dependencies

In order to maintain consistency, all development dependencies related to the testing and building of the packages in this repository are installed in the root `package.json` file. This includes the various tools (`ESLint`, `Prettier`, `TypeScript`, `Mocha`, etc.) as well as the default configuration settings for those tools.

One notable exception to this is the installation of TypeScript definition (`@types`) packages which are installed as regular dependencies in the individual packages that require them which is analogous to those dependencies that include their own type definitinos without a separate `@types` package.