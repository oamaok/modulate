import { test, expect } from '@playwright/test'
import { getByTestId, getCableDetails, getModuleId, init } from './util'

const SAMPLE_PATCH_ID = '9982d3c7-8ffd-43a7-8431-53d6a31de913'

test('can load patch by loading patch link', async ({ page, request }) => {
  await init(page, `/patch/${SAMPLE_PATCH_ID}`)

  const modules = await page.locator('[data-test-id="module"]')
  const moduleCount = await modules.count()

  expect(moduleCount).toEqual(8)

  const ids: string[] = []
  for (let i = 0; i < moduleCount; i++) {
    const id = await getModuleId(modules.nth(i))
    ids.push(id)
  }

  expect(ids).toEqual([
    '836172b4-7a64-4091-b3ad-0b5aeab52b0c',
    'e9ca7e71-5206-4c32-bda1-b63ee9d74e8f',
    'bea4ca73-30e3-46bf-87e5-4a843523f31b',
    '641457ed-e26a-4c52-996f-7ec043cb7022',
    '0a4047a0-7bc5-46d8-a369-82a8b607fee5',
    '5346a5f9-5397-4b69-b4be-b1c86c3eb566',
    '147d9dba-a46e-4866-8131-58f7eb5a0509',
    'b506702c-e6a1-47ab-81e3-870c49b7b846',
  ])

  const cableDetails: any[] = []
  const cables = await getByTestId(page, 'cable')
  const cableCount = await cables.count()

  for (let i = 0; i < cableCount; i++) {
    cableDetails.push(await getCableDetails(cables.nth(i)))
  }

  expect(cableDetails).toEqual([
    {
      cableId: '10b3fd6e-42cc-4d5c-9084-6b2de2aeb6cc',
      fromIndex: '1',
      fromModuleId: '147d9dba-a46e-4866-8131-58f7eb5a0509',
      toIndex: '0',
      toModuleId: '0a4047a0-7bc5-46d8-a369-82a8b607fee5',
      toType: 'input',
    },
    {
      cableId: '4f349e44-a6e4-4155-abaf-cd42cf6e02ec',
      fromIndex: '0',
      fromModuleId: '147d9dba-a46e-4866-8131-58f7eb5a0509',
      toIndex: '0',
      toModuleId: 'bea4ca73-30e3-46bf-87e5-4a843523f31b',
      toType: 'parameter',
    },
    {
      cableId: 'a9c79ae4-06d7-4931-bae3-241168368632',
      fromIndex: '0',
      fromModuleId: '0a4047a0-7bc5-46d8-a369-82a8b607fee5',
      toIndex: '0',
      toModuleId: '836172b4-7a64-4091-b3ad-0b5aeab52b0c',
      toType: 'parameter',
    },
    {
      cableId: '4d1069ad-6eca-47fb-ac9e-382c7bd41d5c',
      fromIndex: '0',
      fromModuleId: '0a4047a0-7bc5-46d8-a369-82a8b607fee5',
      toIndex: '0',
      toModuleId: 'b506702c-e6a1-47ab-81e3-870c49b7b846',
      toType: 'parameter',
    },
    {
      cableId: '6e9e2b48-4768-449d-b203-13fe654c53b5',
      fromIndex: '0',
      fromModuleId: '836172b4-7a64-4091-b3ad-0b5aeab52b0c',
      toIndex: '0',
      toModuleId: '5346a5f9-5397-4b69-b4be-b1c86c3eb566',
      toType: 'input',
    },
    {
      cableId: '11ec509a-cda7-47c3-9bb3-61aaa0c4876f',
      fromIndex: '0',
      fromModuleId: '5346a5f9-5397-4b69-b4be-b1c86c3eb566',
      toIndex: '0',
      toModuleId: 'e9ca7e71-5206-4c32-bda1-b63ee9d74e8f',
      toType: 'input',
    },
    {
      cableId: '8cf8e290-8047-43ee-887b-a57d1ccf3823',
      fromIndex: '0',
      fromModuleId: '641457ed-e26a-4c52-996f-7ec043cb7022',
      toIndex: '0',
      toModuleId: '147d9dba-a46e-4866-8131-58f7eb5a0509',
      toType: 'input',
    },
    {
      cableId: '0a996b62-61b7-4e67-8938-e896a069fb1d',
      fromIndex: '0',
      fromModuleId: 'b506702c-e6a1-47ab-81e3-870c49b7b846',
      toIndex: '0',
      toModuleId: '836172b4-7a64-4091-b3ad-0b5aeab52b0c',
      toType: 'input',
    },
    {
      cableId: 'b070b314-80bb-4bf6-9923-d975eaf85dbf',
      fromIndex: '2',
      fromModuleId: 'bea4ca73-30e3-46bf-87e5-4a843523f31b',
      toIndex: '0',
      toModuleId: 'b506702c-e6a1-47ab-81e3-870c49b7b846',
      toType: 'input',
    },
  ])
})
