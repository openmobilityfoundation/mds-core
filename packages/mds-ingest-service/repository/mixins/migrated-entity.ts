/**
 * Copyright 2019 City of Los Angeles
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { BigintTransformer } from '@mds-core/mds-repository'
import { AnyConstructor, Nullable } from '@mds-core/mds-types'
import { Column, Index } from 'typeorm'

export interface MigratedEntityModel {
  migrated_from_source: Nullable<string>
  migrated_from_version: Nullable<string>
  migrated_from_id: Nullable<number>
}

export const MigratedEntity = <T extends AnyConstructor>(EntityClass: T) => {
  abstract class MigratedEntityMixin extends EntityClass implements MigratedEntityModel {
    @Column('varchar', { length: 127, nullable: true })
    @Index()
    migrated_from_source: Nullable<string>

    @Column('varchar', { length: 31, nullable: true })
    @Index()
    migrated_from_version: Nullable<string>

    @Column('bigint', { transformer: BigintTransformer, nullable: true })
    @Index()
    migrated_from_id: Nullable<number>
  }
  return MigratedEntityMixin
}
