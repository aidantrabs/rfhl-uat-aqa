import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import type { AxeResults, ImpactValue, NodeResult, Result } from 'axe-core';
import { expect, test } from '../test-data/fixtures';

// Logs all violations (does NOT fail the test)
async function logA11yScan(page: Page, pageName: string) {
    const results: AxeResults = await new AxeBuilder({ page }).analyze();

    console.log(`\n==============================`);
    console.log(`A11Y SCAN RESULTS: ${pageName}`);
    console.log(`Total violations: ${results.violations.length}`);

    // counts by impact
    type ImpactKey = Exclude<ImpactValue, null> | 'unknown';

    const counts = results.violations.reduce<Record<ImpactKey, number>>(
        (acc, v: Result) => {
            const key: ImpactKey = (v.impact ?? 'unknown') as ImpactKey;
            acc[key] = (acc[key] ?? 0) + 1;
            return acc;
        },
        {} as Record<ImpactKey, number>
    );

    console.log('By impact:', counts);

    // detailed list
    for (const v of results.violations) {
        const targets = v.nodes
            .flatMap((n: NodeResult) => n.target)
            .join(' | ');

        console.log(`- [${v.impact ?? 'unknown'}] ${v.id}: ${v.help}`);
        console.log(`  Help: ${v.helpUrl}`);
        console.log(`  Targets: ${targets}`);
    }

    console.log(`==============================\n`);
}

test.describe('Accessibility', () => {
    test('Navigate to login page and log a11y issues (axe)', async ({
        page,
    }) => {
        const baseUrl = process.env.BASE_URL;
        if (!baseUrl) throw new Error('BASE_URL required');

        // 1) LOGIN PAGE (logged out)
        await page.goto(`${baseUrl}/#/administrationGeneral/login`);
        await expect(page.locator('#step01')).toBeVisible({ timeout: 180_000 });

        await logA11yScan(page, 'Login');
    });

    // 2) DASHBOARD (logged in)
    test('Dashboard Scan', async ({ page, login }) => {
        await login();

        const dashboardIndicator = page
            .locator('li.leeds_list_item')
            .filter({ hasText: 'My Accounts' });
        await expect(dashboardIndicator).toBeVisible({ timeout: 120_000 });

        await logA11yScan(page, 'Dashboard');
    });

    // 3) NEXT PAGE (Accounts)
    test('Accounts', async ({ page, login }) => {
        await login();
        const myAccounts = page
            .locator('li.leeds_list_item')
            .filter({ hasText: 'My Accounts' });

        await expect(myAccounts).toBeVisible();
        await myAccounts.click();
        const allAccountsHeader = page.locator('div.ohio_text', {
            hasText: 'All Accounts',
        });
        await expect(allAccountsHeader).toBeVisible({ timeout: 60_000 });
        await logA11yScan(page, 'Accounts');
    });

    // ---- Transfers: open the Transfers menu/page from sidebar ----
    test('Transfers - scan each option', async ({ page, login }) => {
        await login();

        // Locator for the Transfers sidebar menu (reuse it)
        const transferMenu = page
            .locator('li.leeds_list_item')
            .filter({ hasText: 'Transfer' });

        // The options you want to scan
        const transferOptions = [
            'Between Your Own Accounts',
            'Third-Party Republic Bank Account',
            'Third-Party Local Bank Account',
            'International Bank Account',
            'Multiple Transfers',
            'Load Your Own VTM Card',
            'Load Third-Party VTM Card',
            'Cardless Cash',
        ];

        // Helper: open Transfers and prove the options list is visible
        const openTransfersOptions = async () => {
            await expect(transferMenu).toBeVisible();
            await transferMenu.click();
        };

        for (const option of transferOptions) {
            // 1) Open Transfers options list
            await openTransfersOptions();

            // 2) Click the specific option
            const optionLink = page
                .locator('a.oldham-panel-link')
                .filter({ hasText: option });

            await expect(optionLink).toBeVisible({ timeout: 60_000 });
            await optionLink.click();

            // 4) Run accessibility scan + log
            await logA11yScan(page, `Transfers - ${option}`);
        }
    });

    test('Pay - scan each option', async ({ page, login }) => {
        await login();

        // Sidebar menu locator for Pay (reuse it)
        const payMenu = page
            .locator('li.leeds_list_item')
            .filter({ hasText: 'Pay' });

        // Pay options you provided (visible text)
        const payOptions = [
            'Your Credit Card',
            'Republic Bank Credit Card',
            'Your Loan',
            'Company/Utility Payments',
        ];

        // Helper: open Pay options list (same idea as Transfers)
        const openPayOptions = async () => {
            await expect(payMenu).toBeVisible();
            await payMenu.click();

            // Prove the Pay options panel is open by checking one known option exists
            await expect(
                page.locator('span.oldham-panel-title-text', {
                    hasText: 'Republic Bank Credit Card',
                })
            ).toBeVisible({ timeout: 60_000 });
        };

        for (const option of payOptions) {
            // 1) Open Pay options list (so options are visible each time)
            await openPayOptions();

            // 2) Click the option tile/link (same class as Transfers options)
            const optionLink = page
                .locator('a.oldham-panel-link')
                .filter({ hasText: option });

            await expect(optionLink).toBeVisible({ timeout: 60_000 });
            await optionLink.click();

            // 3) Run accessibility scan + log
            await logA11yScan(page, `Pay - ${option}`);
        }
    });

    test('Service Request - scan each option', async ({ page, login }) => {
        await login();

        // Sidebar menu locator (reuse it)
        const serviceMenu = page
            .locator('li.leeds_list_item')
            .filter({ hasText: 'Service Request' });

        // Options to scan (visible text)
        const serviceOptions = [
            'New Application',
            'Requests Status',
            'Stop Cheque',
            'Block/Unblock Debit Card',
            'Balance Cover',
        ];

        // Helper: open Service Request options list and prove it's visible
        const openServiceOptions = async () => {
            await expect(serviceMenu).toBeVisible();
            await serviceMenu.click();

            // Prove the options panel is open (check one known option)
            await expect(
                page.locator('span.oldham-panel-title-text', {
                    hasText: 'New Application',
                })
            ).toBeVisible({ timeout: 60_000 });
        };

        for (const option of serviceOptions) {
            // 1) Open Service Request options list (so options appear each iteration)
            await openServiceOptions();

            // 2) Click the option
            // If options are wrapped in <a class="oldham-panel-link"> like Transfers, use that:
            const optionLink = page
                .locator('a.oldham-panel-link')
                .filter({ hasText: option });

            // If that ever fails, switch to clicking the text span directly:
            // const optionLink = page.locator('span.oldham-panel-title-text', { hasText: option });

            await expect(optionLink).toBeVisible({ timeout: 60_000 });
            await optionLink.click();

            // 3) Run accessibility scan + log
            await logA11yScan(page, `Service Request - ${option}`);
        }
    });
    test('Manage - scan each option', async ({ page, login }) => {
        await login();

        // Sidebar menu locator (reuse it)
        const manageMenu = page
            .locator('li.leeds_list_item')
            .filter({ hasText: 'Manage' });

        // Options to scan (visible text)
        const manageOptions = [
            'Third-Party Beneficiaries',
            'Company/Utility Payment Subscriptions',
            'Notifications',
        ];

        // Helper: open Manage options list and prove it's visible
        const openManageOptions = async () => {
            await expect(manageMenu).toBeVisible();
            await manageMenu.click();

            // Prove the options panel is open (check one known option)
            await expect(
                page.locator('span.oldham-panel-title-text', {
                    hasText: 'Third-Party Beneficiaries',
                })
            ).toBeVisible({ timeout: 60_000 });
        };

        for (const option of manageOptions) {
            // 1) Open Manage options list
            await openManageOptions();

            // 2) Click the option
            // Try clicking the wrapper link first (same as Transfers/Pay)
            const optionLink = page
                .locator('a.oldham-panel-link')
                .filter({ hasText: option });

            // If this ever fails (because only the span is clickable), swap to:
            // const optionLink = page.locator('span.oldham-panel-title-text', { hasText: option });

            await expect(optionLink).toBeVisible({ timeout: 60_000 });
            await optionLink.click();

            // 3) Run accessibility scan + log
            await logA11yScan(page, `Manage - ${option}`);
        }
    });

    test('My Finances - scan and log a11y issues', async ({ page, login }) => {
        await login();

        // 1) Open the side/hamburger menu
        const menuIcon = page.locator('i.stream-menu_2');
        await expect(menuIcon).toBeVisible({ timeout: 60_000 });
        await menuIcon.click();

        // 2) Click "My Finances" in the menu
        const myFinancesLink = page
            .locator('a.tucson-item-header-link')
            .filter({ hasText: 'My Finances' });

        await expect(myFinancesLink).toBeVisible({ timeout: 60_000 });
        await myFinancesLink.click();

        // 4) Run the accessibility scan
        await logA11yScan(page, 'My Finances');
    });

    test('My Transactions - scan each option', async ({ page, login }) => {
        await login();

        // Hamburger menu icon (reuse it)
        const menuIcon = page.locator('i.stream-menu_2');

        // "My Transactions" parent item in the hamburger menu (reuse it)
        const myTransactionsMenu = page
            .locator('a.tucson-item-header-link')
            .filter({ hasText: 'My Transactions' });

        // Options (sub-items) to scan (visible text)
        const transactionOptions = [
            'Favourites',
            'Scheduled',
            'Online Activity',
            'Batch in Process',
        ];

        // Helper: open My Transactions sub-menu and prove it's visible
        const openMyTransactionsOptions = async () => {
            await expect(menuIcon).toBeVisible({ timeout: 60_000 });
            await menuIcon.click();

            await expect(myTransactionsMenu).toBeVisible({ timeout: 60_000 });
            await myTransactionsMenu.click();

            // Prove the sub-options list is open (check one known option)
            await expect(
                page.locator('span.tucson-subitem-text', {
                    hasText: 'Favourites',
                })
            ).toBeVisible({ timeout: 60_000 });
        };

        for (const option of transactionOptions) {
            // 1) Open My Transactions options list
            await openMyTransactionsOptions();

            // 2) Click the option
            const optionLink = page
                .locator('a.tucson-subitem-link')
                .filter({ hasText: option });

            await expect(optionLink).toBeVisible({ timeout: 60_000 });
            await optionLink.click();

            // (Optional) prove the tab is active — uncomment if you want stronger confirmation
            // await expect(
            //   page.locator('a.tucson-subitem-link.subitem-active').filter({ hasText: option })
            // ).toBeVisible({ timeout: 60_000 });

            // 3) Run accessibility scan + log
            await logA11yScan(page, `My Transactions - ${option}`);
        }
    });
});
