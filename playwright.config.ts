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

    timeout: 300_000,
    expect: { timeout: 30_000 },

    fullyParallel: false,
    workers: userCount, // scales with available test users

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
