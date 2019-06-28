import { any } from "@hapi/joi";

declare module 'ladot-service-areas' {
  export const serviceAreaMap: {[key: string]: any}
  export function readServiceAreas(provider_id?: string, service_area_id?: string): any
}