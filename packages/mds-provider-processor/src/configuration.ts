import { ConfigurationManager } from '@mds-core/mds-config-service'
import { VEHICLE_TYPE, UUID } from '@mds-core/mds-types'

interface ProviderProcessorConfig {
  organization: {
    vehicleTypes: VEHICLE_TYPE[]
  }
  providers: {
    provider_name: string
    provider_id: UUID
  }[]
  compliance_sla: {
    cap_count: { [provider_id: string]: number }
    min_registered: number
    min_trip_start_count: number
    min_trip_end_count: number
    min_telemetry_count: number
    max_start_end_time: number
    max_enter_leave_time: number
    max_telemetry_time: number
    max_telemetry_distance: number
  }
}

const manager = ConfigurationManager<ProviderProcessorConfig>(['organization', 'providers', 'compliance_sla'])

export const getConfig = async () => manager.configuration()
