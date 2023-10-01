function __assert(
  condition: boolean | undefined | object | null,
  message?: string
): asserts condition {
  if (!condition) {
    throw new Error(message ?? 'assertation failed')
  }
}

const assert: typeof __assert = __DEBUG__ ? __assert : () => {}

export default assert
