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
    super(ServerError.name, reason(error))
  }
}

/* istanbul ignore next */
export class NotFoundError extends BaseError {
  public constructor(error?: Error | string, public info?: unknown) {
    super(NotFoundError.name, reason(error))
  }
}

/* istanbul ignore next */
export class ConflictError extends BaseError {
  public constructor(error?: Error | string, public info?: unknown) {
    super(ConflictError.name, reason(error))
  }
}

/* istanbul ignore next */
export class AuthorizationError extends BaseError {
  public constructor(error?: Error | string, public info?: unknown) {
    super(AuthorizationError.name, reason(error))
  }
}

/* istanbul ignore next */
export class RuntimeError extends BaseError {
  public constructor(error?: Error | string, public info?: unknown) {
    super(RuntimeError.name, reason(error))
  }
}

/* istanbul ignore next */
export class ValidationError extends BaseError {
  public constructor(error?: Error | string, public info?: unknown) {
    super(ValidationError.name, reason(error))
  }
}

/* istanbul ignore next */
export class BadParamsError extends BaseError {
  public constructor(error?: Error | string, public info?: unknown) {
    super(ValidationError.name, reason(error))
  }
}