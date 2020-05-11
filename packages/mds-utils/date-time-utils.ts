import { Timestamp } from '@mds-core/mds-types'
import moment from 'moment-timezone'
import { BadParamsError } from './exceptions/exceptions'

export const getCurrentDate = () => {
  return new Date()
}

export const getLocalTime = () => moment(getCurrentDate()).tz(process.env.TIMEZONE || 'America/Los_Angeles')

const parseOperator = (offset: string): '+' | '-' => {
  if (offset === 'today' || offset === 'yesterday' || offset === 'now') {
    return '+'
  }

  const operator = offset[0]

  if (operator !== '+' && operator !== '-') {
    throw new BadParamsError(`Invalid time offset operator: ${offset}, ${operator}`)
  }

  return operator
}

const parseCount = (offset: string) => {
  if (offset === 'today' || offset === 'now') {
    return 0
  }
  if (offset === 'yesterday') {
    return 1
  }

  const count = Number(offset.slice(1, -1))
  if (Number.isNaN(count)) {
    throw new BadParamsError(`Invalid time offset count: ${offset}, ${count}`)
  }
  return count
}

const parseUnit = (offset: string): 'days' | 'hours' => {
  const shorthand = offset.slice(-1)
  const shorthandToUnit: {
    [key: string]: 'days' | 'hours'
  } = {
    d: 'days',
    h: 'hours'
  }
  if (offset === 'today' || offset === 'yesterday' || offset === 'now') {
    return 'days'
  }
  const unit = shorthandToUnit[shorthand]
  if (unit === undefined) {
    throw new BadParamsError(`Invalid offset unit shorthand: ${offset}, ${shorthand}`)
  }
  return unit
}

const parseIsRelative = (offset: string): boolean => {
  if (offset === 'today' || offset === 'yesterday' || offset === 'now') {
    return false
  }
  return true
}

const parseOffset = (
  offset: string
): {
  unit: 'days' | 'hours'
  operator: '+' | '-'
  count: number
  relative: boolean
} => {
  const operator = parseOperator(offset)
  const count = parseCount(offset)
  const unit = parseUnit(offset)
  const relative = parseIsRelative(offset)

  return {
    unit,
    operator,
    count,
    relative
  }
}

const parseAnchorPoint = (offset: string) => {
  const localTime = getLocalTime()
  if (offset === 'today') {
    return localTime.startOf('day')
  }
  if (offset === 'now') {
    return localTime.startOf('hour')
  }
  if (offset === 'yesterday') {
    return localTime.startOf('day').subtract(1, 'days')
  }
  throw new BadParamsError(`Invalid anchor point: ${offset}`)
}

const parseRelative = (
  startOffset: string,
  endOffset: string
): {
  start_time: Timestamp
  end_time: Timestamp
} => {
  const parsedStartOffset = parseOffset(startOffset)
  const parsedEndOffset = parseOffset(endOffset)

  if (!parsedStartOffset.relative && !parsedEndOffset.relative) {
    return {
      start_time: parseAnchorPoint(startOffset).valueOf(),
      end_time: parseAnchorPoint(endOffset).valueOf()
    }
  }

  if (parsedStartOffset.relative && parsedEndOffset.relative) {
    throw new BadParamsError(`Both start_offset and end_offset cannot be relative to each other`)
  }

  if (parsedStartOffset.relative) {
    const anchorPoint = parseAnchorPoint(endOffset)
    const { operator, unit, count } = parsedStartOffset
    if (operator === '-') {
      return {
        start_time: anchorPoint.clone().subtract(count, unit).valueOf(),
        end_time: anchorPoint.valueOf()
      }
    }
    throw new BadParamsError(`Invalid starting point: ${startOffset}`)
  }

  if (parsedEndOffset.relative) {
    const anchorPoint = parseAnchorPoint(startOffset)
    const { operator, unit, count } = parsedEndOffset
    if (operator === '+') {
      return {
        start_time: anchorPoint.valueOf(),
        end_time: anchorPoint.clone().add(count, unit).valueOf()
      }
    }
    throw new BadParamsError(`Invalid ending point: ${endOffset}`)
  }

  throw new BadParamsError(`Both start_offset and end_offset cannot be relative to each other`)
}

export { parseOperator, parseCount, parseUnit, parseOffset, parseAnchorPoint, parseRelative, parseIsRelative }
