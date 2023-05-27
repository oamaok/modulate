type ClassNames = string | { [key: string]: any } | ClassNames[]

declare module '*.css' {
  const classNames: (...args: ClassNames[]) => string
  export = classNames
}
