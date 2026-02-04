import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 *
 *   single worker to avoid concurrent session issues
 *   long timeouts for slow corporate networks
 *   human-like viewport and user agent
 *
 */
export default defineConfig({
    testDir: './e2e',
    testIgnore: ['**/auth.setup.ts'],

    timeout: 180_000,
    expect: { timeout: 30_000 },

    fullyParallel: false,
    workers: 1,

    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0, // 1 retry in CI for flaky network

    reporter: [['html', { open: 'never' }]],

    use: {
        baseURL: process.env.BASE_URL,

        /* Human-like browser settings */
        viewport: { width: 1280, height: 720 },
        locale: 'en-US',
        timezoneId: 'America/Port_of_Spain',

        actionTimeout: 30_000,
        navigationTimeout: 60_000, // reduced from 120s

        /* Collect trace for debugging */
        trace: 'on-first-retry', // only trace on retry to save resources
        screenshot: 'only-on-failure', // only screenshot failures

        /* Accept UAT certificates */
        ignoreHTTPSErrors: true,

        storageState: undefined,
        serviceWorkers: 'block',
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
