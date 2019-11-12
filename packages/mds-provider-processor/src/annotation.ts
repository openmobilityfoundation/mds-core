import { findServiceAreas } from './geo/geo'

let version = 1
/* This function is called on each event processed. It calculates the annotation data and
 * returns it. To be used with mds geography related things.
 */
function getAnnotationData(gps: any) {
  let areas = findServiceAreas(gps.lng, gps.lat)
  let in_bound = areas.length > 0
  return {
    geo: {
      in_bound,
      areas
    }
  }
}

/* This function keeps track of the version of annotation, in case it gets updated in the future, and we need to backprocess.
 *
 */
function getAnnotationVersion() {
  return version
}

export { getAnnotationData, getAnnotationVersion }
