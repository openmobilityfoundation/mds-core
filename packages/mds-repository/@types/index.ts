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

import { InsertResult, UpdateResult } from 'typeorm'
import { Nullable } from '@mds-core/mds-types'

// eslint-reason recursive declarations require interfaces
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface JsonArray extends Array<Json> {}

export interface JsonObject {
  [property: string]: Json
}

export type JsonValue = string | number | boolean | JsonArray | JsonObject

export type Json = Nullable<JsonValue>

export interface InsertReturning<T> extends InsertResult {
  raw: T[]
}

export interface UpdateReturning<T> extends UpdateResult {
  raw: T[]
}

export interface ModelMapper<FromModel, ToModel> {
  map: (from: FromModel[]) => ToModel[]
}
