const fs = require('fs/promises')
const { resolve } = require('path')
const { XMLParser, XMLBuilder } = require('fast-xml-parser')

let currentId = 0
const charset = 'modulateMODULATE'
const nextName = () => {
  let id = currentId++
  let name = ''
  for (;;) {
    const mod = id % charset.length
    name += charset[mod]
    if (id < charset.length) return name
    id = (id - mod) / charset.length - 1
  }
}

const svgParser = new XMLParser({
  ignoreAttributes: false,
})

const svgBuilder = new XMLBuilder({
  ignoreAttributes: false,
})

const SvgLoaderPlugin = () => ({
  name: 'SvgLoaderPlugin',
  setup(build) {
    const svgIconNames = {}
    const svgData = {}

    build.onLoad({ filter: /\.svg$/ }, async ({ resolveDir, path }) => {
      const filePath = resolve(resolveDir, path)
      const svg = svgParser.parse(await fs.readFile(filePath))
      const id = svgIconNames[filePath] ?? nextName()
      svgIconNames[filePath] = id

      const formattedSvg = Object.fromEntries(
        Object.entries(svg.svg).filter(([key]) => {
          return key !== '@_xmlns'
        })
      )

      svgData[filePath] = {
        symbol: {
          '@_id': id,
          ...formattedSvg,
        },
      }

      return {
        loader: 'ts',
        contents: `export default '#${id}'`,
      }
    })

    build.onEnd(async () => {
      const bundlePath = resolve(build.initialOptions.outdir, 'atlas.svg')
      const atlas = {
        svg: {
          '@_style': 'display:none',
          '@_xmlns': 'http://www.w3.org/2000/svg',

          defs: Object.values(svgData),
        },
      }

      await fs.writeFile(bundlePath, svgBuilder.build(atlas))
    })
  },
})

module.exports = SvgLoaderPlugin
