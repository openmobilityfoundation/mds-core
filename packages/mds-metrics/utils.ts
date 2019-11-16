import { now, yesterday } from '@mds-core/mds-utils'

import { GetTimeBinsParams } from './types'

export function getTimeBins({
  start_time = yesterday(),
  end_time = now(),
  bin_size = 3600000
}: Partial<GetTimeBinsParams>) {
  const interval = end_time - start_time

  return [...Array(Math.floor(interval / bin_size))].map((_, idx) => ({
    start: start_time + idx * bin_size,
    end: start_time + (idx + 1) * bin_size
  }))
}
