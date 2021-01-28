/**
 * Copyright 2020 City of Los Angeles
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

import type { Labels as PrometheusLabels } from 'express-prom-bundle'
import { PrometheusLabeler } from './@types'
import { ApiRequest, ApiResponse, ApiResponseLocalsClaims } from '../../@types'

const providerIdLabelTransformer = (
  labels: PrometheusLabels,
  req: ApiRequest,
  res: ApiResponse & ApiResponseLocalsClaims
) => {
  if (res.locals.claims?.provider_id) {
    return Object.assign(labels, { provider_id: res.locals.claims.provider_id })
  }
  return labels
}

export const ProviderIdLabeler: PrometheusLabeler = {
  label: 'provider_id',
  base: null,
  transformer: providerIdLabelTransformer
}
