/**
 * Forces a `reflect-metadata` `design:type` decorator.
 * Useful in cases that things like TypeORM fail to generate the proper decorators based on your type definitions (e.g. if you use type composition, or indexed access types.)
 * @param value Constructor for type to force.
 * @example
 * DesignType(Number)
 * DesignType(String)
 */

type DesignTypeValue = Parameters<typeof Reflect.metadata>[1]
export const DesignType = (value: DesignTypeValue): PropertyDecorator => {
  return Reflect.metadata('design:type', value)
}
