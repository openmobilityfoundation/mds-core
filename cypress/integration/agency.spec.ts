import requestPromise from 'request-promise'
import assert from 'assert'
import { execSync } from 'child_process'
import { getAuthToken } from './get-auth-token';

let environment = {
  commit: function() {
    return execSync('git rev-parse --short HEAD');
  },

  branch: function() {
    return execSync('git branch | grep \* | cut -d \' \' -f2');
  },

  node: function() {
    return execSync('node --version');
  }
}

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
    assert.strictEqual(res.headers['content-type'], 'application/json; charset=utf-8');
    assert.strictEqual(res.headers['server'], 'istio-envoy');
    assert.strictEqual(res.body.name, "@container-images/mds-agency");
    assert.strictEqual(res.body.version, "0.1.14")
    // expect(res.body.build.date).eq("2019-09-20T00:15:25.778Z");
    // expect(res.body.build.branch).eq(environment.branch());
    // expect(res.body.build.commit).eq("commit", environment.commit())
    assert.strictEqual(`v${res.body.node}`, environment.node().toString().trim());
    assert.strictEqual(res.body.status, "Running");
    // expect(res.body).to.deep.eq({"name":"@container-images/mds-agency","version":"0.1.9","build":{"date":"2019-09-20T00:15:25.778Z","branch":environment.branch(),"commit":environment.commit()},"node":environment.node(),"status":"Running"});
  })
})
