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
