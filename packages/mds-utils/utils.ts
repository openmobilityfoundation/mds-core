/**
 * Copyright 2019 City of Los Angeles
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

// utility functions

import circleToPolygon from 'circle-to-polygon'
import pointInPoly from 'point-in-polygon'
import {
  UUID,
  Timestamp,
  VehicleEvent,
  Telemetry,
  BoundingBox,
  Geography,
  Rule,
  EVENT_STATUS_MAP,
  VEHICLE_STATUS,
  BBox,
  VEHICLE_EVENT,
  SingleOrArray
} from '@mds-core/mds-types'
import logger from '@mds-core/mds-logger'
import { MultiPolygon, Polygon, FeatureCollection, Geometry, Feature } from 'geojson'

import { isArray, isString } from 'util'
import { getNextState } from './state-machine'
import { parseRelative, getCurrentDate } from './date-time-utils'

const RADIUS = 30.48 // 100 feet, in meters
const NUMBER_OF_EDGES = 32 // Number of edges to add, geojson doesn't support real circles
const UUID_REGEX = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/

function isUUID(s: unknown): s is UUID {
  if (typeof s !== 'string') {
    return false
  }
  return UUID_REGEX.test(s)
}

function round(value: string | number, decimals: number) {
  return Number(
    `${Math.round(Number(`${typeof value !== 'number' ? parseFloat(value) : value}e${decimals}`))}e-${decimals}`
  )
}

function isPct(val: unknown): val is number {
  if (typeof val !== 'number') {
    return false
  }
  return val >= 0 && val <= 1
}

// this is a real-time API, so timestamps should be now +/- some factor, let's start with 24h
function isTimestamp(val: unknown): val is Timestamp {
  if (typeof val !== 'number') {
    logger.info('timestamp not an number')
    return false
  }
  if (val < 1420099200000) {
    logger.info('timestamp is prior to 1/1/2015; this is almost certainly seconds, not milliseconds')
    return false
  }
  return true
}

function seconds(n: number) {
  if (typeof n !== 'number') {
    throw new Error('timespan must be a number')
  }
  return n * 1000
}

function minutes(n: number) {
  return seconds(n) * 60
}

function hours(n: number) {
  return minutes(n) * 60
}

function days(n: number) {
  return hours(n) * 24
}

export const RULE_UNIT_MAP = {
  minutes: minutes(1),
  hours: hours(1)
}

// Based on a bin size (in ms), calculate the start/end of
// the frame containing the timestamp.
function timeframe(size: Timestamp, timestamp: Timestamp) {
  const start_time = timestamp - (timestamp % size)
  return { start_time, end_time: start_time + size - 1 }
}

/**
 * @param  {number} minimum
 * @param  {number} maximum
 * @return {number} random value in minimum...maximum
 */
function rangeRandom(min: number, max: number) {
  if (typeof min !== 'number' || typeof max !== 'number') {
    throw new Error(`rangeRandom: min, max must be numbers, not ${min}, ${max}`)
  }
  return min + (max - min) * Math.random()
}

/**
 * @param  {number} minimum
 * @param  {number} maximum
 * @return {number} random value in minimum...maximum
 */
function rangeRandomInt(min: number, max?: number) {
  if (max === undefined) {
    return Math.floor(rangeRandom(0, min))
  }
  return Math.floor(rangeRandom(min, max))
}

function randomElement<T>(list: T[]) {
  return list[rangeRandomInt(list.length)]
}

function head<T>(list: T[]) {
  if (!Array.isArray(list)) {
    throw new Error('not a list')
  }
  return list[0]
}

function tail<T>(list: T[]) {
  if (!Array.isArray(list)) {
    throw new Error('not a list')
  }
  return list[list.length - 1]
}

/**
 * @param  {MultiPolygon}
 * @return {bbox}
 */
function calcBBox(geometry: Geometry): BBox {
  // log.debug('calcBBox', geometry.type)
  let latMin = 10000
  let latMax = -10000
  let lngMin = 10000
  let lngMax = -10000

  function expand(poly: number[][]) {
    if (!Array.isArray(poly)) {
      throw new Error('poly is not a list')
    }
    if (typeof poly[0][0] !== 'number' || typeof poly[0][1] !== 'number') {
      throw new Error('poly is not a list of [num,num]')
    }

    for (const pair of poly) {
      const [lng, lat] = pair
      if (latMin > lat) {
        latMin = lat
      }
      if (latMax < lat) {
        latMax = lat
      }
      if (lngMin > lng) {
        lngMin = lng
      }
      if (lngMax < lng) {
        lngMax = lng
      }
    }
  }

  let poly

  switch (geometry.type) {
    case 'Polygon':
      ;[poly] = geometry.coordinates
      expand(poly)
      break

    case 'MultiPolygon':
      {
        const coords = geometry.coordinates
        for (const polyWithHoles of coords) {
          ;[poly] = polyWithHoles
          expand(poly)
        }
      }
      break
    default:
      throw new Error(`calcBBox does not (yet) handle geometry of type ${geometry.type}`)
  }
  return {
    latMin,
    latMax,
    lngMin,
    lngMax
  }
}

function pointInPolyWithHoles(pt: [number, number], polyWithHoles: number[][][]): boolean {
  const poly = polyWithHoles[0]
  // log('testing', pt, 'in', poly, 'in', polyWithHoles)
  if (pointInPoly(pt, poly)) {
    // log('pt in poly')
    const holes = polyWithHoles.slice(1)
    for (const hole of holes) {
      if (pointInPoly(pt, hole)) {
        // log('pt in hole')
        return false
      }
    }
    // log('pt in poly but not holes')
    return true
  }
  // log('pt in none polys')
  return false
}

/**
 * @param  {Point or [number, number]}
 * @param  {MultiPolygon}
 * @return {true iff the point is somewhere in the list of polygons and not in the list of holes}
 */
function pointInMultiPolygon(pt: [number, number], multipoly: MultiPolygon): boolean {
  return multipoly.coordinates.some((polyWithHoles: number[][][]) => pointInPolyWithHoles(pt, polyWithHoles))
}

/**
 * @param  {Point or [number, number]}
 * @param  {Polygon}
 * @return {true iff the point is somewhere in the list of polygons and not in the list of holes}
 */
function pointInPolygon(pt: [number, number], poly: Polygon): boolean {
  return pointInPolyWithHoles(pt, poly.coordinates)
}

function pointInGeometry(pt: [number, number], shape: Geometry): boolean {
  if (shape.type === 'MultiPolygon') {
    return pointInMultiPolygon(pt, shape)
  }
  if (shape.type === 'Polygon') {
    return pointInPolygon(pt, shape)
  }
  if (shape.type === 'Point') {
    if (pointInPolygon(pt, circleToPolygon(shape.coordinates, RADIUS, NUMBER_OF_EDGES))) {
      return true
    }
    return false
  }
  throw new Error(`cannot check point in shape for type ${shape.type}`)
}

function pointInFeatureCollection(pt: [number, number], fc: FeatureCollection): boolean {
  return fc.features.some((feature: Feature) => pointInGeometry(pt, feature.geometry))
}

function pointInShape(
  pt: [number, number] | { lat: number; lng: number },
  shape: Geometry | FeatureCollection
): boolean {
  const point: [number, number] = Array.isArray(pt) ? pt : [pt.lng, pt.lat]
  if (shape.type === 'Point') {
    if (pointInPolygon(point, circleToPolygon(shape.coordinates, RADIUS, NUMBER_OF_EDGES))) {
      return true
    }
    return false
  }
  if (shape.type === 'MultiPolygon') {
    return pointInMultiPolygon(point, shape)
  }
  if (shape.type === 'Polygon') {
    return pointInPolygon(point, shape)
  }
  if (shape.type === 'FeatureCollection') {
    return pointInFeatureCollection(point, shape)
  }
  return pointInGeometry(point, shape)
}

/**
 * @param  {MultiPolygon}
 * @return {Point} random point within the MultiPolygon
 */
function makePointInShape(shape: Geometry): { lat: number; lng: number } {
  if (!shape) {
    throw new Error('no shape')
  }

  const shapeToCreate = shape.type === 'Point' ? circleToPolygon(shape.coordinates, RADIUS, NUMBER_OF_EDGES) : shape

  const bbox = calcBBox(shapeToCreate)
  let tries = 0
  while (tries < 1000) {
    const pt: [number, number] = [rangeRandom(bbox.lngMin, bbox.lngMax), rangeRandom(bbox.latMin, bbox.latMax)]
    if (pointInShape(pt, shapeToCreate)) {
      return {
        lng: pt[0],
        lat: pt[1]
      }
    }
    tries += 1
  }
  throw new Error('tried 1000 times to put a point in poly and failed')
}

/**
 * [rad description]
 * @param  {[type]} _deg [description]
 * @return {[type]}      [description]
 */
function rad(_deg: number): number {
  return (_deg * Math.PI) / 180
}

/**
 * [deg description]
 * @param  {[type]} _rad [description]
 * @return {[type]}      [description]
 */
function deg(_rad: number): number {
  return (_rad * 180) / Math.PI
}

/**
 * @param {Point}
 * @param {distance in meters}
 * @param {bearing in degrees}
 */
function addDistanceBearing<T extends { lat: number; lng: number }>(pt: T, distance: number, bearing: number) {
  // log('addDistanceBearing', pt, distance, bearing)
  if (Number.isNaN(distance)) {
    throw new Error('bad distance')
  }
  if (Number.isNaN(bearing)) {
    throw new Error('bad bearing')
  }
  const R = 6378100 // Radius of the Earth, in meters
  const B = rad(bearing)

  const lat1 = rad(pt.lat)
  const lng1 = rad(pt.lng)

  const xx = Math.sin(lat1) * Math.cos(distance / R) + Math.cos(lat1) * Math.sin(distance / R) * Math.cos(B)
  const lat2 = Math.asin(xx)

  const num = Math.sin(B) * Math.sin(distance / R) * Math.cos(lat1)
  const den = Math.cos(distance / R) - Math.sin(lat1) * Math.sin(lat2)
  const lng2 = lng1 + Math.atan2(num, den)

  return { ...pt, lat: deg(lat2), lng: deg(lng2) }
}

/**
 * [getRandomSubarray description]
 * @param  {[type]} array [description]
 * @param  {[type]} size  [description]
 * @return {[type]}       [description]
 */
function getRandomSubarray<T>(array: T[], size: number): T[] {
  const shuffled = array.slice()
  const min = array.length - size
  for (let i = array.length; i > min; i -= 1) {
    const index = Math.floor((i + 1) * Math.random())
    const temp = shuffled[index]
    shuffled[index] = shuffled[i]
    shuffled[i] = temp
  }
  return shuffled.slice(min)
}

/**
 * @param  {string describing a bounding box}
 * @return {bounding box}
 */
function parseBBox(bbox_str: string): { lngMin: number; lngMax: number; latMin: number; latMax: number } | null {
  // [sw point, ne point]
  // e.g. '[[-73.9876, 40.7661],[-73.9876, 40.7661]]'
  if (!bbox_str || typeof bbox_str !== 'string') {
    return null
  }
  const parts = bbox_str
    .replace(/[[\] ]+/g, '')
    .split(',')
    .map(parseFloat)
  if (parts.length !== 4) {
    return null
  }
  const [lng1, lat1, lng2, lat2] = parts
  return {
    lngMin: Math.min(lng1, lng2),
    lngMax: Math.max(lng1, lng2),
    latMin: Math.min(lat1, lat2),
    latMax: Math.max(lat1, lat2)
  }
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function nullKeys<T>(obj: { [key: string]: T }): string[] {
  return Object.keys(obj).filter(key => obj[key] === null || obj[key] === undefined)
}

function stripNulls<T extends {}>(obj: { [x: string]: unknown }): Partial<T> {
  return nullKeys(obj).reduce((stripped, key) => {
    const { [key]: nullkey, ...rest } = stripped
    return rest
  }, obj) as Partial<T>
}

function isFloat(n: unknown): boolean {
  return typeof n === 'number' || (typeof n === 'string' && !Number.isNaN(parseFloat(n)))
}

function now(): Timestamp {
  return Date.now()
}

// dumb subset of lodash range()
function range(n: number) {
  return [...Array(n).keys()]
}

function nonNegInt(val: string, def: number): number {
  if (def === undefined) {
    throw new Error('nonNegInt: no default value')
  }
  if (val === undefined) {
    return def
  }
  const parsed = parseInt(val)
  if (Number.isInteger(parsed) && parsed >= 0) {
    return parsed
  }

  throw new Error(`invalid nonNegInt "${val}"`)
}

function yesterday(): Timestamp {
  return Date.now() - days(1)
}

// shortcut for making a string form of comma-separated values
function csv<T>(list: T[] | Readonly<T[]>): string {
  return list.join(', ')
}

// utility for adding counts to maps
function inc(map: { [key: string]: number }, key: string) {
  return Object.assign(map, { [key]: map[key] ? map[key] + 1 : 1 })
}

function pathPrefix(path: string): string {
  const { PATH_PREFIX } = process.env
  return PATH_PREFIX ? `${PATH_PREFIX}${path}` : path
}

function isInsideBoundingBox(telemetry: Telemetry | undefined | null, bbox: BoundingBox): boolean {
  if (telemetry && telemetry.gps) {
    const { lat, lng } = telemetry.gps
    if (!lat || !lng) {
      return false
    }
    const [[lng1, lat1], [lng2, lat2]] = bbox
    const latMin = Math.min(lat1, lat2)
    const latMax = Math.max(lat1, lat2)
    const lngMin = Math.min(lng1, lng2)
    const lngMax = Math.max(lng1, lng2)
    return latMin <= lat && lat <= latMax && lngMin <= lng && lng <= lngMax
  }
  return false
}

function isStateTransitionValid(
  eventA: VehicleEvent & { event_type: VEHICLE_EVENT },
  eventB: VehicleEvent & { event_type: VEHICLE_EVENT }
) {
  const currState = EVENT_STATUS_MAP[eventA.event_type]
  const nextState = getNextState(currState, eventB.event_type)
  return nextState !== undefined
}

function getPolygon(geographies: Geography[], geography: string): Geometry | FeatureCollection {
  const res = geographies.find((location: Geography) => {
    return location.geography_id === geography
  })
  if (res === undefined) {
    throw new Error(`Geography ${geography} not found in ${geographies}!`)
  }
  return res.geography_json
}

function isInStatesOrEvents(rule: Rule, event: VehicleEvent): boolean {
  const status = rule.statuses ? rule.statuses[EVENT_STATUS_MAP[event.event_type] as VEHICLE_STATUS] : null
  return status !== null
    ? rule.statuses !== null &&
        Object.keys(rule.statuses).includes(EVENT_STATUS_MAP[event.event_type]) &&
        status !== undefined &&
        (status.length === 0 || (status as string[]).includes(event.event_type))
    : true
}

function routeDistance(coordinates: { lat: number; lng: number }[]): number {
  const R = 6371000 // Earth's mean radius in meters
  return (coordinates || [])
    .map(coordinate => [rad(coordinate.lat), rad(coordinate.lng)])
    .reduce((distance, point, index, points) => {
      if (index > 0) {
        const [lat1, lng1] = points[index - 1]
        const [lat2, lng2] = point
        const [dlat, dlng] = [lat2 - lat1, lng2 - lng1]
        const a = Math.sin(dlat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlng / 2) ** 2
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        const d = R * c
        return distance + d
      }
      return distance
    }, 0)
}

function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

type isDefinedOptions = Partial<{ warnOnEmpty: boolean }>

const isDefined = <T>(elem: T | undefined | null, options: isDefinedOptions = {}, index?: number): elem is T => {
  const { warnOnEmpty } = options
  if (elem !== undefined && elem !== null) {
    return true
  }
  if (warnOnEmpty) {
    logger.warn(`Encountered empty element at index: ${index}`)
  }
  return false
}

const filterDefined = (options: isDefinedOptions = {}) => <T>(
  value: T | undefined | null,
  index: number,
  array: (T | undefined | null)[]
): value is T => isDefined(value, options, index)

function moved(latA: number, lngA: number, latB: number, lngB: number) {
  const limit = 0.00001 // arbitrary amount
  const latDiff = Math.abs(latA - latB)
  const lngDiff = Math.abs(lngA - lngB)
  return lngDiff > limit || latDiff > limit // very computational efficient basic check (better than sqrts & trig)
}

function normalizeToArray<T>(elementToNormalize: T | T[] | undefined): T[] {
  if (elementToNormalize === undefined) {
    return []
  }
  if (isArray(elementToNormalize)) {
    return elementToNormalize
  }
  return [elementToNormalize]
}

const getEnvVar = <TProps extends { [name: string]: string }>(props: TProps): TProps =>
  Object.keys(props).reduce((env, key) => {
    return {
      ...env,
      [key]: process.env[key] || props[key]
    }
  }, {} as TProps)

export const isTArray = <T>(arr: unknown, isT: (t: unknown) => t is T): arr is T[] => {
  if (arr instanceof Array) {
    return arr.filter(t => isT(t)).length === arr.length
  }
  return false
}

export const isStringArray = (arr: unknown): arr is string[] => isTArray<string>(arr, isString)

const asArray = <T>(value: SingleOrArray<T>): T[] => (Array.isArray(value) ? value : [value])

const pluralize = (count: number, singular: string, plural: string) => (count === 1 ? singular : plural)

export {
  UUID_REGEX,
  isUUID,
  isPct,
  isTimestamp,
  rangeRandom,
  rangeRandomInt,
  randomElement,
  addDistanceBearing,
  pointInShape,
  makePointInShape,
  getRandomSubarray,
  round,
  parseBBox,
  capitalizeFirst,
  nullKeys,
  stripNulls,
  isFloat,
  now,
  range,
  nonNegInt,
  days,
  hours,
  minutes,
  seconds,
  timeframe,
  yesterday,
  csv,
  inc,
  pathPrefix,
  isInsideBoundingBox,
  head,
  tail,
  isStateTransitionValid,
  pointInGeometry,
  getPolygon,
  isInStatesOrEvents,
  routeDistance,
  clone,
  isDefined,
  moved,
  normalizeToArray,
  parseRelative,
  getCurrentDate,
  getEnvVar,
  asArray,
  pluralize,
  filterDefined
}
