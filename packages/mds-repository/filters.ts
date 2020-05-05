import { FindOperator, In, Equal, IsNull } from 'typeorm'

export const PropertyValue = <TProperty extends string>(
  property: TProperty,
  value: unknown
): Partial<{ [P in TProperty]: FindOperator<unknown> }> => {
  return { [property]: Array.isArray(value) ? In(value) : Equal(value) } as Partial<
    { [P in TProperty]: FindOperator<unknown> }
  >
}

export const NullablePropertyValue = <TProperty extends string>(
  property: TProperty,
  value: unknown
): Partial<{ [P in TProperty]: FindOperator<unknown> }> => {
  return value === null
    ? ({ [property]: IsNull() } as Partial<{ [P in TProperty]: FindOperator<unknown> }>)
    : PropertyValue(property, value)
}

export const OptionalPropertyValue = <TProperty extends string>(
  filter: (property: TProperty, value: unknown) => Partial<{ [P in TProperty]: FindOperator<unknown> }>,
  property: TProperty,
  value: unknown
): Partial<{ [P in TProperty]: FindOperator<unknown> }> => (value === undefined ? {} : filter(property, value))
