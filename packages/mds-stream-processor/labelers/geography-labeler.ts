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
import { UUID, Nullable, Telemetry, Geography } from '@mds-core/mds-types'
import { pointInShape } from '@mds-core/mds-utils'
import getBbox from '@turf/bbox'
import { BBox } from '@turf/helpers'
import { MessageLabeler } from './types'

export interface GeographyLabel {
  geography_ids: UUID[]
}

type WithBbox<T> = T & { bbox: BBox }

export const pointInBbox = ({ lat, lng }: { lat: number; lng: number }, bbox: BBox) => {
  const [bottomLeftLng, bottomLeftLat, topRightLng, topRightLat] = bbox

  return bottomLeftLng <= lng && bottomLeftLat <= lat && topRightLng >= lng && topRightLat >= lat
}

const computeBbox = (geography: Geography) => {
  return getBbox(geography.geography_json)
}

const newGeos = (cachedGeos: Map<UUID, boolean>, readGeos: Geography[]) =>
  readGeos.filter(readGeo => !cachedGeos.has(readGeo.geography_id))

export const GeographyLabeler: () => MessageLabeler<{ telemetry?: Nullable<Telemetry> }, GeographyLabel> = () => {
  const cachedGeos: WithBbox<Geography>[] = []
  const cachedGeosMap: Map<UUID, boolean> = new Map()

  return async ({ telemetry }) => {
    const gps = telemetry?.gps
    if (gps) {
      const { lat, lng } = gps

      const readGeos = await db.readGeographies({ get_published: true })

      const uncachedGeos = newGeos(cachedGeosMap, readGeos).map(geo => ({ bbox: computeBbox(geo), ...geo }))

      if (uncachedGeos.length) {
        cachedGeos.push(...uncachedGeos)
        uncachedGeos.forEach(({ geography_id }) => cachedGeosMap.set(geography_id, true))
      }

      const geography_ids = cachedGeos
        .filter(({ bbox }) => pointInBbox({ lat, lng }, bbox))
        .filter(({ geography_json }) => pointInShape({ lat, lng }, geography_json))
        .map(({ geography_id }) => geography_id)

      return { geography_ids }
    }
    return { geography_ids: [] }
  }
}
