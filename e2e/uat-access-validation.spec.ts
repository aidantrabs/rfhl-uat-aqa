import { expect, test } from '../test-data/fixtures';

test.describe('Authentication', () => {
    test('valid login reaches dashboard', async ({ page, login }) => {
        await login();

        const sidebar = page
            .locator('li.leeds_list_item')
            .filter({ hasText: 'My Accounts' });
        await expect(sidebar).toBeVisible();
    });

    test('session persists after refresh', async ({ page, login }) => {
        await login();

        await page.reload();

        const sidebar = page
            .locator('li.leeds_list_item')
            .filter({ hasText: 'My Accounts' });
        await expect(sidebar).toBeVisible({ timeout: 120_000 });
    });

    test('logout works', async ({ page, login }) => {
        await login();

        const logoutLink = page.locator('icb-logout a.derby-link');
        await expect(logoutLink).toBeVisible();
        await logoutLink.click();

        const confirmDialog = page.getByText('Are you sure you want to exit?');
        await expect(confirmDialog).toBeVisible();

        const confirmButton = page.getByText('Confirm').first();
        await confirmButton.click();

        const loginForm = page.locator('#step01');
        await expect(loginForm).toBeVisible({ timeout: 60_000 });
    });
});

test.describe('Dashboard', () => {
    test('displays account information', async ({ page, login }) => {
        await login();

        const accountRibbon = page
            .locator('.araure-primary-ribbon-item')
            .first();
        await expect(accountRibbon).toBeVisible();

        await expect(page.getByText('TTD')).toBeVisible();
    });
});
