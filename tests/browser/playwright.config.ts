import { defineConfig, devices } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const websitePort = Number(process.env.E2E_WEBSITE_PORT || 4317)
const backendPort = Number(process.env.E2E_BACKEND_PORT || 4318)
if (websitePort === backendPort) throw new Error('Browser test ports must differ')
const baseURL = 'http://127.0.0.1:' + websitePort

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: { baseURL, trace: 'on-first-retry' },
  webServer: {
    command: 'pnpm exec tsx tests/browser/stack.ts',
    cwd: fileURLToPath(new URL('../../', import.meta.url)),
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30000,
    env: { E2E_WEBSITE_PORT: String(websitePort), E2E_BACKEND_PORT: String(backendPort) }
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['iPhone 13'], browserName: 'chromium' } }
  ]
})
