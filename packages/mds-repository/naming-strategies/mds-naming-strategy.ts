/*
    Copyright 2019-2020 City of Los Angeles.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

import { NamingStrategyInterface, DefaultNamingStrategy, Table } from 'typeorm'

const tableName = (tableOrName: Table | string) =>
  (typeof tableOrName === 'string' ? tableOrName : tableOrName.name).replace(/-/g, '_').replace(/ /g, '')

export class MdsNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  primaryKeyName(tableOrName: Table | string, columnNames: string[]): string {
    return [tableName(tableOrName), 'pkey'].join('_')
  }

  indexName(tableOrName: Table | string, columnNames: string[], where?: string): string {
    return ['idx', ...columnNames, tableName(tableOrName)].join('_')
  }

  uniqueConstraintName(tableOrName: Table | string, columnNames: string[]): string {
    return ['uc', ...columnNames, tableName(tableOrName)].join('_')
  }

  foreignKeyName(tableOrName: Table | string, columnNames: string[]): string {
    return ['fk', ...columnNames, tableName(tableOrName)].join('_')
  }
}
