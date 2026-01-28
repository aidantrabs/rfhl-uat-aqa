import { test as setup } from '@playwright/test';
import { getDefaultUser } from '../test-data/users';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
    const user = getDefaultUser();
    const baseUrl = process.env.BASE_URL;

    if (!baseUrl) {
        throw new Error('BASE_URL environment variable is required');
    }

    const loginUrl = `${baseUrl}/#/administrationGeneral/login`;

    await page.goto(loginUrl, { waitUntil: 'commit' });
    await page.locator('#step01').waitFor({ state: 'visible' });

    // username step - add small delay
    await page.locator('#step01').fill(user.username);
    await page.waitForTimeout(500);
    await page
        .locator('icb-login-step-user a')
        .filter({ hasText: 'Next' })
        .click();

    // password step
    await page.locator('#step02').waitFor({ state: 'visible' });
    await page.locator('#step02').fill(user.password);
    await page.waitForTimeout(500);
    await page
        .locator('icb-login-step-password a')
        .filter({ hasText: 'Next' })
        .click();

    // mfa device selection
    await page.locator('select').waitFor({ state: 'visible' });
    await page.locator('select').selectOption({ label: 'SMS Code' });
    await page.waitForTimeout(300);
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
    await page.waitForTimeout(300);
    await page.locator('a:visible').filter({ hasText: 'Confirm' }).click();

    // wait for successful login
    await page.waitForURL(/\/home/);

    // save auth state
    await page.context().storageState({ path: authFile });
});
