/**
 * Copyright 2021 City of Los Angeles
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

import { ApiServer } from '@mds-core/mds-api-server'
import { ComplianceServiceClient } from '@mds-core/mds-compliance-service'
import { PolicyDomainModel, PolicyServiceClient } from '@mds-core/mds-policy-service'
import { SCOPED_AUTH } from '@mds-core/mds-test-data'
import { pathPrefix } from '@mds-core/mds-utils'
import HttpStatus from 'http-status-codes'
import supertest from 'supertest'
import { api } from '../api'
import {
  ALL_COMPLIANCE_AGGREGATES,
  COMPLIANCE_AGGREGATE_PROVIDER_1_POLICY_1,
  COMPLIANCE_SNAPSHOTS_PROVIDER_1_POLICY_1,
  COMPLIANCE_SNAPSHOTS_PROVIDER_2_POLICY_2,
  COMPLIANCE_SNAPSHOT_ID,
  POLICY1,
  POLICY2,
  POLICY_ID_1,
  POLICY_ID_2,
  PROVIDER_ID_1,
  PROVIDER_ID_2,
  TIME
} from './fixtures'

const request = supertest(ApiServer(api))
const SNAPSHOT_IDS = COMPLIANCE_SNAPSHOTS_PROVIDER_2_POLICY_2.map(snapshot => snapshot.compliance_snapshot_id)
const COMPLIANCE_IDS_TOKEN =
  'YmE2MzY0MDYtMTg5OC00OWEwLWI5MzctNmY4MjViNzg5ZWUwLDhjYjRkMGE4LTVlZGMtNDZmNi1hNGU0LWE0MGY1YTVmNDU1OCw1OGZiZWZjMi1mNjRmLTQ3NDAtOTRhNi0yNDRjNzIzM2M3ZGEsM2ExMTE1MGItNWQ2NC00NjM4LWJkMmQtNzQ1OTA1ZWQ4Mjk0'

jest.mock('@mds-core/mds-utils', () => ({
  ...(jest.requireActual('@mds-core/mds-utils') as object)
}))

// eslint-disable-next-line @typescript-eslint/no-var-requires
const utils = require('@mds-core/mds-utils')

describe('Test Compliances API', () => {
  beforeEach(() => {
    jest.spyOn(utils, 'now').mockImplementation(() => TIME + 500)
    jest.spyOn(PolicyServiceClient, 'readActivePolicies').mockImplementation(async (): Promise<PolicyDomainModel[]> => {
      return [POLICY1, POLICY2]
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('GET /violation_periods', () => {
    it('parses all query params successfully, and users with the compliance:read scope can query for arbitrary providers', async () => {
      const getComplianceSnapshotsSpy = jest
        .spyOn(ComplianceServiceClient, 'getComplianceViolationPeriods')
        .mockImplementation(async () => COMPLIANCE_AGGREGATE_PROVIDER_1_POLICY_1)

      await request
        .get(
          pathPrefix(
            `/violation_periods?start_time=${TIME}&provider_id=${PROVIDER_ID_1}&provider_id=${PROVIDER_ID_2}&policy_id=${POLICY_ID_1}&policy_id=${POLICY_ID_2}&end_time=${
              TIME + 500
            }`
          )
        )
        .set('Authorization', SCOPED_AUTH(['compliance:read'], ''))
        .expect(HttpStatus.OK)
      expect(getComplianceSnapshotsSpy).toHaveBeenCalledWith({
        start_time: TIME,
        provider_ids: [PROVIDER_ID_1, PROVIDER_ID_2],
        policy_ids: [POLICY_ID_1, POLICY_ID_2],
        end_time: TIME + 500
      })
    })

    it('restricts the list of queried provider_ids to only the provider_id in the JWT for users with the compliance:read:provider scope', async () => {
      const clientSpy = jest
        .spyOn(ComplianceServiceClient, 'getComplianceViolationPeriods')
        .mockImplementation(async () => COMPLIANCE_AGGREGATE_PROVIDER_1_POLICY_1)
      await request
        .get(
          pathPrefix(
            `/violation_periods?start_time=${TIME}&provider_id=${PROVIDER_ID_1}&provider_id=${PROVIDER_ID_2}&policy_id=${POLICY_ID_1}&policy_id=${POLICY_ID_2}&end_time=${
              TIME + 500
            }`
          )
        )
        .set('Authorization', SCOPED_AUTH(['compliance:read:provider'], PROVIDER_ID_1))
        .expect(HttpStatus.OK)
      expect(clientSpy).toHaveBeenCalledWith({
        start_time: TIME,
        provider_ids: [PROVIDER_ID_1],
        policy_ids: [POLICY_ID_1, POLICY_ID_2],
        end_time: TIME + 500
      })
    })

    it('does not change the supplied provider_ids if the scope is compliance:read', async () => {
      const clientSpy = jest
        .spyOn(ComplianceServiceClient, 'getComplianceViolationPeriods')
        .mockImplementation(async () => COMPLIANCE_AGGREGATE_PROVIDER_1_POLICY_1)
      await request
        .get(
          pathPrefix(
            `/violation_periods?start_time=${TIME}&policy_id=${POLICY_ID_1}&policy_id=${POLICY_ID_2}&end_time=${
              TIME + 500
            }`
          )
        )
        .set('Authorization', SCOPED_AUTH(['compliance:read'], ''))
        .expect(HttpStatus.OK)
      expect(clientSpy).toHaveBeenCalledWith({
        start_time: TIME,
        provider_ids: undefined,
        policy_ids: [POLICY_ID_1, POLICY_ID_2],
        end_time: TIME + 500
      })

      const clientSpy2 = jest
        .spyOn(ComplianceServiceClient, 'getComplianceViolationPeriods')
        .mockImplementation(async () => COMPLIANCE_AGGREGATE_PROVIDER_1_POLICY_1)
      await request
        .get(
          pathPrefix(
            `/violation_periods?start_time=${TIME}&policy_id=${POLICY_ID_1}&policy_id=${POLICY_ID_2}&end_time=${
              TIME + 500
            }&provider_id=${PROVIDER_ID_1}&provider_id=${PROVIDER_ID_2}`
          )
        )
        .set('Authorization', SCOPED_AUTH(['compliance:read'], ''))
        .expect(HttpStatus.OK)
      expect(clientSpy2).toHaveBeenCalledWith({
        start_time: TIME,
        provider_ids: [PROVIDER_ID_1, PROVIDER_ID_2],
        policy_ids: [POLICY_ID_1, POLICY_ID_2],
        end_time: TIME + 500
      })
    })

    it('Authorization fails without authorization token', async () => {
      await request.get(pathPrefix(`/violation_periods?start_time=${TIME}`)).expect(HttpStatus.FORBIDDEN)
    })

    it('Authorization fails with compliance:read:scope and no provider_id', async () => {
      await request
        .get(pathPrefix(`/violation_periods?start_time=${TIME}`))
        .set('Authorization', SCOPED_AUTH(['compliance:read:provider'], ''))
        .expect(HttpStatus.FORBIDDEN)
    })

    it('Encodes the tokens for each set of compliance snapshot ids in a compliance aggregate correctly', async () => {
      jest
        .spyOn(ComplianceServiceClient, 'getComplianceViolationPeriods')
        .mockImplementation(async () => ALL_COMPLIANCE_AGGREGATES)
      jest.spyOn(utils, 'uuid').mockImplementation(() => '1234')
      await request
        .get(pathPrefix(`/violation_periods?start_time=${TIME}`))
        .set('Authorization', SCOPED_AUTH(['compliance:read'], ''))
        .expect(HttpStatus.OK, {
          version: '1.1.0',
          start_time: TIME,
          end_time: TIME + 500,
          results: [
            {
              provider_id: 'c20e08cf-8488-46a6-a66c-5d8fb827f7e0',
              policy_id: '6d7a9c7e-853c-4ff7-a86f-e17c06d3bd80',
              provider_name: 'JUMP',
              violation_periods: [
                {
                  start_time: 1605821758034,
                  end_time: null,
                  snapshots_uri:
                    '/compliance_snapshot_ids?compliance_ids_token=MjQzZTEyMDktNjFhZC00ZDdjLTg0NjQtZGI1NTFmMWY4YzIx'
                }
              ]
            },
            {
              provider_id: 'c20e08cf-8488-46a6-a66c-5d8fb827f7e0',
              policy_id: 'dfe3f757-c43a-4eb6-b85e-abc00f3e8387',
              provider_name: 'JUMP',
              violation_periods: []
            },
            {
              provider_id: '63f13c48-34ff-49d2-aca7-cf6a5b6171c3',
              policy_id: 'dfe3f757-c43a-4eb6-b85e-abc00f3e8387',
              provider_name: 'Lime',
              violation_periods: [
                {
                  start_time: 1605821758035,
                  end_time: 1605821758037,
                  snapshots_uri:
                    '/compliance_snapshot_ids?compliance_ids_token=YmE2MzY0MDYtMTg5OC00OWEwLWI5MzctNmY4MjViNzg5ZWUwLDhjYjRkMGE4LTVlZGMtNDZmNi1hNGU0LWE0MGY1YTVmNDU1OA=='
                },
                {
                  start_time: 1605821758038,
                  end_time: null,
                  snapshots_uri:
                    '/compliance_snapshot_ids?compliance_ids_token=M2ExMTE1MGItNWQ2NC00NjM4LWJkMmQtNzQ1OTA1ZWQ4Mjk0'
                }
              ]
            },
            {
              provider_id: '63f13c48-34ff-49d2-aca7-cf6a5b6171c3',
              policy_id: '6d7a9c7e-853c-4ff7-a86f-e17c06d3bd80',
              provider_name: 'Lime',
              violation_periods: [
                {
                  start_time: 1605821758036,
                  end_time: null,
                  snapshots_uri:
                    '/compliance_snapshot_ids?compliance_ids_token=MzllMjE3MWItYTlkZi00MTdjLWIyMTgtMmE4MmI0OTFhMGNj'
                }
              ]
            }
          ]
        })
    })
  })

  describe('GET /violation_details_snapshot', () => {
    it('successfully uses the compliance_snapshot_id if provided', async () => {
      const clientSpy = jest
        .spyOn(ComplianceServiceClient, 'getComplianceSnapshot')
        .mockImplementation(async () => COMPLIANCE_SNAPSHOTS_PROVIDER_1_POLICY_1[0])
      await request
        .get(
          pathPrefix(
            `/violation_details_snapshot?compliance_snapshot_id=${COMPLIANCE_SNAPSHOT_ID}&policy_id=${POLICY_ID_1}`
          )
        )
        .set('Authorization', SCOPED_AUTH(['compliance:read'], ''))
        .expect(HttpStatus.OK)

      expect(clientSpy).toHaveBeenCalledWith({
        compliance_snapshot_id: COMPLIANCE_SNAPSHOT_ID
      })
    })

    it('successfully uses a combo of compliance_as_of, provider_id, and policy_id', async () => {
      const clientSpy = jest
        .spyOn(ComplianceServiceClient, 'getComplianceSnapshot')
        .mockImplementation(async () => COMPLIANCE_SNAPSHOTS_PROVIDER_1_POLICY_1[0])
      await request
        .get(
          pathPrefix(
            `/violation_details_snapshot?policy_id=${POLICY_ID_1}&provider_id=${PROVIDER_ID_1}&compliance_as_of=${TIME}`
          )
        )
        .set('Authorization', SCOPED_AUTH(['compliance:read'], ''))
        .expect(HttpStatus.OK)

      expect(clientSpy).toHaveBeenCalledWith({
        policy_id: POLICY_ID_1,
        provider_id: PROVIDER_ID_1,
        compliance_as_of: TIME
      })
    })

    it('compliance_as_of defaults to now()', async () => {
      const clientSpy = jest
        .spyOn(ComplianceServiceClient, 'getComplianceSnapshot')
        .mockImplementation(async () => COMPLIANCE_SNAPSHOTS_PROVIDER_1_POLICY_1[0])
      await request
        .get(pathPrefix(`/violation_details_snapshot?policy_id=${POLICY_ID_1}&provider_id=${PROVIDER_ID_1}`))
        .set('Authorization', SCOPED_AUTH(['compliance:read'], ''))
        .expect(HttpStatus.OK)

      expect(clientSpy).toHaveBeenCalledWith({
        policy_id: POLICY_ID_1,
        provider_id: PROVIDER_ID_1,
        compliance_as_of: TIME + 500
      })
    })

    it('compliance:read scoped request fails if provider_id not explicitly provided', async () => {
      await request
        .get(pathPrefix(`/violation_details_snapshot?policy_id=${POLICY_ID_1}`))
        .set('Authorization', SCOPED_AUTH(['compliance:read'], ''))
        .expect(HttpStatus.BAD_REQUEST)
    })

    it('uses the provider_id in the JWT claim with compliance:read:provider scope', async () => {
      const clientSpy = jest
        .spyOn(ComplianceServiceClient, 'getComplianceSnapshot')
        .mockImplementation(async () => COMPLIANCE_SNAPSHOTS_PROVIDER_1_POLICY_1[0])
      await request
        .get(pathPrefix(`/violation_details_snapshot?policy_id=${POLICY_ID_1}&provider_id=${PROVIDER_ID_2}`))
        .set('Authorization', SCOPED_AUTH(['compliance:read:provider'], PROVIDER_ID_1))
        .expect(HttpStatus.OK)

      expect(clientSpy).toHaveBeenCalledWith({
        policy_id: POLICY_ID_1,
        provider_id: PROVIDER_ID_1,
        compliance_as_of: TIME + 500
      })
    })

    it('returns an error if the provider_id in the JWT claim is missing', async () => {
      await request
        .get(pathPrefix(`/violation_details_snapshot?policy_id=${POLICY_ID_1}`))
        .set('Authorization', SCOPED_AUTH(['compliance:read:provider'], ''))
        .expect(HttpStatus.BAD_REQUEST)
    })

    it('returns an error if the policy_id and compliance_snapshot_id are both missing', async () => {
      await request
        .get(pathPrefix(`/violation_details_snapshot`))
        .set('Authorization', SCOPED_AUTH(['compliance:read:provider'], PROVIDER_ID_1))
        .expect(HttpStatus.BAD_REQUEST)
    })
  })

  describe('GET /compliance_snapshot_ids', () => {
    it('gets compliance snapshot ids with the compliance:read scope', async () => {
      await request
        .get(pathPrefix(`/compliance_snapshot_ids?compliance_ids_token=${COMPLIANCE_IDS_TOKEN}`))
        .set('Authorization', SCOPED_AUTH(['compliance:read'], ''))
        .expect(HttpStatus.OK, { version: '1.1.0', data: SNAPSHOT_IDS })
    })

    it('gets compliance snapshot ids with the compliance:read:provider scope', async () => {
      await request
        .get(pathPrefix(`/compliance_snapshot_ids?compliance_ids_token=${COMPLIANCE_IDS_TOKEN}`))
        .set('Authorization', SCOPED_AUTH(['compliance:read:provider'], PROVIDER_ID_1))
        .expect(HttpStatus.OK, { version: '1.1.0', data: SNAPSHOT_IDS })
    })
  })
})
