import { AnnotationData, GpsData } from '@mds-core/mds-types'
import { findServiceAreas } from '@mds-core/mds-utils'

const version = 1.0

function getAnnotationData(gps: GpsData): AnnotationData {
  /*
    Calculates geography annotation data for each event processed
  */
  const areas = findServiceAreas(gps.lng, gps.lat)
  const in_bound = areas.length > 0
  const annotation: AnnotationData = { in_bound, areas }
  return annotation
}

function getAnnotationVersion(): number {
  /*
    Returns version number of annotation processor to hold a record
    if backprocessing is needed
  */
  return version
}

export { getAnnotationData, getAnnotationVersion }
