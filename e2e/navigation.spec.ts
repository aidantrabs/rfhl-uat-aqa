import { expect, test } from '../test-data/fixtures';

// import { humanRefresh } from '../test-data/fixtures';

test.describe('Navigation Tests', () => {
    test('Foward and Backward Nav from Homepage', async ({ page, login }) => {
        await login();

        // await page.waitForTimeout(10000);
        await page.waitForURL(/\/home/, { timeout: 30000 });
        await expect(page).toHaveURL(/\/home/);

        const sidebarMyAccounts = page
            .locator('li.leeds_list_item')
            .filter({ hasText: 'My Accounts' });
        await expect(sidebarMyAccounts).toBeVisible();
        await sidebarMyAccounts.click();

        try {
            await page.waitForURL(/\/myProducts/, { timeout: 10_000 });
        } catch {
            await sidebarMyAccounts.click();
            await page.waitForURL(/\/myProducts/, { timeout: 30_000 });
        }
        await page.waitForLoadState('networkidle', { timeout: 30_000 });

        const sidebar = page
            .locator('li.leeds_list_item')
            .filter({ hasText: 'My Accounts' });

        await expect(sidebar).toBeVisible({ timeout: 30_000 });

        await page.goBack({ timeout: 60_000 });
        await expect(page).toHaveURL(/\/home/);

        await page.goForward({ timeout: 60_000 });
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL(/\/myProducts/);
        await expect(sidebar).toBeVisible();
    });
});
