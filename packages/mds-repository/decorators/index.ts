/**
 * Forces a `reflect-metadata` `design:type` decorator.
 * Useful in cases that things like TypeORM fail to generate the proper decorators based on your type definitions (e.g. if you use type composition, or indexed access types.)
 * @param value Constructor for type to force.
 * @example
 * ForceType(Number)
 * ForceType(String)
 */
export const ForceType = (value: any): PropertyDecorator => {
  return Reflect.metadata('design:type', value)
}
