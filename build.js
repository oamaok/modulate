const fs = require('fs/promises')
const path = require('path')
const os = require('os')
const esbuild = require('esbuild')
const chokidar = require('chokidar')
const terser = require('terser')
const cp = require('child_process')
const CssModulesPlugin = require('./build/css-modules-plugin')

const isProduction = process.env.NODE_ENV === 'production'

const debounce = (fn) => {
  let timeout = null

  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), 200)
  }
}

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
      let existsAsNonDirectory = false
      try {
        const destStats = await fs.stat(destPath)
        if (!destStats.isDirectory()) {
          existsAsNonDirectory = true
        }
      } catch (err) {
        await fs.mkdir(destPath)
      }

      if (existsAsNonDirectory) {
        throw new Error(
          `Destination path exists and is not a directory: ${destPath}`
        )
      }

      entryStack.push(
        ...(await fs.readdir(entryPath)).map((e) => path.join(entry, e))
      )
    } else {
      await fs.copyFile(entryPath, destPath)
    }
  }
}

// The JS source might include dollar signs, and in one special case a combination of '$&'.
// This causes the embedded source file to include the string intended to be replaced,
// which broke the whole thing.
const replaceWithoutSpecialReplacements = (string, pattern, replacement) => {
  const index = string.indexOf(pattern)
  const beforeSlice = string.substring(0, index)
  const afterSlice = string.substring(index + pattern.length)
  return `${beforeSlice}${replacement}${afterSlice}`
}

const buildClient = async () => {
  console.time('Build client')

  const buildDir = await fs.mkdtemp(path.join(os.tmpdir(), 'modulate-'))

  await Promise.all([
    esbuild.build({
      entryPoints: ['./client/src/index.tsx'],
      bundle: true,
      outdir: buildDir,
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

  const scriptsFile = (
    await fs.readFile(path.join(buildDir, './index.js'))
  ).toString('utf-8')
  const indexFile = (await fs.readFile('./client/static/index.html')).toString(
    'utf-8'
  )
  const stylesFile = (
    await fs.readFile(path.join(buildDir, './index.css'))
  ).toString('utf-8')

  let generatedIndex = indexFile
  generatedIndex = replaceWithoutSpecialReplacements(
    generatedIndex,
    '{%STYLES%}',
    `<style>${stylesFile}</style>`
  )
  generatedIndex = replaceWithoutSpecialReplacements(
    generatedIndex,
    '{%SCRIPT%}',
    `<script>${scriptsFile}</script>`
  )

  await fs.writeFile('./dist/client/index.html', generatedIndex)

  await fs.rmdir(buildDir, { recursive: true, force: true })

  console.timeEnd('Build client')
}

const buildRust = async () => {
  return new Promise((resolve, reject) => {
    const proc = cp.spawn('wasm-pack', [
      'build',
      './worklets/',
      '--target',
      'web',
      '--release',
    ])

    proc.stderr.pipe(process.stderr)

    proc.addListener('exit', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(code)
      }
    })
  })
}

const buildWorklets = async () => {
  console.time('Build worklets')

  const polyfill = await fs.readFile('./worklets/src/polyfill.js')

  await esbuild
    .build({
      entryPoints: [`./worklets/src/index.ts`],
      bundle: true,
      write: false,
      incremental: true,
      minify: isProduction,
      define: {
        Response: 'undefined',
        Request: 'undefined',
        URL: 'undefined',
      },
    })
    .then((res) => {
      return fs.writeFile(
        `./dist/client/assets/worklets.js`,
        polyfill + new TextDecoder().decode(res.outputFiles[0].contents)
      )
    })

  await terser
    .minify(
      (await fs.readFile('./dist/client/assets/worklets.js')).toString(),
      {
        sourceMap: true,
        compress: {
          passes: 3,
        },
        mangle: {
          module: true,
        },
      }
    )
    .then(async (minified) => {
      await fs.writeFile('dist/client/assets/worklets.js', minified.code)
    })

  await fs.copyFile(
    './worklets/pkg/worklets_bg.wasm',
    './dist/client/assets/worklets.wasm'
  )

  console.timeEnd('Build worklets')
}

;(async () => {
  try {
    await fs.mkdir('./dist')
  } catch (err) {}

  try {
    await buildRust()
    await new Promise((resolve) => setTimeout(resolve, 500))
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
    .watch(['./worklets/src/**/*.ts', './worklets/pkg/**/*'], {
      persistent: true,
      ignoreInitial: true,
    })
    .on('all', debounce(buildWorklets))

  chokidar
    .watch(['./worklets/src/**/*.rs'], {
      persistent: true,
      ignoreInitial: true,
    })
    .on('all', debounce(buildRust))

  chokidar
    .watch('./client/src/**/*', {
      persistent: true,
      ignoreInitial: true,
    })
    .on('all', debounce(buildClient))
})()
