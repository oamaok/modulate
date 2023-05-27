function __assert(
  condition: boolean | undefined | object | null,
  message?: string
): asserts condition {
  if (!Boolean(condition)) {
    throw new Error(message ?? 'assert')
  }
}

const assert: typeof __assert =
  process.env.NODE_ENV !== 'production'
    ? __assert
    : (undefined as unknown as typeof __assert)

export default assert
