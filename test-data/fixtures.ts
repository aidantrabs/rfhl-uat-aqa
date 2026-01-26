/**
 *
 * fixtures for test user management
 *
 * usage in tests:
 *   import { test, expect } from '../test-data/fixtures';
 *
 *   test('my test', async ({ testUser, loginAs }) => {
 *       await loginAs(testUser);
 *       // testUser.accounts[0].name, etc.
 *   });
 *
 * to use a specific user:
 *   test.use({ userId: 'user2' });
 *
 */
import { test as base } from '@playwright/test';
import { getDefaultUser, getUser, type TestUser } from './users';

type TestFixtures = {
    /** the active test user for this test */
    testUser: TestUser;
    /** login as a specific user */
    loginAs: (user: TestUser) => Promise<void>;
    /** login as the default test user */
    login: () => Promise<void>;
};

type TestOptions = {
    /** user ID to use for this test (default: first user) */
    userId: string;
};

export const test = base.extend<TestFixtures & TestOptions>({
    // option: which user to use
    userId: ['', { option: true }],

    // fixture: the test user object
    testUser: async ({ userId }, use) => {
        const user = userId ? getUser(userId) : getDefaultUser();
        await use(user);
    },

    // fixture: login function for any user
    loginAs: async ({ page }, use) => {
        const loginFn = async (user: TestUser) => {
            const baseUrl = process.env.BASE_URL;

            if (!baseUrl) {
                throw new Error('BASE_URL environment variable is required');
            }

            const loginUrl = `${baseUrl}/#/administrationGeneral/login`;

            await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
            await page.locator('#step01').waitFor({ state: 'visible' });

            // username step
            await page.locator('#step01').fill(user.username);
            await page
                .locator('icb-login-step-user a')
                .filter({ hasText: 'Next' })
                .click();

            // password step
            await page.locator('#step02').waitFor({ state: 'visible' });
            await page.locator('#step02').fill(user.password);
            await page
                .locator('icb-login-step-password a')
                .filter({ hasText: 'Next' })
                .click();

            // mfa device selection
            await page.locator('select').waitFor({ state: 'visible' });
            await page.locator('select').selectOption({ label: 'SMS Code' });
            await page
                .locator('icb-login-step-multifactor-device a')
                .filter({ hasText: 'Next' })
                .click();

            // sms code step
            await page
                .getByRole('textbox', { name: 'Enter your SMS Code' })
                .waitFor({ state: 'visible' });
            await page
                .getByRole('textbox', { name: 'Enter your SMS Code' })
                .fill(user.smsCode);
            await page
                .locator('a:visible')
                .filter({ hasText: 'Confirm' })
                .click();

            await page.waitForURL(/\/home/);
        };

        await use(loginFn);
    },

    // fixture: default login
    login: async ({ loginAs, testUser }, use) => {
        const loginFn = async () => {
            await loginAs(testUser);
        };

        await use(loginFn);
    },
});

export { expect } from '@playwright/test';
export type { Account, AccountType, TestUser } from './users';
