const fs = require('fs/promises')
const { resolve } = require('path')
const postcss = require('postcss')
const postcssModules = require('postcss-modules')
const cssnano = require('cssnano')

const classNames = {}

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

const CssModulesPlugin = () => ({
  name: 'CssModulesPlugin',
  setup(build) {
    const cssContent = {}

    build.onLoad({ filter: /\.css$/ }, async ({ resolveDir, path }) => {
      const filePath = resolve(resolveDir, path)
      classNames[filePath] = classNames[filePath] ?? {}
      let classNameMap = {}
      const { css } = await postcss([
        postcssModules({
          getJSON(_, map) {
            classNameMap = map
          },
          generateScopedName(name) {
            if (!classNames[filePath][name]) {
              if (process.env.NODE_ENV === 'production') {
                classNames[filePath][name] = nextName()
              } else {
                const moduleName = filePath.split('/').pop().split('.')[0]
                classNames[filePath][name] = `${moduleName}__${name}`
              }
            }

            const scopedName = classNames[filePath][name]
            return scopedName
          },
        }),
      ]).process(await fs.readFile(filePath))

      cssContent[filePath] = css

      return {
        contents: `
          import classNames from '@modulate/client/src/classNames'
          export default classNames(${JSON.stringify(classNameMap)})
        `,
      }
    })

    build.onEnd(async () => {
      const bundlePath = resolve(build.initialOptions.outdir, 'index.css')

      const rawCss = Object.keys(cssContent)
        .sort()
        .reverse()
        .map((key) => cssContent[key])
        .join('\n')

      if (process.env.NODE_ENV === 'production') {
        const { css } = await postcss([cssnano({ preset: 'default' })]).process(
          rawCss
        )

        await fs.writeFile(bundlePath, css)
      } else {
        await fs.writeFile(bundlePath, rawCss)
      }
    })
  },
})

module.exports = CssModulesPlugin
