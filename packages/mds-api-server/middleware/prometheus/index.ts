import type { Labels as PrometheusLabels, Opts as PrometheusOptions, TransformLabelsFn } from 'express-prom-bundle'
import prometheus from 'express-prom-bundle'
import promClient from 'prom-client'
import { ProviderIdLabeler } from './provider-id-labeler'
import { ApiRequest, ApiResponse, ApiResponseLocals, ApiClaims } from '../../@types'
import { PrometheusLabeler } from './@types'

const PrometheusLabelTransformers = <AccessTokenScope extends string>(...labelers: TransformLabelsFn[]) => {
  return (
    labels: PrometheusLabels,
    req: ApiRequest,
    res: ApiResponse & ApiResponseLocals<ApiClaims<AccessTokenScope>>
  ) => {
    return labelers.reduce((acc: PrometheusLabels, labeler: TransformLabelsFn) => {
      return { ...acc, ...labeler(labels, req, res) }
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
