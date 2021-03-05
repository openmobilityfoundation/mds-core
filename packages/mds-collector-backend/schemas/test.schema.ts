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

import { JSONSchemaType } from 'ajv'

const Countries = <const>['US', 'CA']
type Country = typeof Countries[number]

type TestSchema = {
  id: string
  name: string
  email?: string
  country: Country
  zip: string
}

const TestSchema: JSONSchemaType<TestSchema> = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid'
    },
    name: {
      type: 'string'
    },
    email: {
      type: 'string',
      format: 'email',
      nullable: true
    },
    country: {
      type: 'string',
      enum: [...Countries]
    },
    zip: {
      type: 'string'
    }
  },
  if: {
    properties: {
      country: {
        type: 'string',
        const: 'US'
      }
    }
  },
  then: {
    properties: {
      zip: {
        type: 'string',
        pattern: '^[0-9]{5}(-[0-9]{4})?$'
      }
    }
  },
  else: {
    properties: {
      zip: {
        type: 'string',
        pattern: '^[A-Z][0-9][A-Z] [0-9][A-Z][0-9]$'
      }
    }
  },
  required: ['id', 'name', 'country', 'zip'],
  additionalProperties: false
}

export default TestSchema
