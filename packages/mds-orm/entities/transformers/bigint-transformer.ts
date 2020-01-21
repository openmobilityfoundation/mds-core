const Bigint = (value: string | null): number | null => (value === null ? value : Number(value))

// Use Number for bigint columns so the values get returned as numbers instead of strings
export const BigintTransformer = {
  to: (to: number | null | (number | null)[]) => to,
  from: (from: string | null | (string | null)[]) => (Array.isArray(from) ? from.map(Bigint) : Bigint(from))
}
