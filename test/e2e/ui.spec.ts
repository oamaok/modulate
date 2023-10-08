import { test, expect } from '@playwright/test'
import { init, loginAsUser, resetDatabase } from './util'

test.beforeEach(async ({ page, request }) => {
  await init(page)
  await resetDatabase(request)
})

test('should be able to create an account', async ({ page }) => {
  await page.locator('[data-test-id="login"]').click()
  await page.locator('[data-test-id="login-link"]').click()
  await page.locator('[data-test-id="username"]').click()
  await page.locator('[data-test-id="username"]').fill('daniel')
  await page.locator('[data-test-id="username"]').press('Tab')
  await page.locator('[data-test-id="email"]').fill('daniel@example.com')
  await page.locator('[data-test-id="email"]').press('Tab')
  await page.locator('[data-test-id="password"]').fill('password')
  await page.locator('[data-test-id="create-account-button"]').click()

  await page.waitForSelector('[data-test-id="logout"]')

  expect(await page.locator('[data-test-id="logout"]').count()).toEqual(1)
})

test('should be able to login as the created user', async ({ page }) => {
  await loginAsUser(page, 'alice@example.com', 'password')

  await page.waitForSelector('[data-test-id="logout"]')
  expect(await page.locator('[data-test-id="logout"]').count()).toEqual(1)
})
