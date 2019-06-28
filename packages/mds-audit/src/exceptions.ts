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

/* istanbul ignore file */

export class ServerError extends Error {
  public constructor(message: string = 'server_error', public info = {}) {
    super(message)
    this.name = 'ServerError'
    this.info = info
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ServerError)
    }
  }
}

export class ValidationError extends Error {
  public constructor(message: string = 'validation_error', public info = {}) {
    super(message)
    this.name = 'ValidationError'
    this.info = info
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError)
    }
  }
}

export class NotFoundError extends Error {
  public constructor(message: string = 'not_found_error', public info = {}) {
    super(message)
    this.name = 'NotFoundError'
    this.info = info
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NotFoundError)
    }
  }
}

export class ConflictError extends Error {
  public constructor(message: string = 'conflict_error', public info = {}) {
    super(message)
    this.name = 'ConflictError'
    this.info = info
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ConflictError)
    }
  }
}

export class AuthorizationError extends Error {
  public constructor(message: string = 'authorization_error', public info = {}) {
    super(message)
    this.name = 'AuthorizationError'
    this.info = info
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthorizationError)
    }
  }
}
