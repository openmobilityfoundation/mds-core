# Spec

The [flat-spec.json](flat-spec.json) file in this folder is 100% auto-generated, and should **not be manually modified**. The reason `flat-spec.json` exists, is that some tools do not support mutli-file OpenAPI specs, and this flattened version is compliant with those tools.

## Usage

To generate a flat-spec, you must first have a `spec.yaml` file within this folder. Then, run [generate-flat-spec.ts](../generate-flat-spec.ts) to generate a flattened JSON version of the spec.
