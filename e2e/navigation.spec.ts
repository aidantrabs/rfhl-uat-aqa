import { test, expect } from '../test-data/fixtures';
// import { humanRefresh } from '../test-data/fixtures';

test.describe('Navigation Tests', () => {
    test('Foward and Backward Nav from Homepage', async ({ page, login }) => {
        await login();

        // await page.waitForTimeout(10000);
        await page.waitForURL(/\/home/, { timeout: 30000 });
        await expect(page).toHaveURL(/\/home/);

        // // go to accounts
        const myAccountsLink = page.locator(
            'li.leeds_list_item a:has(span:text-is("My Accounts"))'
        );
        await myAccountsLink.click();
        await page.waitForURL(/\/myProducts/, { timeout: 300000 });
        await expect(page).toHaveURL(/\/myProducts/);

        var sidebar = page
            .locator('li.leeds_list_item')
            .filter({ hasText: 'My Accounts' });

        await expect(sidebar).toBeVisible({ timeout: 120_000 });

        // // backward nav
        await page.goBack({ timeout: 300000 });
        await expect(page).toHaveURL(/\/home/);

        // forward nav
        await page.goForward();
        await expect(page).toHaveURL(/\/myProducts/);

        sidebar = page
            .locator('li.leeds_list_item')
            .filter({ hasText: 'My Accounts' });

        await expect(sidebar).toBeVisible();
    });
});
