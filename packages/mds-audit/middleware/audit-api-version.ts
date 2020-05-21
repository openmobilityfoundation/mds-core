/*
    Copyright 2019-2020 City of Los Angeles.

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

import { ApiVersionMiddleware } from '@mds-core/mds-api-server'
import { AUDIT_API_SUPPORTED_VERSIONS, AUDIT_API_DEFAULT_VERSION } from '../types'

export const AuditApiVersionMiddleware = ApiVersionMiddleware(
  'application/vnd.mds.audit+json',
  AUDIT_API_SUPPORTED_VERSIONS
).withDefaultVersion(AUDIT_API_DEFAULT_VERSION)
