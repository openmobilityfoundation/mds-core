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

import type { Labels as PrometheusLabels, Opts as PrometheusOptions, TransformLabelsFn } from 'express-prom-bundle'
import prometheus from 'express-prom-bundle'
import promClient from 'prom-client'
import { ProviderIdLabeler } from './provider-id-labeler'
import { ApiRequest, ApiResponse } from '../../@types'
import { PrometheusLabeler } from './@types'

const PrometheusLabelTransformers = (...labelers: TransformLabelsFn[]) => {
  return (labels: PrometheusLabels, req: ApiRequest, res: ApiResponse) => {
    return labelers.reduce((acc: PrometheusLabels, labeler: TransformLabelsFn) => {
      return Object.assign(acc, labeler(labels, req, res))
    }, labels)
  }
}

const PrometheusLabelers = (...labelers: PrometheusLabeler[]) => {
  const { customLabels, transformers } = labelers.reduce(
    (acc: { customLabels: object; transformers: TransformLabelsFn[] }, labeler) => {
      const { label, transformer, base } = labeler
      return { customLabels: { ...acc.customLabels, [label]: base }, transformers: [...acc.transformers, transformer] }
    },
    { customLabels: {}, transformers: [] }
  )

  const transformLabels = PrometheusLabelTransformers(...transformers)
  return { customLabels, transformLabels }
}

export type PrometheusMiddlewareOptions = Partial<PrometheusOptions>

export const PrometheusMiddleware = (options: PrometheusMiddlewareOptions = {}) =>
  prometheus({
    metricsPath: '/prometheus',
    includeMethod: true,
    includePath: true,
    includeUp: true,
    promRegistry: new promClient.Registry(),
    ...PrometheusLabelers(ProviderIdLabeler),
    ...options
  })
