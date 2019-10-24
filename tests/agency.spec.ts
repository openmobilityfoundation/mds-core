import requestPromise from 'request-promise'
import assert from 'assert'
import { getAuthToken } from './get-auth-token'
import { gitHash, gitBranch, nodeVersion, packageVersion, isIsoDate } from './environment'

describe('Agency', function() {
  it('successfully initializes', async function() {
    const res = await requestPromise({
      url: 'http://localhost/agency',
      auth: {
        bearer: getAuthToken('', {
          scope: "admin:all test:all"
        }, '')
      },
      method: 'GET',
      json: true,
      resolveWithFullResponse: true
    })
    assert.strictEqual(res.statusCode, 200)
    assert.strictEqual(res.headers['content-type'], 'application/json; charset=utf-8')
    assert.strictEqual(res.headers['server'], 'istio-envoy')
    assert.strictEqual(res.body.name, "@container-images/mds-agency")
    // fixme: get package version from env
    // assert.strictEqual(res.body.version, packageVersion())
    assert.strictEqual(isIsoDate(res.body.build.date), true)
    assert.strictEqual(res.body.build.branch, gitBranch())
    assert.strictEqual(res.body.build.commit, gitHash())
    assert.strictEqual(`v${res.body.node}`, nodeVersion())
    assert.strictEqual(res.body.status, "Running")
  })
})
