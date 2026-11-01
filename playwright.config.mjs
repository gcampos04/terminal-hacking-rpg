import { defineConfig, devices } from '@playwright/test';

const site = process.env.BASE_URL;

export default defineConfig({
  testDir: './tests',
  testMatch: '*.spec.mjs',
  timeout: 30000,
  fullyParallel: true,
  workers: 4,
  reporter: [['list']],
  use: {
    baseURL: site || 'http://127.0.0.1:4173',
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure'
  },
  webServer: site ? undefined : {
    command: 'node tests/servidor.mjs',
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: false
  }
});
