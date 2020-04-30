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
import { ConnectionManager, ConnectionManagerOptions, ConnectionMode, ConnectionManagerCliOptions } from './connection'
import { CreateRepositoryMigration } from './migration'

type RepositoryMethod<TMethod> = (connect: (mode: ConnectionMode) => Promise<Connection>) => TMethod

export const CreateRepositoryMethod: <TMethod>(
  method: RepositoryMethod<TMethod>
) => RepositoryMethod<TMethod> = method => {
  // eslint-disable-next-line no-console
  console.warn('CreateRepositoryMethod is deprecated. Extend ReadWriteRepository instead.')
  return method
}

export type RepositoryOptions = Pick<ConnectionManagerOptions, 'entities' | 'migrations'>

export const CreateRepository = <TRepositoryMethods>(
  name: string,
  methods: (connect: (mode: ConnectionMode) => Promise<Connection>) => TRepositoryMethods,
  { entities = [], migrations = [] }: RepositoryOptions = {}
) => {
  // eslint-disable-next-line no-console
  console.warn('CreateRepository is deprecated. Extend ReadWriteRepository instead.')
  const migrationsTableName = `${name}-migrations`
  const { connect, ...manager } = new ConnectionManager(name, {
    migrationsTableName,
    entities,
    migrations: [CreateRepositoryMigration(migrationsTableName), ...migrations]
  })
  return {
    ...manager,
    ...methods(connect)
  }
}

export abstract class ReadWriteRepository {
  private readonly manager: ConnectionManager

  public initialize = async (): Promise<void> => {
    const { initialize } = this.manager
    await initialize()
  }

  protected connect = async (mode: ConnectionMode): Promise<Connection> => {
    const { connect } = this.manager
    const connection = await connect(mode)
    return connection
  }

  public shutdown = async (): Promise<void> => {
    const { shutdown } = this.manager
    await shutdown()
  }

  public cli = (options: ConnectionManagerCliOptions) => {
    const { cli } = this.manager
    return cli(options)
  }

  constructor(public readonly name: string, { entities = [], migrations = [] }: RepositoryOptions = {}) {
    const migrationsTableName = `${name}-migrations`
    this.manager = new ConnectionManager(name, {
      migrationsTableName,
      entities,
      migrations: [CreateRepositoryMigration(migrationsTableName), ...migrations]
    })
  }
}
