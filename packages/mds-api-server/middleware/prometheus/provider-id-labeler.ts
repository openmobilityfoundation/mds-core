import type { Labels as PrometheusLabels } from 'express-prom-bundle'
import { PrometheusLabeler } from './@types'
import { ApiRequest, ApiResponse, ApiResponseLocals, ApiClaims } from '../../@types'

const providerIdLabelTransformer = <AccessTokenScope extends string>(
  labels: PrometheusLabels,
  req: ApiRequest,
  res: ApiResponse & ApiResponseLocals<ApiClaims<AccessTokenScope>>
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
