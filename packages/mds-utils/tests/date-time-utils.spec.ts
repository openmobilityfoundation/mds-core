import assert from 'assert'
// import Sinon from 'sinon'
import moment from 'moment-timezone'
import Sinon from 'sinon'
import * as dt from '../date-time-utils'

describe('Date/time API utils', () => {
  describe('parses operators', () => {
    it('Gets the operator', () => {
      assert.strictEqual(dt.parseOperator('+5d'), '+')
      assert.strictEqual(dt.parseOperator('-49d'), '-')
      assert.strictEqual(dt.parseOperator('today'), '+')
      assert.strictEqual(dt.parseOperator('yesterday'), '+')
      assert.strictEqual(dt.parseOperator('now'), '+')
    })

    it('Rejects malformed strings', () => {
      assert.throws(() => dt.parseOperator('bad-offset'))
    })
  })

  describe('parses counts', () => {
    it('parses counts', () => {
      assert.strictEqual(dt.parseCount('+5d'), 5)
      assert.strictEqual(dt.parseCount('-49d'), 49)
      assert.strictEqual(dt.parseCount('today'), 0)
      assert.strictEqual(dt.parseCount('yesterday'), 1)
      assert.strictEqual(dt.parseCount('now'), 0)
    })

    it('Rejects malformed strings', () => {
      assert.throws(() => dt.parseCount('bad-offset'))
    })
  })

  describe('parses units', () => {
    it('parses units', () => {
      assert.strictEqual(dt.parseUnit('+5d'), 'days')
      assert.strictEqual(dt.parseUnit('-49d'), 'days')
      assert.strictEqual(dt.parseUnit('-49h'), 'hours')
      assert.strictEqual(dt.parseUnit('today'), 'days')
      assert.strictEqual(dt.parseUnit('yesterday'), 'days')
      assert.strictEqual(dt.parseUnit('now'), 'days')
    })

    it('Rejects malformed strings', () => {
      assert.throws(() => dt.parseUnit('bad-offset'))
    })
  })

  describe('parses is relative', () => {
    it('parses is relative', () => {
      assert.strictEqual(dt.parseIsRelative('+5d'), true)
      assert.strictEqual(dt.parseIsRelative('-49d'), true)
      assert.strictEqual(dt.parseIsRelative('-49h'), true)
      assert.strictEqual(dt.parseIsRelative('today'), false)
      assert.strictEqual(dt.parseIsRelative('yesterday'), false)
      assert.strictEqual(dt.parseIsRelative('now'), false)
    })
  })

  describe('parses relative dates', () => {
    it('parses -7d/yesterday', () => {
      Sinon.replace(dt, 'getLocalTime', Sinon.fake.returns(moment('2020-01-15').clone()))
      const result = dt.parseRelative('-7d', 'yesterday')
      assert.deepStrictEqual(result, {
        start_time: moment('2020-01-15').clone().subtract(8, 'd').valueOf(),
        end_time: moment('2020-01-15').clone().subtract(1, 'd').valueOf()
      })
      Sinon.restore()
    })
  })
})
