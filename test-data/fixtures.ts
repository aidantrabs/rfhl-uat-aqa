import { test as base, expect } from '@playwright/test';
import {
    getDefaultUser,
    getUser,
    getUserByWorkerIndex,
    type TestUser,
} from './users';

type TestFixtures = {
    testUser: TestUser;
    login: () => Promise<void>;
    reAuthenticate: () => Promise<void>;
};

type TestOptions = {
    userId: string;
    useWorkerUser: boolean;
};

async function humanDelay(
    page: import('@playwright/test').Page,
    min = 300,
    max = 800
) {
    const delay = Math.floor(Math.random() * (max - min) + min);
    await page.waitForTimeout(delay);
}

async function humanType(
    locator: import('@playwright/test').Locator,
    text: string
) {
    await locator.click();
    for (const char of text) {
        await locator.pressSequentially(char, {
            delay: Math.floor(Math.random() * 100) + 50,
        });
    }
}

export const test = base.extend<TestFixtures & TestOptions>({
    userId: ['', { option: true }],
    useWorkerUser: [false, { option: true }],

    testUser: async ({ userId, useWorkerUser }, use, workerInfo) => {
        let user: TestUser;
        if (useWorkerUser) {
            user = getUserByWorkerIndex(workerInfo.workerIndex);
        } else if (userId) {
            user = getUser(userId);
        } else {
            user = getDefaultUser();
        }
        await use(user);
    },

    login: async ({ page, testUser }, use) => {
        await use(async () => {
            const baseUrl = process.env.BASE_URL;
            if (!baseUrl) {
                throw new Error('BASE_URL required');
            }

            await page.goto(`${baseUrl}/#/administrationGeneral/login`);

            const usernameField = page.locator('#step01');
            await expect(usernameField).toBeVisible({ timeout: 180_000 });
            await expect(usernameField).toBeEnabled();
            await humanDelay(page, 500, 1000);

            await humanType(usernameField, testUser.username);
            await humanDelay(page);

            const nextButton1 = page
                .locator('icb-login-step-user a')
                .filter({ hasText: 'Next' });
            await expect(nextButton1).toBeVisible();
            await nextButton1.click();

            const passwordField = page.locator('#step02');
            await expect(passwordField).toBeVisible({ timeout: 30_000 });
            await expect(passwordField).toBeEnabled();
            await humanDelay(page);

            await humanType(passwordField, testUser.password);
            await humanDelay(page);

            const nextButton2 = page
                .locator('icb-login-step-password a')
                .filter({ hasText: 'Next' });
            await expect(nextButton2).toBeVisible();
            await nextButton2.click();

            const mfaSelect = page.locator('select');
            await expect(mfaSelect).toBeVisible({ timeout: 30_000 });
            await humanDelay(page);

            await mfaSelect.selectOption({ label: 'SMS Code' });
            await humanDelay(page);

            const nextButton3 = page
                .locator('icb-login-step-multifactor-device a')
                .filter({ hasText: 'Next' });
            await expect(nextButton3).toBeVisible();
            await nextButton3.click();

            const smsField = page.getByRole('textbox', {
                name: 'Enter your SMS Code',
            });
            await expect(smsField).toBeVisible({ timeout: 30_000 });
            await expect(smsField).toBeEnabled();
            await humanDelay(page);

            await humanType(smsField, testUser.smsCode);
            await humanDelay(page, 500, 1000);

            const confirmButton = page
                .locator('a.ipswich-main-buttons-link:visible')
                .filter({ hasText: 'Confirm' });
            await expect(confirmButton).toBeVisible();
            await confirmButton.click();

            const dashboardIndicator = page
                .locator('li.leeds_list_item')
                .filter({ hasText: 'My Accounts' });
            await expect(dashboardIndicator).toBeVisible({ timeout: 120_000 });
        });
    },

    reAuthenticate: async ({ page, login }, use) => {
        await use(async () => {
            const loginForm = page.locator('#step01');
            const isOnLoginPage = await loginForm
                .isVisible({ timeout: 5_000 })
                .catch(() => false);

            if (isOnLoginPage) {
                await login();
                return;
            }

            const sessionModal = page.getByText('Session about to expire');
            const hasSessionWarning = await sessionModal
                .isVisible({ timeout: 1_000 })
                .catch(() => false);

            if (hasSessionWarning) {
                const stayLoggedIn = page.getByText('Stay logged in');
                await stayLoggedIn.click();
                await expect(sessionModal).not.toBeVisible({ timeout: 10_000 });
                return;
            }

            const sidebar = page
                .locator('li.leeds_list_item')
                .filter({ hasText: 'My Accounts' });
            const isLoggedIn = await sidebar
                .isVisible({ timeout: 5_000 })
                .catch(() => false);

            if (!isLoggedIn) {
                await login();
            }
        });
    },
});

export { expect };
export type { Account, AccountType, TestUser } from './users';
