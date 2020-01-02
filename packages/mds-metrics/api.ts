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

import express from 'express'

import { pathsFor } from '@mds-core/mds-utils'
import { checkAccess } from '@mds-core/mds-api-server'
import {
  getStateSnapshot,
  getEventSnapshot,
  getTelemetryCounts,
  getEventCounts,
  getAll,
  getAllStubbed
} from './request-handlers'

function api(app: express.Express): express.Express {
  app.get(
    pathsFor('/state_snapshot'),
    checkAccess(scopes => scopes.includes('admin:all')),
    getStateSnapshot
  )

  app.get(
    pathsFor('/event_snapshot'),
    checkAccess(scopes => scopes.includes('admin:all')),
    getEventSnapshot
  )

  app.get(
    pathsFor('/telemetry_counts'),
    checkAccess(scopes => scopes.includes('admin:all')),
    getTelemetryCounts
  )

  app.get(
    pathsFor('/event_counts'),
    checkAccess(scopes => scopes.includes('admin:all')),
    getEventCounts
  )

  app.get(
    pathsFor('/all'),
    checkAccess(scopes => scopes.includes('admin:all')),
    getAll
  )

  app.get(
    pathsFor('/all_stubbed'),
    checkAccess(scopes => scopes.includes('admin:all')),
    getAllStubbed
  )

  return app
}

export { api }
