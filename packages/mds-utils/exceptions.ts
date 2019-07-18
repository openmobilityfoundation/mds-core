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

export class RuntimeError extends Error {
  public constructor(message: string = 'runtime_error', public info = {}) {
    super(message)
    this.name = 'RuntimeError'
    this.info = info
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RuntimeError)
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
