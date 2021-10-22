const fs = require('fs/promises')
const path = require('path')
const esbuild = require('esbuild')
const chokidar = require('chokidar')
const CssModulesPlugin = require('./build/css-modules-plugin')

const isProduction = process.env.NODE_ENV === 'production'

const recursiveCopy = async (srcDir, destDir) => {
  const absoluteSrc = path.resolve(__dirname, srcDir)
  const absoluteDest = path.resolve(__dirname, destDir)

  try {
    await fs.mkdir(absoluteDest)
  } catch (err) {}

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
      minify: isProduction,
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
    .filter((worklet) => worklet.match(/^[A-Z].+\.ts$/))
    .map((worklet) => worklet.split('.')[0])

  console.log(worklets)

  await Promise.all(
    worklets.map((worklet) =>
      esbuild.build({
        entryPoints: [`./client/worklets/${worklet}.ts`],
        bundle: true,
        outfile: `./dist/client/worklets/${worklet}.js`,
        incremental: true,
        minify: isProduction,
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

;(async () => {
  try {
    await fs.mkdir('./dist')
  } catch (err) {}

  try {
    await Promise.all([buildWorklets(), buildClient()])
  } catch (err) {
    console.error(err)
    if (isProduction) {
      process.exit(1)
    }
  }
  if (isProduction) {
    process.exit(0)
  }

  chokidar
    .watch('./client/worklets/*', {
      persistent: true,
      ignoreInitial: true,
    })
    .on('all', buildWorklets)

  chokidar
    .watch('./client/src/**/*', {
      persistent: true,
      ignoreInitial: true,
    })
    .on('all', buildClient)
})()
