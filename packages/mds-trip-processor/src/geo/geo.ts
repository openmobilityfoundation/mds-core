let service_areas = require("./service-areas")
let turf_main = require("@turf/helpers")
let turf = require("@turf/boolean-point-in-polygon")

const log = require("loglevel")

let district_areas = Array()
for (let index in service_areas["features"]) {
  let district_uuid =
    service_areas["features"][index]["properties"]["dist_uuid"]
  let area = service_areas["features"][index]["geometry"]["coordinates"]
  // still servicing
  district_areas[district_uuid] = service_areas["features"][index] // turf_main.polygon(area[0]));
}

let findServiceAreas = function(lng: any, lat: any) {
  let areas = []
  let turf_pt = turf_main.point([lng, lat])
  for (let key in district_areas) {
    if (turf.default(turf_pt, district_areas[key])) {
      areas.push({ id: key, type: "district" })
    }
  }
  return areas
}

let moved = function(first_data: any, second_data: any) {
  let limit = 0.00001 // arbitrary amount
  let lat_diff = Math.abs(first_data.latitude - second_data.latitude)
  let lng_diff = Math.abs(first_data.longitude - second_data.longitude)
  return lng_diff > limit || lat_diff > limit // very computational efficient basic check (better than sqrts & trig)
}

// Helper funtion to calculate distance between two points given latitudes and longitudes
// Unit is default miles but can be expressed in kilometers given the value 'K'
function gpsDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  unit: string
) {
  if (lat1 === lat2 && lon1 === lon2) {
    return 0
  } else {
    let radlat1 = (Math.PI * lat1) / 180
    let radlat2 = (Math.PI * lat2) / 180
    let theta = lon1 - lon2
    let radtheta = (Math.PI * theta) / 180
    let dist =
      Math.sin(radlat1) * Math.sin(radlat2) +
      Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta)
    if (dist > 1) {
      dist = 1
    }
    dist = Math.acos(dist)
    dist = (dist * 180) / Math.PI
    dist = dist * 60 * 1.1515
    if (unit === "K") {
      dist = dist * 1.609344
    }
    return dist
  }
}

let calcDistance = function(telemetry: any, start_gps: any) {
  let temp_x = start_gps.lat
  let temp_y = start_gps.lng
  let distance = 0
  let points = new Array()
  for (let n in telemetry) {
    for (let m in telemetry[n]) {
      let curr_ping = telemetry[n][m]
      let point_dist = gpsDistance(
        curr_ping.latitude,
        curr_ping.longitude,
        temp_x,
        temp_y,
        "M"
      )
      distance += point_dist
      points.push(point_dist)
      temp_x = curr_ping.latitude
      temp_y = curr_ping.longitude
    }
  }
  return { totalDist: distance, points: points }
}

export { findServiceAreas, moved, calcDistance }
