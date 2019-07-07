import * as assert from 'assert'
import { decrypt } from '../index'

describe('Test AWS utils', () => {
  it('can decrypt cipher text', async () => {
    const plainText = await decrypt(
      'AQICAHhAYaddUZOibOvj/rRTUvSdxqwlaiZHvOM4i7XV4DEr5wFz' +
        'KI17osSCxRlGVxdSWP8/AAAAZjBkBgkqhkiG9w0BBwagVzBVAgEA' +
        'MFAGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMt31oGEx/Hh78' +
        'ky9YAgEQgCMbMNiEQgOFEM66S5GncBdexWG+jCVgY48oAMSZe051dfeVvg=='
    )
    assert.deepEqual(plainText, 'password')
  })
})
