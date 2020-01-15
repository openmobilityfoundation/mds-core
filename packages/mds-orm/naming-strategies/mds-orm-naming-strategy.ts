import { NamingStrategyInterface, DefaultNamingStrategy, Table } from 'typeorm'

const tableName = (tableOrName: Table | string) => (typeof tableOrName === 'string' ? tableOrName : tableOrName.name)

export class MdsOrmNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  primaryKeyName(tableOrName: Table | string, columnNames: string[]): string {
    return [tableName(tableOrName), 'pkey'].join('_')
  }

  indexName(tableOrName: Table | string, columnNames: string[], where?: string): string {
    return ['idx', ...columnNames, tableName(tableOrName)].join('_')
  }
}
