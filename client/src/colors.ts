export type RGB = [number, number, number]

export const hexToRgb = (hex: string): RGB => {
  const [, ...values] = hex.match(/#(.{2})(.{2})(.{2})/) as [
    string,
    string,
    string,
    string,
  ]
  return [
    parseInt(values[0], 16),
    parseInt(values[1], 16),
    parseInt(values[2], 16),
  ]
}

export const rbgToHex = ([r, g, b]: RGB) => {
  return `#${r.toString(16).padStart(2, '0')}${g
    .toString(16)
    .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export const darkenColor = (hex: string, amount: number) => {
  return rbgToHex(hexToRgb(hex).map((v) => Math.round(v * (1 - amount))) as RGB)
}

export const lightenColor = (hex: string, amount: number) => {
  return rbgToHex(
    hexToRgb(hex).map((v) => Math.round(255 - (255 - v) * (1 - amount))) as RGB
  )
}
