const fs = require('fs/promises')
const path = require('path')
const os = require('os')
const esbuild = require('esbuild')
const chokidar = require('chokidar')
const terser = require('terser')
const cp = require('child_process')
const CssModulesPlugin = require('./css-modules-plugin')
const SvgLoaderPlugin = require('./svg-loader-plugin')

const isProduction = process.env.NODE_ENV === 'production'
const isEngineTest = process.argv.some((arg) => arg === '--engine-test')
const watch = process.argv.some((arg) => arg === '--watch')
const buildRustOnly = process.argv.some((arg) => arg === '--rust')

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

  if (isProduction) {
    // NASTY HACKS: Manual optimizations of the generated JS wrapper.

    const wasmWrapperFile = path.join(__dirname, '../worklets/pkg/modulate.js')
    let wasmWrapper = (await fs.readFile(wasmWrapperFile)).toString('utf-8')

    // Remove assignment to `__wbg_init` member which is never used.
    // This assignment prevents tree shaking and bloats the minified build.
    wasmWrapper = wasmWrapper.replace(
      '__wbg_init.__wbindgen_wasm_module = module;',
      ''
    )

    // Replace custom debug print function usage with JSON.stringify
    wasmWrapper = wasmWrapper.replace(
      'const ret = debugString',
      'const ret = JSON.stringify'
    )

    // Optimized initialisation function
    wasmWrapper = wasmWrapper
      .replace('function initSync', 'function initSync_old')
      .replace('export { initSync };', '')

    wasmWrapper += `
      export function initSync({ module, memory }) {
        const imports = __wbg_get_imports()
        imports.wbg.memory = memory
        const instance = new WebAssembly.Instance(
          new WebAssembly.Module(module),
          imports
        )
        
        wasm = instance.exports
        wasm.__wbindgen_start()
        return wasm
      }
    `

    await fs.writeFile(wasmWrapperFile, wasmWrapper)
  }

  const entry = isEngineTest
    ? path.join(__dirname, '../client/src/engine-test-index.ts')
    : path.join(__dirname, '../client/src/index.tsx')

  const buildDir = await fs.mkdtemp(path.join(os.tmpdir(), 'modulate-'))

  await Promise.all([
    esbuild.build({
      entryPoints: [entry],
      bundle: true,
      outdir: buildDir,
      metafile: true,
      treeShaking: true,
      minify: isProduction,
      define: {
        __DEBUG__: isProduction ? 'false' : 'true',
      },
      plugins: [CssModulesPlugin(), SvgLoaderPlugin()],
    }),
    recursiveCopy(
      path.join(__dirname, '../client/static'),
      path.join(__dirname, '../dist/client')
    ),
  ])

  const scriptsPath = path.join(
    buildDir,
    isEngineTest ? './engine-test-index.js' : './index.js'
  )

  if (isProduction) {
    await terser
      .minify((await fs.readFile(scriptsPath)).toString(), {
        sourceMap: false,
        compress: {
          passes: 4,
          inline: false,
          unsafe: true,
          // The only reason this is currently set to `false` instead of true
          // is that one `getContext` call required the `willReadFrequently`
          // option to be set true. Only `true` or `false` is allowed, truthy
          // values other `true` will throw an error.
          booleans_as_integers: false,
        },
        mangle: {
          toplevel: true,
        },
      })
      .then((minified) => fs.writeFile(scriptsPath, minified.code))
  }

  const scriptsFile = (await fs.readFile(scriptsPath)).toString('utf-8')
  const indexFile = (
    await fs.readFile(path.join(__dirname, '../client/static/index.html'))
  ).toString('utf-8')
  const stylesFile = (
    await fs.readFile(path.join(buildDir, './index.css'))
  ).toString('utf-8')
  const svgAtlas = (
    await fs.readFile(path.join(buildDir, './atlas.svg'))
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

  generatedIndex = replaceWithoutSpecialReplacements(
    generatedIndex,
    '{%SVG_ATLAS%}',
    svgAtlas
  )

  await fs.writeFile(
    path.join(__dirname, '../dist/client/index.html'),
    generatedIndex
  )
  await fs.rm(buildDir, { recursive: true, force: true })

  console.timeEnd('Build client')
}

const buildRust = async () => {
  console.time('Build rust')
  return new Promise((resolve, reject) => {
    const proc = cp.spawn('wasm-pack', [
      'build',
      process.env.NODE_ENV === 'test' ? '--dev' : '--release',
      './worklets/',
      '--target',
      'web',
    ])

    proc.stderr.pipe(process.stderr)

    proc.addListener('exit', (code) => {
      if (code === 0) {
        console.timeEnd('Build rust')
        resolve()
      } else {
        reject(code)
      }
    })
  })
}

const buildWorklets = async () => {
  console.time('Build worklets')
  const polyfill = await fs.readFile(
    path.join(__dirname, '../worklets/src/polyfill.js')
  )

  const entries = {
    'audio-worklet': { needsTextDecoderPolyfill: false },
    'main-worker': { needsTextDecoderPolyfill: true },
    'thread-worker': { needsTextDecoderPolyfill: true },
  }

  for (const [entry, options] of Object.entries(entries)) {
    console.time(`Build worklet ${entry}`)
    await esbuild
      .build({
        entryPoints: [path.join(__dirname, `../worklets/src/${entry}.ts`)],
        bundle: true,
        write: false,
        minify: isProduction,
        define: {
          Response: 'undefined',
          Request: 'undefined',
          URL: 'undefined',
        },
      })
      .then(
        (res) =>
          (options.needsTextDecoderPolyfill ? polyfill : '') +
          new TextDecoder().decode(res.outputFiles[0].contents)
      )
      .then((code) => {
        if (!isProduction) return code

        return terser
          .minify(code, {
            sourceMap: false,
            compress: {
              passes: 3,
            },
            mangle: {
              module: true,
            },
          })
          .then((minified) => minified.code)
      })
      .then((code) =>
        fs.writeFile(
          path.join(__dirname, `../dist/client/assets/${entry}.js`),
          code
        )
      )
    console.timeEnd(`Build worklet ${entry}`)
  }

  await fs.copyFile(
    path.join(__dirname, '../worklets/pkg/modulate_bg.wasm'),
    path.join(__dirname, '../dist/client/assets/modulate.wasm')
  )

  console.timeEnd('Build worklets')
}

;(async () => {
  try {
    await fs.mkdir(path.join(__dirname, '../dist/client/assets'), {
      recursive: true,
    })
  } catch (err) {
    if (err.code !== 'EEXIST') {
      console.error(err)
      process.exit(1)
    }
  }

  try {
    await buildRust()

    if (buildRustOnly) {
      process.exit(0)
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
    await Promise.all([buildWorklets(), buildClient()])
  } catch (err) {
    console.error(err)
    if (!watch) {
      process.exit(1)
    }
  }

  if (!watch) {
    process.exit(0)
  }

  chokidar
    .watch(['./worklets/src/**/*.ts', './worklets/pkg/**/*'], {
      persistent: true,
      ignoreInitial: true,
      ignored: /wasm\.ts/,
    })
    .on(
      'all',
      debounce(() => buildWorklets().catch(console.error))
    )

  chokidar
    .watch(['./worklets/src/**/*.rs'], {
      persistent: true,
      ignoreInitial: true,
    })
    .on(
      'all',
      debounce(() => buildRust().catch(() => {}))
    )

  chokidar
    .watch(['./client/src/**/*', './common/**/*'], {
      persistent: true,
      ignoreInitial: true,
      ignored: /\.d\.ts/,
    })
    .on(
      'all',
      debounce(() => buildClient().catch(() => {}))
    )
})()
