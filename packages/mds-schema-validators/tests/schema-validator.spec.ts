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

import { ValidationError } from '@mds-core/mds-utils'
import { SchemaValidator, TestSchema } from '../index'

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
    expect(validator.isValid(TestData)).toBe(true)
    expect(validator.validate(TestData)).toBe(TestData)
  })

  it('Passes Validation (optional field)', () => {
    const { email, ...data } = TestData
    expect(validator.isValid(data)).toBe(true)
    expect(validator.validate(data)).toBe(data)
  })

  it('Fails Validation (missing required field)', async () => {
    const { id, ...data } = TestData
    expect(validator.isValid(data)).toBe(false)
    await expect(async () => validator.validate(data)).rejects.toThrowError(ValidationError)
  })

  it('Fails Validation (invalid format)', async () => {
    const data = { ...TestData, email: 'invalid' }
    expect(validator.isValid(data)).toBe(false)
    await expect(async () => validator.validate(data)).rejects.toThrowError(ValidationError)
  })

  it('Fails Validation (invalid enum)', async () => {
    const data = { ...TestData, country: 'NZ' }
    expect(validator.isValid(data)).toBe(false)
    await expect(async () => validator.validate(data)).rejects.toThrowError(ValidationError)
  })

  it('Fails Validation (invalid type)', async () => {
    const data = { ...TestData, zip: true }
    expect(validator.isValid(data)).toBe(false)
    await expect(async () => validator.validate(data)).rejects.toThrowError(ValidationError)
  })

  it('Fails Validation (invalid pattern)', async () => {
    const data = { ...TestData, country: 'CA' }
    expect(validator.isValid(data)).toBe(false)
    await expect(async () => validator.validate(data)).rejects.toThrowError(ValidationError)
  })

  it('Returns JSON schema', () => {
    expect(validator.$schema).toMatchObject({ $schema: 'http://json-schema.org/draft-07/schema#', ...TestSchema })
  })
})
