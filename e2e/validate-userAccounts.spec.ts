import { test, expect } from '../test-data/fixtures';
import { getAccounts } from '../test-data/users';

// const accounts = getAccounts('some-user-id');

test.describe('Navigation Tests', () => {
    test.use({ userId: 'kory' });

    test('Validate user accounts', async ({ page, login }) => {
        await login();

        // get user accounts
        const accounts = getAccounts('kory');

        // go to my accounts
        const myAccountsLink = page.locator(
            'li.leeds_list_item a:has(span:text-is("My Accounts"))'
        );

        await myAccountsLink.click();
        await page.waitForURL(/\/myProducts/, { timeout: 300000 });

        const dashboardIndicator = page
            .locator('li.leeds_list_item')
            .filter({ hasText: 'My Accounts' });
        await expect(dashboardIndicator).toBeVisible({ timeout: 30000 });

        const searchInput = page.locator(
            'input[formcontrolname="searchInput"]'
        );

        for (const x of accounts) {
            await searchInput.fill('');
            await searchInput.fill(x.number);

            const accountRow = page.locator('icb-productrow', {
                hasText: x.number,
            });

            await expect
                .soft(accountRow.first(), `Account not found: ${x.number}`)
                .toBeVisible({ timeout: 3000 });
        }
    });
});
