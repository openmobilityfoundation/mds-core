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

import { ApiRequest, ApiResponse } from '@mds-core/mds-api-server'

export const POLICY_API_SUPPORTED_VERSIONS = ['0.1.0'] as const
export type POLICY_API_SUPPORTED_VERSION = typeof POLICY_API_SUPPORTED_VERSIONS[number]
export const [POLICY_API_DEFAULT_VERSION] = POLICY_API_SUPPORTED_VERSIONS

export type PolicyApiRequest = ApiRequest

export type PolicyApiResponse = ApiResponse
