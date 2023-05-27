export const info = (...args: any[]) => {
  console.info(
    `[${new Date().toISOString()}] [info] ${args
      .map((arg) => arg.toString())
      .join(' ')}`
  )
}

export const error = (...args: any[]) => {
  console.error(
    `[${new Date().toISOString()}] [err] ${args
      .map((arg) => arg.toString())
      .join(' ')}`
  )
}

export const warn = (...args: any[]) => {
  console.warn(
    `[${new Date().toISOString()}] [warn] ${args
      .map((arg) => arg.toString())
      .join(' ')}`
  )
}
