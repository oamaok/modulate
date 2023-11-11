import { test, expect } from '@playwright/test'
import {
  getByTestId,
  getCableDetails,
  getModuleId,
  init,
  mapLocator,
} from './util'

const SAMPLE_PATCH_ID = '9982d3c7-8ffd-43a7-8431-53d6a31de913'

test('can load patch by loading patch link', async ({ page }) => {
  await init(page, `/patch/${SAMPLE_PATCH_ID}`)

  const modules = await page.locator('[data-test-id="module"]')
  await expect(modules).toHaveCount(5)

  const ids = await mapLocator(modules, getModuleId)

  expect(ids).toEqual([
    '14VckNrFb1QinIBB',
    '2wluI1S8LrgHAvzw',
    'J+8xPpJpLXhm/YGa',
    'PBuYpIWexKRY2Yx9',
    'g/KqfVvjOtOgRuuu',
  ])

  const cables = await getByTestId(page, 'cable')
  const cableDetails = await mapLocator(cables, getCableDetails)

  expect(cableDetails).toEqual([
    {
      cableId: 'EjfJi6TDY6UFUCe9',
      fromIndex: '0',
      fromModuleId: 'PBuYpIWexKRY2Yx9',
      toIndex: '0',
      toModuleId: 'J+8xPpJpLXhm/YGa',
      toType: 'parameter',
    },
    {
      cableId: 'rel3umW1x28/SJeL',
      fromIndex: '2',
      fromModuleId: '2wluI1S8LrgHAvzw',
      toIndex: '0',
      toModuleId: 'J+8xPpJpLXhm/YGa',
      toType: 'input',
    },
    {
      cableId: '1KovuzOd83iIxitm',
      fromIndex: '0',
      fromModuleId: '14VckNrFb1QinIBB',
      toIndex: '0',
      toModuleId: 'PBuYpIWexKRY2Yx9',
      toType: 'input',
    },
    {
      cableId: 'VlJiZXAciCJ/tySA',
      fromIndex: '0',
      fromModuleId: 'J+8xPpJpLXhm/YGa',
      toIndex: '0',
      toModuleId: 'g/KqfVvjOtOgRuuu',
      toType: 'input',
    },
  ])
})

test('can load patch using the patch browser', async ({ page }) => {
  await init(page)
})
