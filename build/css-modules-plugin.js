const fs = require('fs/promises')
const { resolve } = require('path')
const postcss = require('postcss')
const postcssModules = require('postcss-modules')
const cssnano = require('cssnano')

const classNames = {}

let currentId = 0

const emoji = [
  '😀',
  '😃',
  '😄',
  '😁',
  '😆',
  '😅',
  '🤣',
  '😂',
  '🙂',
  '🙃',
  '😉',
  '😊',
  '😇',
  '🥰',
  '😍',
  '🤩',
  '😘',
  '😗',
  '😚',
  '😙',
  '🥲',
  '😋',
  '😛',
  '😜',
  '🤪',
  '😝',
  '🤑',
  '🤗',
  '🤭',
  '🤫',
  '🤔',
  '🤐',
  '🤨',
  '😐',
  '😑',
  '😶',
  '😏',
  '😒',
  '🙄',
  '😬',
  '🤥',
  '😌',
  '😔',
  '😪',
  '🤤',
  '😴',
  '😷',
  '🤒',
  '🤕',
  '🤢',
  '🤮',
  '🤧',
  '🥵',
  '🥶',
  '🥴',
  '😵',
  '😵‍💫',
  '🤯',
  '🤠',
  '🥳',
  '🥸',
  '😎',
  '🤓',
  '🧐',
  '😕',
  '😟',
  '🙁',
  '☹️',
  '😮',
  '😯',
  '😲',
  '😳',
  '🥺',
  '😦',
  '😧',
  '😨',
  '😰',
  '😥',
  '😢',
  '😭',
  '😱',
  '😖',
  '😣',
  '😞',
  '😓',
  '😩',
  '😫',
  '🥱',
  '😤',
  '😡',
  '😠',
  '🤬',
]

const nextName = () => {
  let id = currentId++
  let name = ''
  for (;;) {
    const mod = id % emoji.length
    name += emoji[mod]
    if (id < emoji.length) return name
    id = (id - mod) / emoji.length - 1
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
              classNames[filePath][name] = nextName()
            }

            const scopedName = classNames[filePath][name]
            return scopedName
          },
        }),
      ]).process(await fs.readFile(filePath))

      cssContent[filePath] = css

      return {
        contents: `export default ${JSON.stringify(classNameMap)}`,
      }
    })

    build.onEnd(async () => {
      const bundlePath = resolve(build.initialOptions.outdir, 'index.css')

      const { css } = await postcss([cssnano({ preset: 'default' })]).process(
        Object.keys(cssContent)
          .sort()
          .reverse()
          .map((key) => cssContent[key])
          .join('\n')
      )

      await fs.writeFile(bundlePath, css)
    })
  },
})

module.exports = CssModulesPlugin
