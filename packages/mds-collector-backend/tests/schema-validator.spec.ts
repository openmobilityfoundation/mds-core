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

import { SchemaValidator } from '../schema-validator'
import TestSchema from '../schemas/test.schema'

const TestData: TestSchema = {
  country: 'US',
  id: '26eea094-3fc2-4610-839d-6ef018b46f81',
  name: 'Test',
  zip: '90210',
  email: 'test@test.com'
}

const validator = SchemaValidator(TestSchema)

describe('Schema Validation', () => {
  it('Passes Validation', () => {
    expect(validator.validate(TestData)).toBe(true)
  })

  it('Passes Validation (optional field)', () => {
    const { email, ...data } = TestData
    expect(validator.validate(data)).toBe(true)
  })

  it('Fails Validation (missing required field)', async () => {
    const { id, ...data } = TestData
    await expect(async () => validator.validate(data)).rejects.toContainEqual(
      expect.objectContaining({
        keyword: 'required',
        params: { missingProperty: 'id' }
      })
    )
  })

  it('Fails Validation (invalid format)', async () => {
    const data = { ...TestData, email: 'invalid' }
    await expect(async () => validator.validate(data)).rejects.toContainEqual(
      expect.objectContaining({
        keyword: 'format',
        dataPath: '/email'
      })
    )
  })

  it('Fails Validation (invalid enum)', async () => {
    const data = { ...TestData, country: 'NZ' }
    await expect(async () => validator.validate(data)).rejects.toContainEqual(
      expect.objectContaining({
        keyword: 'enum',
        dataPath: '/country'
      })
    )
  })

  it('Fails Validation (invalid type)', async () => {
    const data = { ...TestData, zip: true }
    await expect(async () => validator.validate(data)).rejects.toContainEqual(
      expect.objectContaining({
        keyword: 'type',
        dataPath: '/zip'
      })
    )
  })

  it('Fails Validation (invalid pattern)', async () => {
    const data = { ...TestData, country: 'CA' }
    await expect(async () => validator.validate(data)).rejects.toContainEqual(
      expect.objectContaining({
        keyword: 'pattern',
        dataPath: '/zip'
      })
    )
  })

  it('Returns JSON schema', () => {
    expect(validator.$schema).toMatchObject(TestSchema)
    expect(validator.$schema).toHaveProperty('$schema', 'http://json-schema.org/draft-07/schema#')
  })
})
