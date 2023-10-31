type ClassNames = string | { [key: string]: any } | ClassNames[]

const classNames = (nameMap: Record<string, string>) => {
  const stringifyClassNames = (...args: ClassNames[]): string => {
    let className = ''
    for (const names of args) {
      if (typeof names === 'string') {
        className += (nameMap[names] ?? names) + ' '
        continue
      }

      if (Array.isArray(names)) {
        for (const name of names) {
          className += stringifyClassNames(name) + ' '
        }
        continue
      }

      for (const key in names) {
        if (names[key]) className += nameMap[key] + ' '
      }
    }
    return className.trim()
  }
  return stringifyClassNames
}

export default classNames
