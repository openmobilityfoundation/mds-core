import { Device, Telemetry, UUID, VehicleEvent } from '@mds-core/mds-types'

import { ComplianceSnapshotDomainModel } from '@mds-core/mds-compliance-service'

export type VehicleEventWithTelemetry = VehicleEvent & { telemetry: Telemetry }
export type MatchedVehicleWithRule = { [d: string]: { device: Device; rule_applied?: UUID; rules_matched?: UUID[] } }

export type ComplianceEngineResult = Pick<
  ComplianceSnapshotDomainModel,
  'vehicles_found' | 'excess_vehicles_count' | 'total_violations'
>
