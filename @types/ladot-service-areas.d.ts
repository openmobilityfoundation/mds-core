declare module 'ladot-service-areas' {
  import { Geometry, MultiPolygon } from 'geojson'

  export interface ServiceArea {
    start_date: number
    end_date: number | null
    prev_area: string | null
    replacement_area: string | null
    type: string
    description: string
    area: MultiPolygon
  }

  export const serviceAreaMap: { [key: string]: ServiceArea }

  export function readServiceAreas(provider_id?: string, service_area_id?: string): ServiceArea[]
}
