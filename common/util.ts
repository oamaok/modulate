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

export const cloneObject = (obj: object): object => {
  if (Array.isArray(obj)) {
    return obj.map((value) => {
      if (value === null) return null
      if (typeof value === 'object') return cloneObject(value)
      return value
    })
  }

  const ret: Record<string, unknown> = {}

  for (const key in obj) {
    const value = obj[key as keyof typeof obj]
    if (value === null) {
      ret[key] = null
    } else if (typeof value === 'object') {
      ret[key] = cloneObject(value)
    } else {
      ret[key] = value
    }
  }

  return ret
}

// TODO: Optimize this
export const deepEqual = (objA: object, objB: object): boolean => {
  const aIsArray = Array.isArray(objA)
  const bIsArray = Array.isArray(objB)

  if (aIsArray !== bIsArray) return false

  if (aIsArray && bIsArray) {
    if (objA.length !== objB.length) return false

    for (let i = 0; i < objA.length; i++) {
      const a = objA[i]
      const b = objB[i]

      if ((a === null && b !== null) || (a !== null && b === null)) {
        return false
      }

      const typeofA = typeof a
      const typeofB = typeof b

      if (typeofA !== typeofB) return false

      if (typeofA === 'object' && typeofB === 'object') {
        if (!deepEqual(a, b)) return false
      } else if (a !== b) {
        return false
      }
    }
  } else {
    const aKeys = Object.keys(objA)
    const bKeys = Object.keys(objB)

    if (aKeys.length !== bKeys.length) {
      return false
    }

    for (const aKey of aKeys) {
      bKeys.push(aKey)
    }

    const unionOfKeys = new Set(bKeys)

    for (const key of unionOfKeys) {
      const a = objA[key as keyof typeof objA]
      const b = objB[key as keyof typeof objA]

      if ((a === null && b !== null) || (a !== null && b === null)) {
        return false
      }

      const typeofA = typeof a
      const typeofB = typeof b

      if (typeofA !== typeofB) return false

      if (typeofA === 'object' && typeofB === 'object') {
        if (!deepEqual(a, b)) return false
      } else if (a !== b) {
        return false
      }
    }
  }

  return true
}
