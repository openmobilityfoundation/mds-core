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

// These global variables will be set by webpack
declare const NPM_PACKAGE_NAME: string
declare const NPM_PACKAGE_VERSION: string
declare const NPM_PACKAGE_GIT_BRANCH: string
declare const NPM_PACKAGE_GIT_COMMIT: string
declare const NPM_PACKAGE_BUILD_DATE: string

export function env() {
  return Object.assign(process.env, {
    npm_package_name: NPM_PACKAGE_NAME,
    npm_package_version: NPM_PACKAGE_VERSION,
    npm_package_git_branch: NPM_PACKAGE_GIT_BRANCH,
    npm_package_git_commit: NPM_PACKAGE_GIT_COMMIT,
    npm_package_build_date: NPM_PACKAGE_BUILD_DATE
  })
}
