import $RefParser from '@apidevtools/json-schema-ref-parser'
import { writeFileSync } from 'fs'

/* istanbul ignore next */
export const GenerateFlatSpec = (path: string) => {
  const SPEC_DIR = `${path}/spec`

  $RefParser
    .bundle(`${SPEC_DIR}/spec.yaml`)
    .then(flatSchema => {
      writeFileSync(`${SPEC_DIR}/flat-spec.json`, JSON.stringify(flatSchema, null, 2))
      return
    })
    .catch(err => {
      console.error('Error generating flat-spec!', err)
      process.exit(1)
    })
}
