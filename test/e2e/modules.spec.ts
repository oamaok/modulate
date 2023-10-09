import { modules } from '@modulate/worklets/src/modules'
import { test, expect } from '@playwright/test'
import {
  spawnModule,
  connectSockets,
  getModuleSocket,
  init,
  deleteModule,
  getCable,
  getModuleKnobs,
  tweakKnob,
  getKnobValue,
} from './util'

test.beforeEach(async ({ page }) => {
  await init(page)
})

test('can spawn modules', async ({ page }) => {
  const adsrModule = await spawnModule(page, 'ADSR', { x: 500, y: 200 })

  expect(
    await adsrModule.locator('[data-test-id=module-header]').textContent()
  ).toEqual('ADSR')

  const adsrModuleLocation = await adsrModule.boundingBox()

  expect({ x: adsrModuleLocation?.x, y: adsrModuleLocation?.y }).toEqual({
    x: 500,
    y: 200,
  })
})

test('can move modules', async ({ page }) => {
  const adsrModule = await spawnModule(page, 'ADSR', { x: 500, y: 200 })

  const header = await adsrModule.locator('[data-test-id=module-header]')
  await header.hover()
  await page.mouse.down()
  await page.mouse.move(200, 500)
  await page.mouse.up()

  const adsrModuleLocation = await adsrModule.boundingBox()

  expect({ x: adsrModuleLocation?.x, y: adsrModuleLocation?.y }).toEqual({
    x: 75,
    y: 487,
  })
})

test('can connect two modules', async ({ page }) => {
  const gainModule = await spawnModule(page, 'Gain', { x: 200, y: 200 })
  const audioOutModule = await spawnModule(page, 'AudioOut', { x: 500, y: 200 })

  await connectSockets(
    page,
    getModuleSocket(gainModule, 'output', 0),
    getModuleSocket(audioOutModule, 'input', 0)
  )

  const cable = await getCable(page, {
    from: gainModule,
    fromIndex: 0,
    to: audioOutModule,
    toIndex: 0,
    toType: 'input',
  })

  await expect(cable).toHaveCount(1)
})

test('can connect/disconnect any module output to/from any module input/parameter', async ({
  page,
}) => {
  test.setTimeout(1000 * 60 * 10)

  let fromModuleName: keyof typeof modules
  let toModuleName: keyof typeof modules

  for (fromModuleName in modules) {
    if (modules[fromModuleName].outputs.length === 0) {
      continue
    }

    const fromModule = await spawnModule(page, fromModuleName, {
      x: 200,
      y: 200,
    })

    for (toModuleName in modules) {
      if (
        modules[toModuleName].parameters.length === 0 &&
        modules[toModuleName].inputs.length === 0
      ) {
        continue
      }

      const toModule = await spawnModule(page, toModuleName, { x: 700, y: 200 })

      for (
        let outputIndex = 0;
        outputIndex < modules[fromModuleName].outputs.length;
        outputIndex++
      )
        for (
          let inputIndex = 0;
          inputIndex < modules[toModuleName].inputs.length;
          inputIndex++
        ) {
          const fromSocket = await getModuleSocket(
            fromModule,
            'output',
            outputIndex
          )
          if ((await fromSocket.count()) === 0) {
            continue
          }

          const toSocket = await getModuleSocket(toModule, 'input', inputIndex)
          if ((await toSocket.count()) === 0) {
            continue
          }

          await connectSockets(page, fromSocket, toSocket)

          const cable = await getCable(page, {
            from: fromModule,
            fromIndex: outputIndex,
            to: toModule,
            toIndex: inputIndex,
            toType: 'input',
          })

          expect(await cable.count()).toEqual(1)

          // Disconnect cable
          await toSocket.hover()
          await page.mouse.down()
          await page.mouse.move(100, 100)
          await page.mouse.up()

          expect(await cable.count()).toEqual(0)
        }

      for (
        let outputIndex = 0;
        outputIndex < modules[fromModuleName].outputs.length;
        outputIndex++
      )
        for (
          let paramIndex = 0;
          paramIndex < modules[toModuleName].inputs.length;
          paramIndex++
        ) {
          const fromSocket = await getModuleSocket(
            fromModule,
            'output',
            outputIndex
          )
          if ((await fromSocket.count()) === 0) {
            continue
          }

          const toSocket = await getModuleSocket(
            toModule,
            'parameter',
            paramIndex
          )
          if ((await toSocket.count()) === 0) {
            continue
          }

          await connectSockets(page, fromSocket, toSocket)

          const cable = await getCable(page, {
            from: fromModule,
            fromIndex: outputIndex,
            to: toModule,
            toIndex: paramIndex,
            toType: 'parameter',
          })

          expect(await cable.count()).toEqual(1)

          // Disconnect cable
          await toSocket.hover()
          await page.mouse.down()
          await page.mouse.move(100, 100)
          await page.mouse.up()

          expect(await cable.count()).toEqual(0)
        }

      await deleteModule(page, toModule)
    }

    await deleteModule(page, fromModule)
  }
})

test('can tweak all knobs of all modules', async ({ page }) => {
  test.setTimeout(1000 * 60 * 10)
  await init(page)

  let moduleName: keyof typeof modules
  for (moduleName in modules) {
    const module = await spawnModule(page, moduleName, { x: 200, y: 200 })

    const knobs = await getModuleKnobs(module)
    const knobCount = await knobs.count()

    for (let i = 0; i < knobCount; i++) {
      const knob = await knobs.nth(i)

      const initialValue = await getKnobValue(knob)
      await tweakKnob(page, knob, 20)
      const increasedValue = await getKnobValue(knob)
      // Allow equal values if knob starts at maximum position
      expect(increasedValue).toBeGreaterThanOrEqual(initialValue)

      await tweakKnob(page, knob, -30)
      const decreasedValue = await getKnobValue(knob)
      expect(decreasedValue).toBeLessThan(increasedValue)
    }

    await deleteModule(page, module)
  }
})

test('can delete modules', async ({ page }) => {
  const gainModule = await spawnModule(page, 'Gain', { x: 200, y: 200 })

  await deleteModule(page, gainModule)

  await expect(gainModule).toHaveCount(0)
})

test('can delete connected modules', async ({ page }) => {
  const gainModule = await spawnModule(page, 'Gain', { x: 200, y: 200 })
  const audioOutModule = await spawnModule(page, 'AudioOut', { x: 500, y: 200 })

  await connectSockets(
    page,
    getModuleSocket(gainModule, 'output', 0),
    getModuleSocket(audioOutModule, 'input', 0)
  )

  await deleteModule(page, gainModule)

  await expect(gainModule).toHaveCount(0)

  const cablePath = page.locator('path')
  await expect(cablePath).toHaveCount(0)
})

test('can disconnect modules', async ({ page }) => {
  const gainModule = await spawnModule(page, 'Gain', { x: 200, y: 200 })
  const audioOutModule = await spawnModule(page, 'AudioOut', { x: 500, y: 200 })

  await connectSockets(
    page,
    getModuleSocket(gainModule, 'output', 0),
    getModuleSocket(audioOutModule, 'input', 0)
  )

  await getModuleSocket(audioOutModule, 'input', 0).hover()
  await page.mouse.down()
  await page.mouse.move(100, 100)
  await page.mouse.up()

  const cable = await getCable(page, {
    from: gainModule,
    fromIndex: 0,
    to: audioOutModule,
    toIndex: 0,
    toType: 'input',
  })
  await expect(cable).toHaveCount(0)
})
