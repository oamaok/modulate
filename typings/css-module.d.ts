declare module '*.css' {
  type ClassNames = Record<string, string>
  const classNames: ClassNames
  export = classNames
}
