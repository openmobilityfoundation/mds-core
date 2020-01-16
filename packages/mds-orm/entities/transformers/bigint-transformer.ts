// Use Number for bigint columns so the values get returned as numbers instead of strings
export const BigintTransformer = {
  to: (to: number | number[]) => to,
  from: (from: string | string[]) => (Array.isArray(from) ? from.map(Number) : Number(from))
}
