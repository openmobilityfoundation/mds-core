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

import { DeleteResult, InsertResult, UpdateResult } from 'typeorm'
import { AnyFunction, Optional, NullableKeys } from '@mds-core/mds-types'

export interface InsertReturning<T> extends InsertResult {
  raw: T[]
}

export interface UpdateReturning<T> extends UpdateResult {
  raw: T[]
}

export interface DeleteReturning<T> extends DeleteResult {
  raw: T[]
}

export type Mixin<T extends AnyFunction> = InstanceType<ReturnType<T>>

// Mark all nullable properties as optional (useful for create methods)
export type DomainModelCreate<T> = Optional<T, NullableKeys<T>>
