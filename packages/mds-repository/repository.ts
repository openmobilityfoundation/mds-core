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
import logger from '@mds-core/mds-logger'
import { ConnectionManager, ConnectionManagerOptions, ConnectionMode, ConnectionManagerCliOptions } from './connection'
import { CreateRepositoryMigration } from './migration'

export type RepositoryOptions = Pick<ConnectionManagerOptions, 'entities' | 'migrations'>

export abstract class ReadWriteRepository {
  private readonly manager: ConnectionManager

  public initialize = async (): Promise<void> => {
    const {
      name,
      manager: { initialize }
    } = this
    logger.info(`Initializing Repostory: ${name}`)
    await initialize()
  }

  protected connect = async (mode: ConnectionMode): Promise<Connection> => {
    const { connect } = this.manager
    const connection = await connect(mode)
    return connection
  }

  public shutdown = async (): Promise<void> => {
    const {
      name,
      manager: { shutdown }
    } = this
    logger.info(`Terminating Repository: ${name}`)
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
