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

import tripProcessor from '@mds-core/mds-trip-processor'

// eslint-disable-next-line @typescript-eslint/no-floating-promises
tripProcessor()
  .then(() => {
    return process.exit(0)
  })
  // eslint-disable-next-line promise/prefer-await-to-callbacks
  .catch(err => {
    console.log(err)
    return process.exit(1)
  })
