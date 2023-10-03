const testAttributes = __DEBUG__
  ? (data: Record<string, string | number>) => {
      const ret: Record<string, string | number> = {}
      for (const key in data) {
        ret[`data-test-${key}`] = data[key]!
      }
      return ret
    }
  : () => undefined

export default testAttributes
