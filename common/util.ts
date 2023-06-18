export const splitEvery = <T>(arr: T[], num: number): T[][] => {
  const res: T[][] = []

  for (let i = 0; i < arr.length; i++) {
    const mod = i % num
    if (mod === 0) {
      res.push([])
    }
    res[res.length - 1]!.push(arr[i]!)
  }

  return res
}

export const cloneObject = <T extends Record<string, any> | any[]>(
  obj: T
): T => {
  if (Array.isArray(obj)) {
    return obj.map((value) => {
      if (value === null) return null
      if (typeof value === 'object') return cloneObject(value)
      return value
    }) as T
  }

  const ret: Record<keyof T, T[keyof T]> = {} as Record<keyof T, T[keyof T]>

  for (const key in obj) {
    const value = obj[key as keyof T]
    if (value === null) {
      ret[key] = null as T[keyof T]
    } else if (typeof value === 'object') {
      ret[key] = cloneObject(value)
    } else {
      ret[key] = value
    }
  }

  return ret as T
}

export const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true
  const type = typeof a
  if (type !== typeof b) return false
  if (type === 'number') {
    return Math.abs(a - b) <= 1e-20
  }

  if (type === 'object') {
    if (a === null) return b === null
    if (b === null) return false
    if (Array.isArray(a)) {
      if (!Array.isArray(b)) return false
      const len = a.length
      if (len != b.length) return false
      for (let i = 0; i < len; i++) {
        if (!deepEqual(a[i], b[i])) return false
      }
      return true
    } else {
      for (const key of Object.keys(a)) {
        if (!(key in b)) return false
        if (!deepEqual(a[key], b[key])) return false
      }
      for (const key of Object.keys(b)) {
        if (!(key in a)) return false
      }
      return true
    }
  }
  return false
}
