const testAttributes = __DEBUG__
  ? (data: Record<string, string | number | undefined | null>) => {
      const ret: Record<string, string | number> = {}
      for (const key in data) {
        const value = data[key]
        if (value !== null && value !== undefined) {
          ret[`data-test-${key}`] = String(value)
        }
      }
      return ret
    }
  : () => undefined

export default testAttributes
