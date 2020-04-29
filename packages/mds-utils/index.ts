import { v4 } from 'uuid'
import { UUID } from '@mds-core/mds-types'

export * from './exceptions'
export * from './utils'

export const uuid = (): UUID => v4()
