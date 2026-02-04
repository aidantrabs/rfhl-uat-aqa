import { expect, test } from '../test-data/fixtures';
import { getAccounts } from '../test-data/users';

test.describe('Accounts', () => {
    test.use({ userId: 'kory' });

    test('Validate user accounts', async ({ page, login }) => {
        await login();

        // get user accounts
        const accounts = getAccounts('kory');

        // go to my accounts
        const myAccountsLink = page
            .locator('li.leeds_list_item')
            .filter({ hasText: 'My Accounts' });

        await expect(myAccountsLink).toBeVisible();
        await myAccountsLink.click();

        // wait for navigation with retry for flaky SPA
        try {
            await page.waitForURL(/\/myProducts/, { timeout: 10_000 });
        } catch {
            await myAccountsLink.click();
            await page.waitForURL(/\/myProducts/, { timeout: 30_000 });
        }
        await page.waitForLoadState('networkidle');

        const searchInput = page.locator(
            'input[formcontrolname="searchInput"]'
        );

        for (const account of accounts) {
            await searchInput.fill('');
            await searchInput.fill(account.number);

            const accountRow = page.locator('icb-productrow', {
                hasText: account.number,
            });

            await expect
                .soft(accountRow.first(), `Account not found: ${account.number}`)
                .toBeVisible({ timeout: 5_000 });
        }
    });
});
