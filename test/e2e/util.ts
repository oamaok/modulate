import { ModuleName } from '@modulate/worklets/src/modules'
import { APIRequestContext, Locator, Page, expect } from '@playwright/test'

export const getByTestId = (page: Page, id: string) =>
  page.locator(`[data-test-id=${id}]`)

export const testLocator = (attributes: Record<string, string | number>) => {
  let locator = ''
  for (const key in attributes) {
    locator += `[data-test-${key}="${attributes[key]}"]`
  }
  return locator
}

export const init = async (page: Page, path = '/') => {
  await page.goto(path)
  await getByTestId(page, 'initialize').click()
  await expect(page.locator('[data-test-initialized="true"]')).toHaveCount(1)

  page.on('console', (message) => {
    if (message.type() === 'error') {
      if (message.text().includes('Failed to load resource')) {
        return
      }

      throw new Error(message.text())
    }
  })
}

export const resetDatabase = async (request: APIRequestContext) => {
  const res = await request.get('/api/test/reset-dataset')
  if (res.status() !== 200) {
    throw new Error((await res.body()).toString())
  }
}

export const mapLocator = async <T>(
  locator: Locator,
  mapper: (l: Locator) => T | Promise<T>
): Promise<T[]> => {
  const count = await locator.count()
  const ret: T[] = []
  for (let i = 0; i < count; i++) {
    ret.push(await mapper(locator.nth(i)))
  }
  return ret
}

export const spawnModule = async (
  page: Page,
  name: ModuleName,
  position: { x: number; y: number }
) => {
  await page.mouse.move(position.x, position.y)
  await getByTestId(page, 'cables').click({ button: 'right', position })
  await getByTestId(page, 'context-menu-item')
    .and(page.locator(`[data-test-context-menu-item-name="${name}"]`))
    .click()

  const moduleId = await getByTestId(page, 'module')
    .last()
    .getAttribute('data-test-module-id')

  expect(moduleId).toBeDefined()

  return page.locator(
    testLocator({
      id: 'module',
      'module-id': moduleId!,
    })
  )
}

export const clickMenuItem = async (page: Page, item: string) => {
  await page
    .locator(
      testLocator({
        id: 'menu-item',
        'item-id': item,
      })
    )
    .click()
}

export const getModuleById = (page: Page, id: string) => {
  return page.locator(`[data-test-id=module][data-test-module-id="${id}"]`)
}

export const getModuleId = async (module: Locator) => {
  const id = await module.getAttribute('data-test-module-id')
  expect(id).toBeDefined()
  return id!
}

export const getModuleKnobs = async (module: Locator) => {
  return module.locator(
    testLocator({
      id: 'knob',
    })
  )
}

export const getModuleKnob = async (module: Locator, param: number) => {
  return module.locator(
    testLocator({
      id: 'knob',
      'knob-param': param,
    })
  )
}

export const tweakKnob = async (
  page: Page,
  knob: Locator,
  pxAmount: number
) => {
  await expect(knob).toHaveCount(1)
  const knobBox = (await knob.boundingBox())!
  expect(knobBox).toBeDefined()

  const startPos = {
    x: knobBox.x + knobBox.width / 2,
    y: knobBox.y + knobBox.height / 2,
  }

  await page.mouse.move(startPos.x, startPos.y)
  await page.mouse.down()
  await page.mouse.move(startPos.x, startPos.y - pxAmount)
  await page.mouse.up()
}

export const getKnobValue = async (knob: Locator) => {
  await expect(knob).toHaveCount(1)
  const value = await knob.getAttribute('data-test-value')
  expect(value).toBeDefined()
  return parseFloat(value!)
}

export const getModuleSocket = (
  module: Locator,
  type: 'output' | 'parameter' | 'input',
  index: number
) => {
  return module
    .locator(
      testLocator({
        id: 'socket-wrapper',
        type,
        index,
      })
    )
    .locator('[data-test-id=socket]')
}

export const getCableSelector = async ({
  from,
  to,
  fromIndex,
  toIndex,
  toType,
}: {
  from: Locator
  to: Locator
  fromIndex: number
  toIndex: number
  toType: 'input' | 'parameter'
}) => {
  const fromId = await getModuleId(from)
  const toId = await getModuleId(to)
  return testLocator({
    id: 'cable',
    'from-module-id': fromId,
    'to-module-id': toId,
    'from-index': fromIndex,
    'to-index': toIndex,
    'to-type': toType,
  })
}

export const getCable = async (
  page: Page,
  {
    from,
    to,
    fromIndex,
    toIndex,
    toType,
  }: {
    from: Locator
    to: Locator
    fromIndex: number
    toIndex: number
    toType: 'input' | 'parameter'
  }
) => {
  return page.locator(
    await getCableSelector({
      from,
      to,
      fromIndex,
      toIndex,
      toType,
    })
  )
}

export const getCableDetails = async (cable: Locator) => {
  const cableId = await cable.getAttribute('data-test-cable-id')
  const fromModuleId = await cable.getAttribute('data-test-from-module-id')
  const fromIndex = await cable.getAttribute('data-test-from-index')
  const toModuleId = await cable.getAttribute('data-test-to-module-id')
  const toIndex = await cable.getAttribute('data-test-to-index')
  const toType = await cable.getAttribute('data-test-to-type')

  return { cableId, fromModuleId, fromIndex, toModuleId, toIndex, toType }
}

export const connectSockets = async (
  page: Page,
  socketA: Locator,
  socketB: Locator
) => {
  await socketA.dragTo(socketB)
}

export const deleteModule = async (page: Page, module: Locator) => {
  await module
    .locator('[data-test-id=module-header]')
    .click({ position: { x: 10, y: 10 } })
  await page.keyboard.press('Delete')
  await expect(module).toHaveCount(0)
}

export const loginAsUser = async (
  page: Page,
  email: string,
  password: string
) => {
  await page.locator('[data-test-id="login"]').click()
  await page.locator('[data-test-id="email"]').click()
  await page.locator('[data-test-id="email"]').fill(email)
  await page.locator('[data-test-id="email"]').press('Tab')
  await page.locator('[data-test-id="password"]').fill(password)
  await page.locator('[data-test-id="login-button"]').click()

  await expect(page.locator(`[data-test-id="logout"]`)).toHaveCount(1)
}
