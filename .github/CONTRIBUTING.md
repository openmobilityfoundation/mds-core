# How To Contribute

The following is a set of guidelines and rules for contributing to this project. These come from the OMF organization.

## Contributing Guidelines

Please read the [Contributing Guidelines](https://github.com/openmobilityfoundation/mobility-data-specification/blob/master/CONTRIBUTING.md) if you would like to contribute.

## Code of Conduct

This project and everyone participating in it is governed by the [Code of Conduct](https://github.com/openmobilityfoundation/mobility-data-specification/blob/master/CODE_OF_CONDUCT.md).

By participating, you are expected to uphold this code.

## License

Use of this code is governed by the [Licensing Agreement](https://github.com/openmobilityfoundation/mobility-data-specification/blob/master/LICENSE).

## Release Guidelines

Adminsitrators of this repository follow the [MDS Release Guidelines](https://github.com/openmobilityfoundation/mobility-data-specification/blob/master/ReleaseGuidelines.md)

## Development Dependencies

In order to maintain consistency, all development dependencies related to the testing and building of the packages in this repository are installed in the root `package.json` file. This includes the various tools (`ESLint`, `Prettier`, `TypeScript`, `Mocha`, etc.) as well as the default configuration settings for those tools.

One notable exception to this is the installation of TypeScript definition (`@types`) packages which are installed as regular dependencies in the individual packages that require them which is analogous to those dependencies that include their own type definitinos without a separate `@types` package.
