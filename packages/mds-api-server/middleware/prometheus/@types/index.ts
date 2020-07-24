import type { TransformLabelsFn } from 'express-prom-bundle'

export type PrometheusLabeler = {
  label: string
  base: string | number | null
  transformer: TransformLabelsFn
}
