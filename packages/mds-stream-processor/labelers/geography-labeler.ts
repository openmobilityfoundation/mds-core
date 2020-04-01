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

import db from '@mds-core/mds-db'
import { UUID, Nullable, Telemetry } from '@mds-core/mds-types'
import { pointInShape } from '@mds-core/mds-utils'
import { MessageLabeler } from './types'

export interface GeographyLabel {
  geography_ids: UUID[]
}

export const GeographyLabeler: () => MessageLabeler<
  { telemetry?: Nullable<Telemetry> },
  GeographyLabel
> = () => async ({ telemetry }) => {
  const gps = telemetry?.gps
  if (gps) {
    const { lat, lng } = gps

    const geographies = await db.readGeographies({ get_published: true })

    const geography_ids = geographies
      .filter(({ geography_json }) => pointInShape({ lat, lng }, geography_json))
      .map(({ geography_id }) => geography_id)

    return { geography_ids }
  }
  return { geography_ids: [] }
}
