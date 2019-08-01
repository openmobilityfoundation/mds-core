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

import { ProviderEventProcessor } from '@mds-core/mds-provider'

const { PROVIDER_EVENT_PROCESSOR_INTERVAL, PROVIDER_EVENT_PROCESSOR_COUNT } = process.env

const [interval, count] = [PROVIDER_EVENT_PROCESSOR_INTERVAL, PROVIDER_EVENT_PROCESSOR_COUNT]
  .map(Number)
  .map(value => (Number.isNaN(value) ? undefined : value))

/* eslint-reason Fire and forget */
/* eslint-disable-next-line @typescript-eslint/no-floating-promises */
ProviderEventProcessor({ interval, count })
