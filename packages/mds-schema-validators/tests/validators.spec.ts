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

import { uuid } from '@mds-core/mds-utils'
import { AUDIT_EVENT_TYPES, VEHICLE_EVENTS } from '@mds-core/mds-types'
import { providers } from '@mds-core/mds-providers' // map of uuids -> obj
import {
  isValidAuditTripId,
  isValidVehicleEventType,
  isValidTelemetry,
  isValidDeviceId,
  isValidAuditDeviceId,
  isValidAuditEventId,
  isValidProviderVehicleId,
  isValidProviderId,
  isValidTimestamp,
  isValidAuditEventType,
  isValidAuditIssueCode,
  isValidAuditNote,
  isValidNumber,
  ValidationError,
  validateEvent
} from '../validators'

describe('Tests validators', () => {
  it('verified Number validator', async () => {
    await expect(async () => isValidNumber(undefined)).rejects.toThrow(ValidationError)

    await expect(async () => isValidNumber(null)).rejects.toThrow(ValidationError)

    await expect(async () => isValidNumber('invalid')).rejects.toThrow(ValidationError)

    await expect(async () => isValidNumber(0, { min: 1, max: 1 })).rejects.toThrow(ValidationError)

    await expect(async () => isValidNumber(2, { min: 1, max: 1 })).rejects.toThrow(ValidationError)

    await expect(async () => isValidNumber(-1, { min: 0, max: 1 })).rejects.toThrow(ValidationError)

    await expect(async () => isValidNumber(1, { min: -1, max: 0 })).rejects.toThrow(ValidationError)

    expect(isValidNumber(1, { min: 1, max: 1 })).toBe(true)

    expect(isValidNumber(undefined, { assert: false })).toBe(false)

    expect(isValidNumber(undefined, { assert: false, required: false })).toBe(true)
  })

  it('verifies Audit Trip ID validator', async () => {
    await expect(async () => isValidAuditTripId(undefined)).rejects.toThrow(ValidationError)

    await expect(async () => isValidAuditTripId(null)).rejects.toThrow(ValidationError)

    expect(isValidAuditTripId('invalid', { assert: false })).toBe(false)

    expect(isValidAuditTripId(uuid())).toBe(true)
  })

  it('verifies Audit Event Type validator', async () => {
    await expect(async () => isValidAuditEventType(undefined)).rejects.toThrow(ValidationError)

    await expect(async () => isValidAuditEventType(null)).rejects.toThrow(ValidationError)

    await expect(async () => isValidAuditEventType('invalid')).rejects.toThrow(ValidationError)

    expect(isValidAuditEventType(AUDIT_EVENT_TYPES.start, { accept: [AUDIT_EVENT_TYPES.end], assert: false })).toBe(
      false
    )

    expect(isValidAuditEventType(AUDIT_EVENT_TYPES.start)).toBe(true)
  })

  it('verifies Timestamp validator', async () => {
    await expect(async () => isValidTimestamp(undefined)).rejects.toThrow(ValidationError)

    await expect(async () => isValidTimestamp(null)).rejects.toThrow(ValidationError)

    await expect(async () => isValidTimestamp(1)).rejects.toThrow(ValidationError)

    expect(isValidTimestamp('123', { assert: false })).toBe(false)

    expect(isValidTimestamp('1567695019935', { assert: false })).toBe(false)

    expect(isValidTimestamp(Date.now())).toBe(true)
  })

  it('verifies Provider ID validator', async () => {
    await expect(async () => isValidProviderId(undefined)).rejects.toThrow(ValidationError)

    await expect(async () => isValidProviderId(null)).rejects.toThrow(ValidationError)

    await expect(async () => isValidProviderId(uuid())).rejects.toThrow(ValidationError)

    expect(isValidProviderId('invalid', { assert: false })).toBe(false)

    expect(isValidProviderId(Object.keys(providers)[0])).toBe(true)
  })

  it('verifies Device ID validator', async () => {
    await expect(async () => isValidDeviceId(undefined)).rejects.toThrow(ValidationError)

    await expect(async () => isValidDeviceId(null)).rejects.toThrow(ValidationError)

    expect(isValidDeviceId('invalid', { assert: false })).toBe(false)

    expect(isValidDeviceId(uuid())).toBe(true)
  })

  it('verifies Vehicle ID validator', async () => {
    await expect(async () => isValidProviderVehicleId(undefined)).rejects.toThrow(ValidationError)

    await expect(async () => isValidProviderVehicleId(null)).rejects.toThrow(ValidationError)

    await expect(async () => isValidProviderVehicleId(3)).rejects.toThrow(ValidationError)

    expect(isValidProviderVehicleId('V'.repeat(256), { assert: false })).toBe(false)

    expect(isValidProviderVehicleId('provider-vehicle-id')).toBe(true)
  })

  it('verifies Audit Event ID validator', async () => {
    await expect(async () => isValidAuditEventId(undefined)).rejects.toThrow(ValidationError)

    await expect(async () => isValidAuditEventId(null)).rejects.toThrow(ValidationError)

    expect(isValidAuditEventId('invalid', { assert: false })).toBe(false)

    expect(isValidAuditEventId(uuid())).toBe(true)
  })

  it('verifies Audit Device ID validator', async () => {
    await expect(async () => isValidAuditDeviceId(undefined)).rejects.toThrow(ValidationError)

    await expect(async () => isValidAuditDeviceId(null)).rejects.toThrow(ValidationError)

    expect(isValidAuditDeviceId('invalid', { assert: false })).toBe(false)

    expect(isValidAuditDeviceId(uuid())).toBe(true)
  })

  it('verifies Telemetry validator', async () => {
    await expect(async () => isValidTelemetry(undefined)).rejects.toThrow(ValidationError)

    await expect(async () => isValidTelemetry(null)).rejects.toThrow(ValidationError)

    await expect(async () => isValidTelemetry('')).rejects.toThrow(ValidationError)

    await expect(async () => isValidTelemetry({ timestamp: Date.now() })).rejects.toThrow(ValidationError)

    await expect(async () => isValidTelemetry({ timestamp: Date.now(), gps: '' })).rejects.toThrow(ValidationError)

    await expect(async () => isValidTelemetry({ timestamp: Date.now(), gps: {} })).rejects.toThrow(ValidationError)

    await expect(async () =>
      isValidTelemetry({ timestamp: Date.now(), gps: { lat: null, lng: null } })
    ).rejects.toThrow(ValidationError)

    await expect(async () => isValidTelemetry({ timestamp: Date.now(), gps: { lat: -200, lng: 0 } })).rejects.toThrow(
      ValidationError
    )

    await expect(async () => isValidTelemetry({ timestamp: Date.now(), gps: { lat: 200, lng: 0 } })).rejects.toThrow(
      ValidationError
    )

    await expect(async () => isValidTelemetry({ timestamp: Date.now(), gps: { lat: 0, lng: 200 } })).rejects.toThrow(
      ValidationError
    )

    await expect(async () => isValidTelemetry({ timestamp: Date.now(), gps: { lat: 0, lng: -200 } })).rejects.toThrow(
      ValidationError
    )

    expect(isValidTelemetry({ gps: { lat: 0, lng: 0 } }, { assert: false })).toBe(false)

    await expect(async () => isValidTelemetry({ timestamp: Date.now(), gps: { lat: '0', lng: 0 } })).rejects.toThrow(
      ValidationError
    )

    await expect(async () => isValidTelemetry({ timestamp: Date.now(), gps: { lat: 0, lng: '0' } })).rejects.toThrow(
      ValidationError
    )

    await expect(async () =>
      isValidTelemetry({ timestamp: Date.now(), gps: { lat: 0, lng: 0, speed: '0' } })
    ).rejects.toThrow(ValidationError)

    await expect(async () =>
      isValidTelemetry({ timestamp: Date.now(), gps: { lat: 0, lng: 0, heading: '0' } })
    ).rejects.toThrow(ValidationError)

    await expect(async () =>
      isValidTelemetry({ timestamp: Date.now(), gps: { lat: 0, lng: 0, accuracy: '0' } })
    ).rejects.toThrow(ValidationError)

    await expect(async () =>
      isValidTelemetry({ timestamp: Date.now(), gps: { lat: 0, lng: 0, altitude: '0' } })
    ).rejects.toThrow(ValidationError)

    await expect(async () =>
      isValidTelemetry({ timestamp: Date.now(), gps: { lat: 0, lng: 0 }, charge: '0' })
    ).rejects.toThrow(ValidationError)

    expect(isValidTelemetry({ timestamp: Date.now(), gps: { lat: 0, lng: 0 } })).toBe(true)

    expect(isValidTelemetry(undefined, { assert: false })).toBe(false)

    expect(isValidTelemetry(undefined, { assert: false, required: false })).toBe(true)
  })

  it('verifies Vehicle Event Type validator', async () => {
    await expect(async () => isValidVehicleEventType(undefined)).rejects.toThrow(ValidationError)

    await expect(async () => isValidVehicleEventType(null)).rejects.toThrow(ValidationError)

    await expect(async () => isValidVehicleEventType('invalid')).rejects.toThrow(ValidationError)

    expect(isValidVehicleEventType(AUDIT_EVENT_TYPES.telemetry, { assert: false })).toBe(false)

    expect(isValidVehicleEventType(VEHICLE_EVENTS.trip_end)).toBe(true)
  })

  it('verifies Vehicle Event validator', async () => {
    const DEREGISTER_EVENT_TYPE_REASONS = ['missing', 'decomissioned']
    const PROVIDER_PICK_UP_EVENT_TYPE_REASONS = ['rebalance', 'maintenance', 'charge', 'compliance']
    const SERVICE_END_EVENT_TYPE_REASONS = ['low_battery', 'maintenance', 'compliance', 'off_hours']

    await expect(async () => validateEvent(undefined)).rejects.toThrow(ValidationError)

    await expect(async () => validateEvent(null)).rejects.toThrow(ValidationError)

    await expect(async () => validateEvent('invalid')).rejects.toThrow(ValidationError)

    await expect(async () =>
      validateEvent({
        device_id: '395144fb-ebef-4842-ba91-b5ba98d34945',
        provider_id: 'b54c08c7-884a-4c5f-b9ed-2c7dc24638cb',
        event_type: 'deregister',
        telemetry: { timestamp: Date.now(), gps: { lat: 0, lng: 0 } },
        timestamp: Date.now()
      })
    ).rejects.toThrow(ValidationError)

    await expect(async () =>
      validateEvent({
        device_id: '395144fb-ebef-4842-ba91-b5ba98d34945',
        provider_id: 'b54c08c7-884a-4c5f-b9ed-2c7dc24638cb',
        event_type: 'provider_pick_up',
        telemetry: { timestamp: Date.now(), gps: { lat: 0, lng: 0 } },
        timestamp: Date.now()
      })
    ).rejects.toThrow(ValidationError)

    await expect(async () =>
      validateEvent({
        device_id: '395144fb-ebef-4842-ba91-b5ba98d34945',
        provider_id: 'b54c08c7-884a-4c5f-b9ed-2c7dc24638cb',
        event_type: 'service_end',
        telemetry: { timestamp: Date.now(), gps: { lat: 0, lng: 0 } },
        timestamp: Date.now()
      })
    ).rejects.toThrow(ValidationError)

    DEREGISTER_EVENT_TYPE_REASONS.forEach(event_type_reason => {
      expect(
        validateEvent({
          device_id: '395144fb-ebef-4842-ba91-b5ba98d34945',
          provider_id: 'b54c08c7-884a-4c5f-b9ed-2c7dc24638cb',
          event_type: 'deregister',
          event_type_reason,
          telemetry: { timestamp: Date.now(), gps: { lat: 0, lng: 0 } },
          timestamp: Date.now()
        })
      ).toBe(true)
    })

    PROVIDER_PICK_UP_EVENT_TYPE_REASONS.forEach(event_type_reason => {
      expect(
        validateEvent({
          device_id: '395144fb-ebef-4842-ba91-b5ba98d34945',
          provider_id: 'b54c08c7-884a-4c5f-b9ed-2c7dc24638cb',
          event_type: 'provider_pick_up',
          event_type_reason,
          telemetry: { timestamp: Date.now(), gps: { lat: 0, lng: 0 } },
          timestamp: Date.now()
        })
      ).toBe(true)
    })

    SERVICE_END_EVENT_TYPE_REASONS.forEach(event_type_reason => {
      expect(
        validateEvent({
          device_id: '395144fb-ebef-4842-ba91-b5ba98d34945',
          provider_id: 'b54c08c7-884a-4c5f-b9ed-2c7dc24638cb',
          event_type: 'service_end',
          event_type_reason,
          telemetry: { timestamp: Date.now(), gps: { lat: 0, lng: 0 } },
          timestamp: Date.now()
        })
      ).toBe(true)
    })
  })

  it('verifies Audit Issue Code validator', async () => {
    await expect(async () => isValidAuditIssueCode(undefined)).rejects.toThrow(ValidationError)

    await expect(async () => isValidAuditIssueCode('')).rejects.toThrow(ValidationError)

    await expect(async () => isValidAuditIssueCode(null)).rejects.toThrow(ValidationError)

    await expect(async () => isValidAuditIssueCode(3)).rejects.toThrow(ValidationError)

    expect(isValidAuditIssueCode('V'.repeat(32), { assert: false })).toBe(false)

    expect(isValidAuditIssueCode('provider-vehicle-id')).toBe(true)

    expect(isValidAuditIssueCode(undefined, { assert: false, required: false })).toBe(true)
  })

  it('verifies Audit Note validator', async () => {
    await expect(async () => isValidAuditNote(undefined)).rejects.toThrow(ValidationError)

    await expect(async () => isValidAuditNote('')).rejects.toThrow(ValidationError)

    await expect(async () => isValidAuditNote(null)).rejects.toThrow(ValidationError)

    await expect(async () => isValidAuditNote(3)).rejects.toThrow(ValidationError)

    expect(isValidAuditNote('V'.repeat(256), { assert: false })).toBe(false)

    expect(isValidAuditNote('provider-vehicle-id')).toBe(true)

    expect(isValidAuditNote(undefined, { assert: false, required: false })).toBe(true)
  })
})
