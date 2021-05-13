import { schemas as transactionServiceSchemas } from '@mds-core/mds-transaction-service'
import { TransactionApiVersionSchema } from './middleware'
import { GenerateSchemaFiles } from '@mds-core/mds-schema-validators'

const schemas = [...transactionServiceSchemas, TransactionApiVersionSchema]

GenerateSchemaFiles(schemas, __dirname)
