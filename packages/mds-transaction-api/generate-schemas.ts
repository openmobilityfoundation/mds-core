import { GenerateSchemaFiles } from '@mds-core/mds-schema-validators'
import { schemas as transactionServiceSchemas } from '@mds-core/mds-transaction-service'
import { TransactionApiVersionSchema } from './middleware'

const schemas = [...transactionServiceSchemas, TransactionApiVersionSchema]

GenerateSchemaFiles(schemas, __dirname)
