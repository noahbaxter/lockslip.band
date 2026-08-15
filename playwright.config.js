const { defineConfig, devices } = require('@playwright/test');

// Dev-only e2e config. Auto-starts the local Python server (reuses one if
// already running) and runs the specs in ./tests against it.
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // The modal specs each load the poster wall, which is fifty images. Run wide
  // open, enough of them land at once that the suite starts failing on machine
  // load rather than on the site. Fewer workers and a longer ceiling costs a few
  // seconds of wall clock and buys a result that means something.
  timeout: 60000,
  workers: 4,
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
