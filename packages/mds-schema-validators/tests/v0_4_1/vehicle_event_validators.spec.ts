import test from 'unit.js'
import { validateEvent_v0_4_1 } from '../../v0_4_1'
import { ValidationError } from '../../validators'

describe('Tests validators', () => {
  it('verifies v0.4.1 Vehicle Event validator', done => {
    const DEREGISTER_EVENT_TYPE_REASONS = ['missing', 'decommissioned']
    const PROVIDER_PICK_UP_EVENT_TYPE_REASONS = ['rebalance', 'maintenance', 'charge', 'compliance']
    const SERVICE_END_EVENT_TYPE_REASONS = ['low_battery', 'maintenance', 'compliance', 'off_hours']

    test.assert.throws(() => validateEvent_v0_4_1(undefined), ValidationError)
    test.assert.throws(() => validateEvent_v0_4_1(null), ValidationError)
    test.assert.throws(() => validateEvent_v0_4_1('invalid'), ValidationError)
    test.assert.throws(
      () =>
        validateEvent_v0_4_1({
          device_id: '395144fb-ebef-4842-ba91-b5ba98d34945',
          provider_id: 'b54c08c7-884a-4c5f-b9ed-2c7dc24638cb',
          event_type: 'decommissioned',
          telemetry: { timestamp: Date.now(), gps: { lat: 0, lng: 0 } },
          timestamp: Date.now()
        }),
      ValidationError
    )
    test.assert.throws(
      () =>
        validateEvent_v0_4_1({
          device_id: '395144fb-ebef-4842-ba91-b5ba98d34945',
          provider_id: 'b54c08c7-884a-4c5f-b9ed-2c7dc24638cb',
          event_type: 'provider_pick_up',
          telemetry: { timestamp: Date.now(), gps: { lat: 0, lng: 0 } },
          timestamp: Date.now()
        }),
      ValidationError
    )
    test.assert.throws(
      () =>
        validateEvent_v0_4_1({
          device_id: '395144fb-ebef-4842-ba91-b5ba98d34945',
          provider_id: 'b54c08c7-884a-4c5f-b9ed-2c7dc24638cb',
          event_type: 'service_end',
          telemetry: { timestamp: Date.now(), gps: { lat: 0, lng: 0 } },
          timestamp: Date.now()
        }),
      ValidationError
    )

    DEREGISTER_EVENT_TYPE_REASONS.forEach(event_type_reason => {
      test
        .value(
          validateEvent_v0_4_1({
            device_id: '395144fb-ebef-4842-ba91-b5ba98d34945',
            provider_id: 'b54c08c7-884a-4c5f-b9ed-2c7dc24638cb',
            event_type: 'deregister',
            event_type_reason,
            telemetry: { timestamp: Date.now(), gps: { lat: 0, lng: 0 } },
            timestamp: Date.now()
          })
        )
        .is(true)
    })

    PROVIDER_PICK_UP_EVENT_TYPE_REASONS.forEach(event_type_reason => {
      test
        .value(
          validateEvent_v0_4_1({
            device_id: '395144fb-ebef-4842-ba91-b5ba98d34945',
            provider_id: 'b54c08c7-884a-4c5f-b9ed-2c7dc24638cb',
            event_type: 'provider_pick_up',
            event_type_reason,
            telemetry: { timestamp: Date.now(), gps: { lat: 0, lng: 0 } },
            timestamp: Date.now()
          })
        )
        .is(true)
    })

    SERVICE_END_EVENT_TYPE_REASONS.forEach(event_type_reason => {
      test
        .value(
          validateEvent_v0_4_1({
            device_id: '395144fb-ebef-4842-ba91-b5ba98d34945',
            provider_id: 'b54c08c7-884a-4c5f-b9ed-2c7dc24638cb',
            event_type: 'service_end',
            event_type_reason,
            telemetry: { timestamp: Date.now(), gps: { lat: 0, lng: 0 } },
            timestamp: Date.now()
          })
        )
        .is(true)
    })
    done()
  })
})
