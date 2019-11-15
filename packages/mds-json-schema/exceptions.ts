import { BaseError, reason } from '@mds-core/mds-utils'

/* istanbul ignore next */
export class ValidationError extends BaseError {
  public constructor(error?: Error | string, public info?: unknown) {
    super('ValidationError', reason(error))
  }
}
