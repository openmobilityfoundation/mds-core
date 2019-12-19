/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable promise/prefer-await-to-callbacks */
/*
    Copyright 2019 City of Los Angeles.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

import supertest from 'supertest'
import test from 'unit.js'
import { event as cloudevent } from 'cloudevents-sdk/v1'
import { EventServer, EventHandler } from '../index'

const handler: EventHandler<unknown, { handled: unknown }> = async (type, data) => ({ handled: data })

const request = supertest(EventServer(handler))

const APP_JSON = 'application/json; charset=utf-8'

describe('Testing Event Server', () => {
  it('verifies get root', done => {
    request
      .get('/')
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.object(result.body).hasProperty('name')
        test.object(result.body).hasProperty('version')
        test.object(result.body).hasProperty('node')
        test.object(result.body).hasProperty('build')
        test.object(result.body).hasProperty('status', 'Running')
        done(err)
      })
  })

  it('verifies health', done => {
    request
      .get('/health')
      .expect(200)
      .end((err, result) => {
        test.value(result).hasHeader('content-type', APP_JSON)
        test.object(result.body).hasProperty('name')
        test.object(result.body).hasProperty('version')
        test.object(result.body).hasProperty('node')
        test.object(result.body).hasProperty('build')
        test.object(result.body).hasProperty('process')
        test.object(result.body).hasProperty('memory')
        test.object(result.body).hasProperty('uptime')
        test.object(result.body).hasProperty('status', 'Running')
        done(err)
      })
  })

  it('verifies post event', done => {
    const event = cloudevent()
      .source('index.spec.ts')
      .type('test-event')
      .data({ value: 'value' })
    request
      .post('/')
      .set('ce-id', event.getId())
      .set('ce-source', event.getSource())
      .set('ce-specversion', event.getSpecversion())
      .set('ce-type', event.getType())
      .send(event.getData())
      .expect(200)
      .end((err, result) => {
        test.object(result.body.result).is({ handled: event.getData() })
        done()
      })
  })
})
