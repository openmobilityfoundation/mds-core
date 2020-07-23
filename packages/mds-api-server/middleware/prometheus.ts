import type { Opts as PrometheusOptions } from 'express-prom-bundle'
import prometheus from 'express-prom-bundle'
import promClient from 'prom-client'

export type PrometheusMiddlewareOptions = Partial<PrometheusOptions>

export const PrometheusMiddleware = (options: PrometheusMiddlewareOptions = {}) =>
  prometheus({
    metricsPath: '/prometheus',
    includeMethod: true,
    includePath: true,
    includeUp: true,
    promRegistry: new promClient.Registry(),
    ...options
  })
