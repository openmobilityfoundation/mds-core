export type AsEntity<T> = {
  [P in keyof Required<T>]: Pick<T, P> extends Required<Pick<T, P>> ? T[P] : (Exclude<T[P], undefined> | null)
}
