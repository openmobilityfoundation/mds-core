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

import test from 'unit.js'
import { uuid } from '@mds-core/mds-utils'
import { parseRequest } from '../index'

const arraysEqual = <T>(array1?: T[], array2?: T[]) => JSON.stringify(array1) === JSON.stringify(array2)

describe('mds-api-helpers Tests', () => {
  describe('parseRequest tests', () => {
    describe('tests parseRequest(...).single()', () => {
      describe('no parser', () => {
        it('singleton in query', () => {
          const req: any = { query: { provider_id: uuid() } }

          const { provider_id } = parseRequest(req).single().query('provider_id')

          test.assert(req.query.provider_id === provider_id)
          test.assert(typeof provider_id === 'string')
        })

        it('list in query', () => {
          const req: any = { query: { provider_id: [uuid(), uuid()] } }

          const { provider_id } = parseRequest(req).single().query('provider_id')

          test.assert(req.query.provider_id[0] === provider_id)
          test.assert(typeof provider_id === 'string')
        })

        it('nothing in query', () => {
          const req: any = { query: {} }

          const { provider_id } = parseRequest(req).single().query('provider_id')

          test.assert(provider_id === undefined)
        })
      })

      describe('with parser', () => {
        it('singleton in query', () => {
          const req: any = { query: { skip: '10' } }
          const parser = Number

          const { skip } = parseRequest(req).single({ parser }).query('skip')

          test.assert(parser(req.query.skip) === skip)
          test.assert(typeof skip === 'number')
        })

        it('list in query', () => {
          const req: any = { query: { skip: ['10', '100'] } }
          const parser = Number

          const { skip } = parseRequest(req).single({ parser }).query('skip')

          test.assert(parser(req.query.skip[0]) === skip)
          test.assert(typeof skip === 'number')
        })

        it('nothing in query', () => {
          const req: any = { query: {} }
          const parser = Number

          const { skip } = parseRequest(req).single({ parser }).query('skip')

          test.assert(skip === undefined)
        })
      })
    })

    describe('tests parseRequest(...).list()', () => {
      describe('no parser', () => {
        it('singleton in query', () => {
          const req: any = { query: { provider_id: uuid() } }

          const { provider_id } = parseRequest(req).list().query('provider_id')

          test.assert(arraysEqual([req.query.provider_id], provider_id))
          test.assert(Array.isArray(provider_id))
        })

        it('list in query', () => {
          const req: any = { query: { provider_id: [uuid(), uuid()] } }

          const { provider_id } = parseRequest(req).list().query('provider_id')

          test.assert(arraysEqual(req.query.provider_id, provider_id))
          test.assert(Array.isArray(provider_id))
        })

        it('nothing in query', () => {
          const req: any = { query: {} }

          const { provider_id } = parseRequest(req).list().query('provider_id')

          test.assert(provider_id === undefined)
        })
      })

      describe('with parser', () => {
        it('singleton in query', () => {
          const req: any = { query: { skip: '10' } }
          const parser = (xs: string[]) => xs.map(Number)

          const { skip } = parseRequest(req).list({ parser }).query('skip')

          test.assert(arraysEqual(parser([req.query.skip]), skip))
          test.assert(Array.isArray(skip))
        })

        it('list in query', () => {
          const req: any = { query: { skip: ['10', '100'] } }
          const parser = (xs: string[]) => xs.map(Number)

          const { skip } = parseRequest(req).list({ parser }).query('skip')

          test.assert(arraysEqual(parser(req.query.skip), skip))
          test.assert(Array.isArray(skip))
        })

        it('nothing in query', () => {
          const req: any = { query: {} }
          const parser = (xs: string[]) => xs.map(Number)

          const { skip } = parseRequest(req).list({ parser }).query('skip')

          test.assert(skip === undefined)
        })
      })
    })
  })
})
