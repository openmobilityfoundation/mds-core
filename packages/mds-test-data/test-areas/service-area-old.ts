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

import { FeatureCollection } from 'geojson'

export default {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-118.29144716262816, 34.01810937962584],
            [-118.29142570495605, 34.01101269922709],
            [-118.28724145889282, 34.01120835500923],
            [-118.28279972076417, 34.011279502454606],
            [-118.28294992446898, 34.01809159420095],
            [-118.29144716262816, 34.01810937962584]
          ]
        ]
      }
    }
  ]
} as FeatureCollection
