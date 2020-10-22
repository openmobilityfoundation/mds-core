declare module 'geojson-validation' {
  function valid(geoJSONObject: unknown, trace: true): string[]
  function valid(geoJSONObject: unknown, trace: false = false): boolean
}