const { defineConfig, devices } = require('@playwright/test');

// Dev-only e2e config. Auto-starts the local Python server (reuses one if
// already running) and runs the specs in ./tests against it.
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:8000',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'python3 server.py',
    url: 'http://localhost:8000',
    reuseExistingServer: true,
    timeout: 30000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
