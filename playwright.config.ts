import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 *
 * load test user count for parallel worker configuration.
 * more users = more parallel workers for session-isolated tests.
 *
 */
function getTestUserCount(): number {
    try {
        const fs = require('node:fs');
        const usersPath = path.join(__dirname, 'test-data/users.local.json');
        if (fs.existsSync(usersPath)) {
            const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
            return Object.keys(users).length;
        }
    } catch {
        // fallback to 1 user
    }
    return 1;
}

const userCount = getTestUserCount();

/**
 *
 *   workers based on available test users (each worker needs unique user for session isolation)
 *   long timeouts for slow corporate networks
 *   human-like viewport and user agent
 *
 *   To enable parallelization:
 *   1. Add more users to users.local.json (and USERS_JSON secret)
 *   2. Workers will automatically scale to match user count
 *   3. Session timeout tests use useWorkerUser: true for worker-based user assignment
 *
 */
export default defineConfig({
    testDir: './e2e',
    testIgnore: ['**/auth.setup.ts'],

    timeout: 180_000,
    expect: { timeout: 30_000 },

    fullyParallel: false,
    workers: userCount, // scales with available test users

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
            testIgnore: '**/session-timeout.spec.ts',
        },
        {
            name: 'chromium-session-tests',
            use: {
                ...devices['Desktop Chrome'],
                // enable worker-based user assignment for parallel session tests
                useWorkerUser: true,
            },
            testMatch: '**/session-timeout.spec.ts',
        },
    ],
});
