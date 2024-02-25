export type Complex = { r: number; i: number }

export const c = (r: number, i: number): Complex => ({ r, i })

export const real = (r: number): Complex => ({ r, i: 0 })

export const polar = (z: Complex) => {
  const r = Math.sqrt(z.r ** 2 + z.i ** 2)
  const theta = Math.atan2(z.r, z.i)
  return { r, theta }
}

export const mul = (a: Complex, b: Complex) =>
  c(a.r * b.r - a.i * b.i, a.r * b.i + a.i * b.r)

export const div = (a: Complex, b: Complex) => {
  let l = b.r ** 2 + b.i ** 2
  return c((a.r * b.r + a.i * b.i) / l, (a.i * b.r - a.r * b.i) / l)
}

export const add = (a: Complex, b: Complex) => c(a.r + b.r, a.i + b.i)

export const sub = (a: Complex, b: Complex) => c(a.r - b.r, a.i - b.i)

export const exp = (z: Complex) => {
  let exp = Math.exp(z.r)
  return c(exp * Math.cos(z.i), exp * Math.sin(z.i))
}

export const ln = (z: Complex) => {
  const { r, theta } = polar(z)
  return c(Math.log(r), theta)
}

export const neg = (z: Complex) => c(-z.r, z.i)

export const sin = (z: Complex) =>
  c(Math.sin(z.r) * Math.cosh(z.i), Math.cos(z.r) * Math.sinh(z.i))

export const cos = (z: Complex) =>
  c(Math.cos(z.r) * Math.cosh(z.i), -Math.sin(z.r) * Math.sinh(z.i))

export const tan = (z: Complex) =>
  div(
    c(Math.sin(z.r * 2), Math.sinh(z.i * 2)),
    c(Math.cos(z.r * 2) + Math.cosh(z.i * 2), 0)
  )
