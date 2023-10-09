import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8888',
    trace: 'on-first-retry',
  },

  expect: {
    timeout: 1000,
  },

  timeout: 5000,

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],

  webServer: {
    command: 'cd .. && yarn start:server',
    env: {
      E2E: 'true',
      NODE_ENV: 'test',
      DATABASE_FILE: ':memory:',
    },
    stdout: 'pipe',
    url: 'http://localhost:8888',
    reuseExistingServer: false,
  },
})
