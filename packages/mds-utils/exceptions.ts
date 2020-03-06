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
    super('ServerError', reason(error), info)
  }
}

/* istanbul ignore next */
export class NotFoundError extends BaseError {
  public constructor(error?: Error | string, public info?: unknown) {
    super('NotFoundError', reason(error), info)
  }
}

/* istanbul ignore next */
export class ConflictError extends BaseError {
  public constructor(error?: Error | string, public info?: unknown) {
    super('ConflictError', reason(error), info)
  }
}

/* istanbul ignore next */
export class AuthorizationError extends BaseError {
  public constructor(error?: Error | string, public info?: unknown) {
    super('AuthorizationError', reason(error), info)
  }
}

/* istanbul ignore next */
export class RuntimeError extends BaseError {
  public constructor(error?: Error | string, public info?: unknown) {
    super('RuntimeError', reason(error), info)
  }
}

/* istanbul ignore next */
export class ValidationError extends BaseError {
  public constructor(error?: Error | string, public info?: unknown) {
    super('ValidationError', reason(error), info)
  }
}

/* istanbul ignore next */
export class BadParamsError extends BaseError {
  public constructor(error?: Error | string, public info?: unknown) {
    super('BadParamsError', reason(error), info)
  }
}

export class AlreadyPublishedError extends BaseError {
  public constructor(error?: Error | string, public info?: unknown) {
    super('AlreadyPublishedError', reason(error), info)
  }
}

export class UnsupportedTypeError extends BaseError {
  public constructor(error?: Error | string, public info?: unknown) {
    super('UnsupportedTypeError', reason(error), info)
  }
}

export class ParseError extends BaseError {
  public constructor(error?: Error | string, public info?: unknown) {
    super('ParseError', reason(error), info)
  }
}

export class DependencyMissingError extends BaseError {
  public constructor(error?: Error | string, public info?: unknown) {
    super('DependencyMissingError', reason(error), info)
  }
}

export class InsufficientPermissionsError extends BaseError {
  public constructor(error?: Error | string, public info?: unknown) {
    super('InsufficientPermissionsError', reason(error), info)
  }
}
