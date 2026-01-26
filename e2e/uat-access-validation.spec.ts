import * as fs from 'node:fs';
import * as path from 'node:path';
import { expect, test } from '@playwright/test';
import { requireEnv } from '../utils/env';

const BASE_URL = requireEnv('BASE_URL');
const LOGIN_URL = requireEnv('LOGIN_URL');
const USERNAME = requireEnv('TEST_USERNAME');
const PASSWORD = requireEnv('TEST_PASSWORD');
const SMS_CODE = requireEnv('TEST_SMS_CODE');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');

async function login(page: import('@playwright/test').Page) {
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
    await page.locator('#step01').waitFor({ state: 'visible' });

    // username step
    await page.locator('#step01').fill(USERNAME);
    await page
        .locator('icb-login-step-user a')
        .filter({ hasText: 'Next' })
        .click();

    // password step
    await page.locator('#step02').waitFor({ state: 'visible' });
    await page.locator('#step02').fill(PASSWORD);
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
        .fill(SMS_CODE);
    await page.locator('a:visible').filter({ hasText: 'Confirm' }).click();

    await page.waitForURL(/\/home/);
}

test.describe('UAT Access Validation', () => {
    test.setTimeout(180000);

    test.beforeAll(() => {
        if (!fs.existsSync(SCREENSHOTS_DIR)) {
            fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
        }
    });

    test('login page loads', async ({ page }) => {
        await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
        await page.locator('#step01').waitFor({ state: 'visible' });

        await expect(page.locator('#step01')).toBeVisible();
        await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, 'login-page.png'),
        });
    });

    test('login with valid credentials', async ({ page }) => {
        await login(page);
        await expect(page).toHaveURL(/\/home/);
        await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, 'dashboard.png'),
        });
    });

    test('invalid username shows error', async ({ page }) => {
        await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
        await page.locator('#step01').waitFor({ state: 'visible' });

        await page.locator('#step01').fill('invalid_user');
        await page
            .locator('icb-login-step-user a')
            .filter({ hasText: 'Next' })
            .click();
        await page.waitForTimeout(3000);

        await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, 'invalid-username.png'),
        });
    });

    test('session persists after refresh', async ({ page }) => {
        await login(page);
        await page.reload();
        await page.waitForLoadState('networkidle');

        expect(page.url()).toContain('/home');
    });

    test('logout terminates session', async ({ page }) => {
        await login(page);

        await page
            .locator('icb-logout a.derby-link')
            .waitFor({ state: 'visible' });
        await page.locator('icb-logout a.derby-link').click();

        await page
            .getByText('Are you sure you want to exit?')
            .waitFor({ state: 'visible' });
        await page.getByText('Confirm').first().click();
        await page.waitForTimeout(3000);

        expect(page.url()).toContain('/login');
        await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, 'logged-out.png'),
        });
    });

    test('protected page redirects when not logged in', async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto(`${BASE_URL}/#/home`, {
            waitUntil: 'domcontentloaded',
        });
        await page.waitForTimeout(3000);

        expect(page.url()).not.toContain('/home');
        await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, 'protected-redirect.png'),
        });

        await context.close();
    });
});
