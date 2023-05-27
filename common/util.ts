export function splitEvery<T>(arr: T[], num: number): T[][] {
  const res: T[][] = []

  for (let i = 0; i < arr.length; i++) {
    const mod = i % num
    if (mod === 0) {
      res.push([])
    }
    res[res.length - 1].push(arr[i])
  }

  return res
}
