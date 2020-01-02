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

import { EventServer } from '@mds-core/mds-event-server'
import processor from '@mds-core/mds-provider-processor'
import { env } from '@container-images/env-inject'

const { npm_package_name, npm_package_version, npm_package_git_commit, PORT = 5001 } = env()

EventServer(processor).listen(PORT, () =>
  /* eslint-reason avoids import of logger */
  /* eslint-disable-next-line no-console */
  console.log(`${npm_package_name} v${npm_package_version} (${npm_package_git_commit}) running on port ${PORT}`)
)
