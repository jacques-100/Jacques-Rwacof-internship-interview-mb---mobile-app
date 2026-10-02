import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests drive the real UI against a running stack (backend + database + frontend).
 * Required environment: E2E_PASSWORD (password shared by the seeded admin/supervisor/clerk users).
 * Optional: E2E_BASE_URL (default http://localhost:5173).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'en-GB',
  },
  projects: [
    { name: 'mobile', testMatch: /(responsive|mobile)\.spec\.ts/, use: { ...devices['Pixel 7'] } },
  ],
})
