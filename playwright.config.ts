import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    }
  ],
  webServer: {
    command: 'npm run build && node dist/backend/server.js',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    env: {
      PORT: '3001',
      TURSO_DATABASE_URL: '',
      TURSO_AUTH_TOKEN: '',
      NODE_ENV: 'test',
      LOCAL_DB_PATH: 'data/necesito-test.db',
      START_SERVER: 'true'
    }
  }
});
