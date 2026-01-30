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

    timeout: 300_000,
    expect: { timeout: 30_000 },

    fullyParallel: false,
    workers: 1,

    forbidOnly: !!process.env.CI,
    retries: 0, // no retries - they can trigger bot protection

    reporter: [['html', { open: 'never' }]],

    use: {
        baseURL: process.env.BASE_URL,

        /* Human-like browser settings */
        viewport: { width: 1280, height: 720 },
        locale: 'en-US',
        timezoneId: 'America/Port_of_Spain',

        /* Conservative timeouts */
        actionTimeout: 30_000,
        navigationTimeout: 120_000,

        /* Collect trace for debugging */
        trace: 'on',
        screenshot: 'on',

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
