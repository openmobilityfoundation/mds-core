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

import { Column, Index } from 'typeorm'
import { ColumnCommonOptions } from 'typeorm/decorator/options/ColumnCommonOptions'
import { ColumnWithWidthOptions } from 'typeorm/decorator/options/ColumnWithWidthOptions'
import { Timestamp } from '@mds-core/mds-types'
import { EntityConstructor } from '../@types'
import { BigintTransformer } from '../transformers'

export interface RecordedEntityModel {
  recorded: Timestamp
}

export type RecordedEntityCreateModel<TRecordedEntityModel extends RecordedEntityModel> = Omit<
  TRecordedEntityModel,
  keyof RecordedEntityModel
> &
  Partial<RecordedEntityModel>

export function RecordedEntity<TEntityClass extends EntityConstructor>(
  EntityClass: TEntityClass,
  options: ColumnWithWidthOptions & ColumnCommonOptions = {}
) {
  abstract class RecordedEntityMixin extends EntityClass implements RecordedEntityModel {
    @Column('bigint', {
      transformer: BigintTransformer,
      default: () => '(extract(epoch from now()) * 1000)::bigint',
      ...options
    })
    @Index()
    recorded: Timestamp
  }
  return RecordedEntityMixin
}
