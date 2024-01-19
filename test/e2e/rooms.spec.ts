import { test, expect, Page, BrowserContext } from '@playwright/test'
import { modules } from '@modulate/worklets/src/modules'
import {
  clickMenuItem,
  connectSockets,
  getCable,
  getCableDetails,
  getKnobValue,
  getModuleById,
  getModuleId,
  getModuleKnob,
  getModuleSocket,
  init,
  loginAsUser,
  resetDatabase,
  spawnModule,
  tweakKnob,
} from './util'

const USERS = ['alice', 'bob', 'carlos'] as const
const SAMPLE_PATCH_ID = '9982d3c7-8ffd-43a7-8431-53d6a31de913'
const OSCILLATOR_ID = '2wluI1S8LrgHAvzw'

test.only('rooms should stay synced over different changes', async ({
  browser,
  browserName,
  request,
}) => {
  test.skip(browserName === 'firefox', 'FIXME')

  test.setTimeout(1000 * 60)
  await resetDatabase(request)

  const contexts: BrowserContext[] = []
  const pages = {} as { [x in (typeof USERS)[number]]: Page }

  for (const user of USERS) {
    const context = await browser.newContext()
    contexts.push(context)
    const page = await context.newPage()
    pages[user] = page

    await init(page, '/')
    await loginAsUser(page, `${user}@example.com`, 'password')
  }

  await init(pages.alice, `/patch/${SAMPLE_PATCH_ID}`)
  await clickMenuItem(pages.alice, 'create-room')

  await pages.alice.waitForSelector('[data-test-is-room="true"]')
  expect(pages.alice.url()).toContain('/room/')

  const roomLink = pages.alice.url()

  await init(pages.bob, roomLink)
  await init(pages.carlos, roomLink)

  const cvParam = modules.Oscillator.parameters.indexOf('cv')

  const aliceOsc = getModuleById(pages.alice, OSCILLATOR_ID)
  const bobOsc = getModuleById(pages.bob, OSCILLATOR_ID)
  const carlosOsc = getModuleById(pages.carlos, OSCILLATOR_ID)
  const aliceOscCV = await getModuleKnob(aliceOsc, cvParam)
  const bobOscCV = await getModuleKnob(bobOsc, cvParam)
  const carlosOscCV = await getModuleKnob(carlosOsc, cvParam)

  expect(await getKnobValue(bobOscCV)).toEqual(await getKnobValue(aliceOscCV))
  expect(await getKnobValue(carlosOscCV)).toEqual(
    await getKnobValue(aliceOscCV)
  )

  await tweakKnob(pages.alice, aliceOscCV, 100)

  expect(await getKnobValue(bobOscCV)).toEqual(await getKnobValue(aliceOscCV))
  expect(await getKnobValue(carlosOscCV)).toEqual(
    await getKnobValue(aliceOscCV)
  )

  const bobNewOsc = await spawnModule(pages.bob, 'Oscillator', {
    x: 470,
    y: 440,
  })
  const newOscId = await getModuleId(bobNewOsc)

  await bobNewOsc.waitFor()

  const aliceNewOsc = await getModuleById(pages.alice, newOscId)
  const carlosNewOsc = await getModuleById(pages.carlos, newOscId)

  await aliceNewOsc.waitFor()
  await carlosNewOsc.waitFor()

  expect(await getModuleId(aliceNewOsc)).toEqual(newOscId)
  expect(await getModuleId(carlosNewOsc)).toEqual(newOscId)

  await connectSockets(
    pages.carlos,
    await getModuleSocket(carlosNewOsc, 'output', 0),
    await getModuleSocket(
      getModuleById(pages.carlos, OSCILLATOR_ID),
      'input',
      0
    )
  )

  const aliceNewCable = await getCable(pages.alice, {
    from: aliceNewOsc,
    fromIndex: 0,
    to: aliceOsc,
    toType: 'input',
    toIndex: 0,
  })
  const bobNewCable = await getCable(pages.bob, {
    from: bobNewOsc,
    fromIndex: 0,
    to: bobOsc,
    toType: 'input',
    toIndex: 0,
  })
  const carlosNewCable = await getCable(pages.carlos, {
    from: carlosNewOsc,
    fromIndex: 0,
    to: carlosOsc,
    toType: 'input',
    toIndex: 0,
  })

  await aliceNewCable.waitFor()
  await bobNewCable.waitFor()
  await carlosNewCable.waitFor()

  expect(await getCableDetails(aliceNewCable)).toEqual(
    await getCableDetails(carlosNewCable)
  )
  expect(await getCableDetails(bobNewCable)).toEqual(
    await getCableDetails(carlosNewCable)
  )

  for (const context of contexts) {
    context.close()
  }
})
