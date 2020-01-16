import { types as PostgresTypes } from 'pg'
import * as entities from './entities'
import * as migrations from './migrations'
import { MdsOrmNamingStrategy } from './naming-strategies'

// Use parseInt for bigint columns so the values get returned as numbers instead of strings
PostgresTypes.setTypeParser(20, Number)

const { PG_HOST, PG_PORT, PG_USER, PG_PASS, PG_NAME } = process.env

module.exports = {
  type: 'postgres',
  host: PG_HOST || 'localhost',
  port: Number(PG_PORT) || 5432,
  username: PG_USER,
  password: PG_PASS,
  database: PG_NAME,
  namingStrategy: new MdsOrmNamingStrategy(),
  entities: Object.values(entities),
  migrations: Object.values(migrations),
  cli: {
    entitiesDir: './entities',
    migrationsDir: './migrations'
  }
}
