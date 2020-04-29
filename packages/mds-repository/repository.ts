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

import { Connection } from 'typeorm'
import { ConnectionManager, ConnectionManagerOptions, ConnectionMode } from './connection-manager'
import { CreateRepositoryMigration } from './migration'

type RepositoryMethod<TMethod> = (connect: (mode: ConnectionMode) => Promise<Connection>) => TMethod

export const CreateRepositoryMethod: <TMethod>(
  method: RepositoryMethod<TMethod>
) => RepositoryMethod<TMethod> = method => method

export type RepositoryOptions = Pick<ConnectionManagerOptions, 'entities' | 'migrations'>

export const CreateRepository = <TRepositoryMethods>(
  name: string,
  methods: (connect: (mode: ConnectionMode) => Promise<Connection>) => TRepositoryMethods,
  { entities = [], migrations = [] }: RepositoryOptions = {}
) => {
  const migrationsTableName = `${name}-migrations`
  const { connect, ...manager } = ConnectionManager(name, {
    migrationsTableName,
    entities,
    migrations: [CreateRepositoryMigration(migrationsTableName), ...migrations]
  })
  return {
    ...manager,
    ...methods(connect)
  }
}
