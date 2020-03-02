import db from '@mds-core/mds-db'
import { MetricsTableRow, UUID, Timestamp, VEHICLE_TYPE } from '@mds-core/mds-types'
import { now } from '@mds-core/mds-utils'
import metric from './metrics'
import { getConfig } from './configuration'

/*
    Provider processor that runs inside a Kubernetes pod, activated via cron job.
    Aggregates trips/event data at a set interval. Provider cache is cleaned as data
    is processed.

    The following postgres tables are updated as data is processed:

        REPORTS_PROVIDERS:
          PRIMARY KEY = (provider_id, timestamp, vehicle_type)
          VALUES = MetricsTableRow
*/

async function processProvider(providerID: UUID, curTime: Timestamp) {
  /*
    Add provider metadata into PG database.
    These metrics should be computed here on an interval basis rather than being event triggered.
  */
  /*
  TODO: add providerMap back when streaming logic is added back to proc-event
  const providersMap = await cache.hgetall('provider:state')
  const providerData: ProviderStreamData = providersMap ? providersMap[providerID] : null
  */

  const binStart = curTime - 3600000
  const binStartYesterday = binStart - 86400000
  const binEndYesterday = curTime - 86400000
  const config = await getConfig()
  await Promise.all(
    config.organization.vehicleTypes.map(async vehicleType => {
      const provider_data: MetricsTableRow = {
        recorded: curTime,
        start_time: binStart,
        bin_size: 'hour',
        geography: null,
        provider_id: providerID,
        vehicle_type: vehicleType as VEHICLE_TYPE,
        event_counts: await metric.calcEventCounts(providerID, vehicleType as VEHICLE_TYPE, binStart, curTime),
        vehicle_counts: await metric.calcVehicleCounts(providerID, vehicleType as VEHICLE_TYPE),
        trip_count: await metric.calcTripCount(providerID, vehicleType as VEHICLE_TYPE, binStart, curTime),
        vehicle_trips_count: await metric.calcVehicleTripCount(
          providerID,
          vehicleType as VEHICLE_TYPE,
          binStart,
          curTime
        ),
        event_time_violations: await metric.calcLateEventCount(
          providerID,
          vehicleType as VEHICLE_TYPE,
          binStart,
          curTime
        ),
        telemetry_distance_violations: await metric.calcTelemDistViolationCount(
          providerID,
          vehicleType as VEHICLE_TYPE,
          binStartYesterday,
          binEndYesterday
        ),
        bad_events: {
          invalid_count: null, // providerData ? providerData.invalidEvents.length : null,
          duplicate_count: null, // providerData ? providerData.duplicateEvents.length : null,
          out_of_order_count: null // providerData ? providerData.outOfOrderEvents.length : null
        },
        sla: {
          max_vehicle_cap: config.compliance_sla.cap_count[providerID],
          min_registered: config.compliance_sla.min_registered,
          min_trip_start_count: config.compliance_sla.min_trip_start_count,
          min_trip_end_count: config.compliance_sla.min_trip_end_count,
          min_telemetry_count: config.compliance_sla.min_telemetry_count,
          max_start_end_time: config.compliance_sla.max_start_end_time,
          max_enter_leave_time: config.compliance_sla.max_enter_leave_time,
          max_telemetry_time: config.compliance_sla.max_telemetry_time,
          max_telemetry_distance: config.compliance_sla.max_telemetry_distance
        }
      }
      await db.insertMetrics(provider_data)
    })
  )
}

export async function providerProcessor() {
  const { providers } = await getConfig()
  const curTime = now()
  await Promise.all(providers.map(provider => processProvider(provider.provider_id, curTime)))
}
