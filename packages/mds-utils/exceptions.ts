class BaseError extends Error {
  public constructor(public name: string, public reason?: string, public info?: unknown) {
    super(reason)
    Error.captureStackTrace(this, BaseError)
  }
}

const reason = (error?: Error | string) => (error instanceof Error ? error.message : error)

/* istanbul ignore next */
export class ServerError extends BaseError {
  public constructor(error?: Error | string, public info?: unknown) {
    super('ServerError', reason(error))
  }
}

/* istanbul ignore next */
export class NotFoundError extends BaseError {
  public constructor(error?: Error | string, public info?: unknown) {
    super('NotFoundError', reason(error))
  }
}

/* istanbul ignore next */
export class ConflictError extends BaseError {
  public constructor(error?: Error | string, public info?: unknown) {
    super('ConflictError', reason(error))
  }
}

/* istanbul ignore next */
export class AuthorizationError extends BaseError {
  public constructor(error?: Error | string, public info?: unknown) {
    super('AuthorizationError', reason(error))
  }
}

/* istanbul ignore next */
export class RuntimeError extends BaseError {
  public constructor(error?: Error | string, public info?: unknown) {
    super('RuntimeError', reason(error))
  }
}

/* istanbul ignore next */
export class ValidationError extends BaseError {
  public constructor(error?: Error | string, public info?: unknown) {
    super('ValidationError', reason(error))
  }
}

/* istanbul ignore next */
export class BadParamsError extends BaseError {
  public constructor(error?: Error | string, public info?: unknown) {
    super('BadParamsError', reason(error))
  }
}

export class AlreadyPublishedError extends BaseError {
  public constructor(error?: Error | string, public info?: unknown) {
    super('AlreadyPublishedError', reason(error))
  }
}

export class UnsupportedTypeError extends BaseError {
  public constructor(error?: Error | string, public info?: unknown) {
    super('UnsupportedTypeError', reason(error))
  }
}
