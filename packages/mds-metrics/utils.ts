import { now, yesterday, hours, days, normalizeToArray } from '@mds-core/mds-utils'

import { GetTimeBinsParams, HourOrDay } from './types'

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

export function convertBinSizeFromEnglishToMs(bin_size_english: HourOrDay) {
  const timeToMs = {
    hour: hours(1),
    day: days(1)
  }
  const bin_size = timeToMs[bin_size_english]
  return bin_size
}

export function getBinSize(binSizeFromQuery: HourOrDay | HourOrDay[] | undefined = ['hour']) {
  return normalizeToArray<HourOrDay>(binSizeFromQuery).map(currBinSizeEnglish =>
    convertBinSizeFromEnglishToMs(currBinSizeEnglish)
  )
}
