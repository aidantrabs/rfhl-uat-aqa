import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import type { AxeResults, Result } from 'axe-core';
import { expect, test } from '../test-data/fixtures';

const IMPACT_ORDER = ['critical', 'serious', 'moderate', 'minor'] as const;

function formatViolation(v: Result): string {
    const impact = (v.impact ?? 'unknown').toUpperCase().padEnd(8);
    const count = `${v.nodes.length} element${v.nodes.length > 1 ? 's' : ''}`;

    return `  ${impact} | ${v.id} - ${v.help} (${count})`;
}

async function runA11yScan(page: Page, pageName: string) {
    const results: AxeResults = await new AxeBuilder({ page }).analyze();

    const sorted = [...results.violations].sort((a, b) => {
        const ai = IMPACT_ORDER.indexOf(
            (a.impact ?? 'minor') as (typeof IMPACT_ORDER)[number]
        );
        const bi = IMPACT_ORDER.indexOf(
            (b.impact ?? 'minor') as (typeof IMPACT_ORDER)[number]
        );

        return ai - bi;
    });

    const summary = IMPACT_ORDER.map((level) => {
        const count = sorted.filter((v) => v.impact === level).length;

        return count > 0 ? `${count} ${level}` : null;
    })
        .filter(Boolean)
        .join(', ');

    console.log(`\n--- ${pageName} ---`);

    if (sorted.length === 0) {
        console.log('  No violations found');
    } else {
        console.log(`  ${sorted.length} violations: ${summary}`);

        for (const v of sorted) {
            console.log(formatViolation(v));
        }
    }
}

async function navigateToSection(page: Page, sectionName: string) {
    const link = page
        .locator('li.leeds_list_item')
        .filter({ hasText: sectionName });
    await expect(link).toBeVisible();
    await link.click();
    await page.waitForLoadState('networkidle', { timeout: 30_000 });
}

async function clickMenuOption(page: Page, optionText: string) {
    const optionLink = page
        .locator('a.oldham-panel-link')
        .filter({ hasText: optionText });
    await expect(optionLink).toBeVisible({ timeout: 30_000 });
    await optionLink.click();
    await page.waitForLoadState('networkidle', { timeout: 15_000 });
}

test.describe('Accessibility', () => {
    test('Login page', async ({ page }) => {
        const baseUrl = process.env.BASE_URL;
        if (!baseUrl) throw new Error('BASE_URL required');

        await page.goto(`${baseUrl}/#/administrationGeneral/login`, {
            waitUntil: 'domcontentloaded',
        });
        await expect(page.locator('#step01')).toBeVisible({
            timeout: 180_000,
        });
        await runA11yScan(page, 'Login');
    });

    test('Dashboard', async ({ page, login }) => {
        await login();
        await runA11yScan(page, 'Dashboard');
    });

    test('Accounts', async ({ page, login }) => {
        await login();
        await navigateToSection(page, 'My Accounts');
        await runA11yScan(page, 'Accounts');
    });

    test('Transfers - scan each option', async ({ page, login }) => {
        await login();

        const options = [
            'Between Your Own Accounts',
            'Third-Party Republic Bank Account',
            'Third-Party Local Bank Account',
            'International Bank Account',
            'Multiple Transfers',
            'Load Your Own VTM Card',
            'Load Third-Party VTM Card',
            'Cardless Cash',
        ];

        for (const option of options) {
            await navigateToSection(page, 'Transfer');
            await clickMenuOption(page, option);
            await runA11yScan(page, `Transfers > ${option}`);
        }
    });

    test('Pay - scan each option', async ({ page, login }) => {
        await login();

        const options = [
            'Your Credit Card',
            'Republic Bank Credit Card',
            'Your Loan',
            'Company/Utility Payments',
        ];

        for (const option of options) {
            await navigateToSection(page, 'Pay');
            await clickMenuOption(page, option);
            await runA11yScan(page, `Pay > ${option}`);
        }
    });

    test('Service Request - scan each option', async ({ page, login }) => {
        await login();

        const options = [
            'New Application',
            'Requests Status',
            'Stop Cheque',
            'Block/Unblock Debit Card',
            'Balance Cover',
        ];

        for (const option of options) {
            await navigateToSection(page, 'Service Request');
            await clickMenuOption(page, option);
            await runA11yScan(page, `Service Request > ${option}`);
        }
    });

    test('Manage - scan each option', async ({ page, login }) => {
        await login();

        const options = [
            'Third-Party Beneficiaries',
            'Company/Utility Payment Subscriptions',
            'Notifications',
        ];

        for (const option of options) {
            await navigateToSection(page, 'Manage');
            await clickMenuOption(page, option);
            await runA11yScan(page, `Manage > ${option}`);
        }
    });

    test('My Finances', async ({ page, login }) => {
        await login();

        const menuIcon = page.locator('i.stream-menu_2');
        await expect(menuIcon).toBeVisible({ timeout: 30_000 });
        await menuIcon.click();

        const myFinancesLink = page
            .locator('a.tucson-item-header-link')
            .filter({ hasText: 'My Finances' });
        await expect(myFinancesLink).toBeVisible({ timeout: 30_000 });
        await myFinancesLink.click();
        await page.waitForLoadState('networkidle', { timeout: 15_000 });

        await runA11yScan(page, 'My Finances');
    });

    test('My Transactions - scan each option', async ({ page, login }) => {
        await login();

        const menuIcon = page.locator('i.stream-menu_2');
        const myTransactionsMenu = page
            .locator('a.tucson-item-header-link')
            .filter({ hasText: 'My Transactions' });

        const options = [
            'Favourites',
            'Scheduled',
            'Online Activity',
            'Batch in Process',
        ];

        for (const option of options) {
            await expect(menuIcon).toBeVisible({ timeout: 30_000 });
            await menuIcon.click();
            await expect(myTransactionsMenu).toBeVisible({ timeout: 30_000 });
            await myTransactionsMenu.click();

            const optionLink = page
                .locator('a.tucson-subitem-link')
                .filter({ hasText: option });
            await expect(optionLink).toBeVisible({ timeout: 30_000 });
            await optionLink.click();
            await page.waitForLoadState('networkidle', { timeout: 15_000 });

            await runA11yScan(page, `My Transactions > ${option}`);
        }
    });
});
