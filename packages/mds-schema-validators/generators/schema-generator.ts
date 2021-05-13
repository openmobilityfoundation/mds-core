import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { SchemaObject } from 'ajv'

/**
 *
 * Generates schema files and dumps them into a schema-gen folder for a package.
 * @param schemas Schemas to turn into files
 * @param path Path to caller package. Typically, the invoker should pass in `__dirname` here.
 * @example GenerateSchemaFiles(someSchemaObjects, __dirname)
 */
/* istanbul ignore next */
export const GenerateSchemaFiles = (schemas: SchemaObject[], path: string) => {
  const SCHEMA_DIR = `${path}/schema-gen`

  const README = `# Schema-Gen

  The files in this folder are 100% auto-generated and **should not be manually modified**.

  ## Usage

  To add/remove schemas from this folder, please modify the contents of this package's [generate-schemas.ts](../generate-schemas.ts) to change what's generated.
  `

  if (!existsSync(SCHEMA_DIR)) {
    mkdirSync(SCHEMA_DIR)
    writeFileSync(`${SCHEMA_DIR}/README.md`, README)
  }

  schemas.map(({ $id, $schema, ...schema }) =>
    writeFileSync(`${SCHEMA_DIR}/${$id}Schema.json`, JSON.stringify(schema, null, 2))
  )
}
