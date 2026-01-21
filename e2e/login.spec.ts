import { expect, test } from '@playwright/test';
import { requireEnv } from '../utils/env';

const LOGIN_URL = requireEnv('LOGIN_URL');
const USERNAME = requireEnv('TEST_USERNAME');
const PASSWORD = requireEnv('TEST_PASSWORD');

test('login flow up to SMS code step', async ({ page }) => {
    test.setTimeout(180000);

    await page.goto(LOGIN_URL, { timeout: 60000 });
    await page.waitForLoadState('networkidle');

    // username step
    await page.locator('#step01').waitFor({ state: 'visible', timeout: 30000 });
    await page.locator('#step01').fill(USERNAME);
    await page
        .locator('icb-login-step-user a')
        .filter({ hasText: 'Next' })
        .click();

    // password step
    await page.locator('#step02').waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('#step02').fill(PASSWORD);
    await page
        .locator('icb-login-step-password a')
        .filter({ hasText: 'Next' })
        .click();

    // select sms + next
    await page.waitForTimeout(2000);
    await page.locator('select').selectOption({ label: 'SMS Code' });
    await page
        .locator('icb-login-step-multifactor-device a')
        .filter({ hasText: 'Next' })
        .click();

    // check if sms page achieved (for now)
    await page.waitForTimeout(2000);
    await expect(
        page.getByRole('textbox', { name: 'Enter your SMS Code' })
    ).toBeVisible();
});
