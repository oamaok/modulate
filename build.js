const fs = require('fs/promises')
const path = require('path')
const esbuild = require('esbuild')
const chokidar = require('chokidar')
const CssModulesPlugin = require('./build/css-modules-plugin')

const recursiveCopy = async (srcDir, destDir) => {
  const absoluteSrc = path.resolve(__dirname, srcDir)
  const absoluteDest = path.resolve(__dirname, destDir)
  let entryStack = await fs.readdir(srcDir)
  let entry

  while ((entry = entryStack.pop())) {
    const entryPath = path.resolve(absoluteSrc, entry)
    const stats = await fs.stat(entryPath)

    const destPath = path.join(absoluteDest, entry)
    if (stats.isDirectory()) {
      try {
        const destStats = await fs.stat(destPath)
        if (!destStats.isDirectory()) {
          throw new Error(
            `Destination path exists and is not a directory: ${destPath}`
          )
        }
      } catch (err) {
        await fs.mkdir(destPath)
      }

      entryStack.push(
        ...(await fs.readdir(entryPath)).map((e) => path.join(entry, e))
      )
    } else {
      await fs.copyFile(entryPath, destPath)
    }
  }
}

const buildClient = async () => {
  console.time('Build client')

  await Promise.all([
    esbuild.build({
      entryPoints: ['./client/src/index.tsx'],
      bundle: true,
      //outfile: './dist/client/assets/main.js',
      outdir: './dist/client/assets',
      incremental: true,
      jsxFactory: 'h',
      jsxFragment: 'Fragment',
      minify: true,
      define: {
        'process.env.NODE_ENV': '"production"',
      },

      plugins: [CssModulesPlugin()],
    }),
    recursiveCopy('./client/static', './dist/client'),
  ])

  console.timeEnd('Build client')
}

const buildWorklets = async () => {
  console.time('Build worklets')

  const worklets = (await fs.readdir('./client/worklets'))
    .filter((worklet) => worklet.endsWith('.ts'))
    .map((worklet) => worklet.split('.')[0])

  await Promise.all(
    worklets.map((worklet) =>
      esbuild.build({
        entryPoints: [`./client/worklets/${worklet}.ts`],
        bundle: true,
        outfile: `./dist/client/worklets/${worklet}.js`,
        incremental: true,
        minify: false,
      })
    )
  )

  await fs.writeFile(
    './client/src/generated/worklets.ts',
    `// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//
// THIS IS A GENERATED FILE, DO NOT EDIT MANUALLY
//
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
${worklets
  .map((worklet) => `import ${worklet} from '../../worklets/${worklet}'`)
  .join('\n')}
export const workletNames = ${JSON.stringify(worklets)} as const
export type Worklets = {
${worklets.map((worklet) => `  ${worklet}: typeof ${worklet}`).join('\n')}
}
`
  )
  console.timeEnd('Build worklets')
}

const buildServer = () => {}

;(async () => {
  await buildWorklets()
  await buildClient()
  await buildServer()

  chokidar
    .watch('./worklets/*', {
      persistent: true,
      ignoreInitial: true,
    })
    .on('all', buildWorklets)

  chokidar
    .watch('./client/**/*', {
      persistent: true,
      ignoreInitial: true,
    })
    .on('all', buildClient)
})()
