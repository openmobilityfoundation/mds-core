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

import { numberSchema, uuidSchema, vehicleEventTypeSchema, vehicleStatusSchema } from '@mds-core/mds-schema-validators'
import { isDefined, now, ValidationError } from '@mds-core/mds-utils'
import Joi from 'joi'
import { ComplianceSnapshotDomainModel, GetComplianceSnapshotsByTimeIntervalOptions } from '../@types'

const policySchema = Joi.object().keys({
  policy_id: Joi.string().uuid().required(),
  name: Joi.string().required()
})

const matchedVehicleInformationSchema = Joi.object().keys({
  device_id: Joi.string().uuid(),
  rule_applied: Joi.string().uuid(),
  rules_matched: Joi.array().items(Joi.string().uuid()),
  state: vehicleStatusSchema.required(),
  event_types: Joi.array().items(vehicleEventTypeSchema).required(),
  timestamp: Joi.number().required(),
  gps: Joi.object().keys({
    lat: numberSchema.min(-90).max(90).required(),
    lng: numberSchema.min(-180).max(180).required()
  }),
  speed: Joi.number()
})

export const complianceSnapshotDomainModelSchema = Joi.object().keys({
  compliance_snapshot_id: Joi.string().uuid().required().error(Error('compliance_snapshot_id is missing')),
  compliance_as_of: Joi.number().integer().required().error(Error('compliance_as_of is missing')),
  provider_id: Joi.string().uuid().required().error(Error('provider_id is missing')),
  policy: policySchema,
  vehicles_found: Joi.array().items(matchedVehicleInformationSchema).required(),
  excess_vehicles_count: Joi.number().required(),
  total_violations: Joi.number().required()
})

export const ValidateComplianceSnapshotDomainModel = (
  complianceSnapshot: ComplianceSnapshotDomainModel
): ComplianceSnapshotDomainModel => {
  const { error } = complianceSnapshotDomainModelSchema.validate(complianceSnapshot)
  if (error) {
    throw new ValidationError(error.message, complianceSnapshot)
  }
  return complianceSnapshot
}

const getComplianceSnapshotsByTimeIntervalOptionsSchema = Joi.object().keys({
  start_time: Joi.number().integer().required().error(Error('start_time not provided')).less(Joi.ref('end_time')),
  end_time: Joi.number().integer().required().error(Error('end_time not provided')),
  provider_ids: Joi.array().items(uuidSchema),
  policy_ids: Joi.array().items(uuidSchema)
})

export const ValidateGetComplianceSnapshotsByTimeIntervalOptions = (
  options: GetComplianceSnapshotsByTimeIntervalOptions
) => {
  if (!isDefined(options.end_time)) {
    // eslint-disable-next-line no-param-reassign
    options.end_time = now()
  }

  const { error } = getComplianceSnapshotsByTimeIntervalOptionsSchema.validate(options)
  if (error) {
    throw new ValidationError(error.message, options)
  }
  return options
}
