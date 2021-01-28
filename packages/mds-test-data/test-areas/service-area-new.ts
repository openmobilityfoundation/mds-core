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
            [-118.29144716262816, 34.01545931023131],
            [-118.28717708587645, 34.01547709620768],
            [-118.28623294830322, 34.01528145026254],
            [-118.28571796417236, 34.01492572920718],
            [-118.28518152236938, 34.015334808292316],
            [-118.2828640937805, 34.0153170222861],
            [-118.28292846679688, 34.01807380877234],
            [-118.29144716262816, 34.01810937962584]
          ]
        ]
      }
    }
  ]
} as FeatureCollection
