import { expect, test } from '../test-data/fixtures';

const SESSION_WARNING_TIME = 18 * 60 * 1000; // 18 minutes
const SESSION_EXPIRY_TIME = 20 * 60 * 1000; // 20 minutes
const BUFFER_TIME = 2 * 60 * 1000; // 2 minute buffer

const MODAL_HEADER = 'Session about to expire';
const MODAL_BODY = 'Your session will expire in';
const BTN_STAY_LOGGED_IN = 'Stay logged in';
const BTN_LOG_OUT = 'Log out';

test.describe('Session Management', () => {
    test.setTimeout(SESSION_EXPIRY_TIME + 5 * 60 * 1000);

    test('session warning modal appears and "Stay logged in" extends session', async ({
        page,
        login,
    }) => {
        await login();

        const sidebar = page
            .locator('li.leeds_list_item')
            .filter({ hasText: 'My Accounts' });
        await expect(sidebar).toBeVisible();

        const modalHeader = page.getByText(MODAL_HEADER);
        await expect(modalHeader).toBeVisible({
            timeout: SESSION_WARNING_TIME + BUFFER_TIME,
        });

        await expect(page.getByText(MODAL_BODY)).toBeVisible();
        const stayLoggedInBtn = page.getByText(BTN_STAY_LOGGED_IN);
        const logOutBtn = page.getByText(BTN_LOG_OUT);
        await expect(stayLoggedInBtn).toBeVisible();
        await expect(logOutBtn).toBeVisible();

        await stayLoggedInBtn.click();
        await expect(modalHeader).not.toBeVisible({ timeout: 10_000 });
        await expect(sidebar).toBeVisible();
    });

    test('clicking "Log out" from warning modal logs user out', async ({
        page,
        login,
    }) => {
        await login();

        const sidebar = page
            .locator('li.leeds_list_item')
            .filter({ hasText: 'My Accounts' });
        await expect(sidebar).toBeVisible();

        const modalHeader = page.getByText(MODAL_HEADER);
        await expect(modalHeader).toBeVisible({
            timeout: SESSION_WARNING_TIME + BUFFER_TIME,
        });

        const logOutBtn = page.getByText(BTN_LOG_OUT);
        await logOutBtn.click();

        const loginForm = page.locator('#step01');
        await expect(loginForm).toBeVisible({ timeout: 60_000 });
    });

    test('expired session redirects to login automatically', async ({
        page,
        login,
    }) => {
        await login();

        const sidebar = page
            .locator('li.leeds_list_item')
            .filter({ hasText: 'My Accounts' });
        await expect(sidebar).toBeVisible();

        const loginForm = page.locator('#step01');
        await expect(loginForm).toBeVisible({
            timeout: SESSION_EXPIRY_TIME + BUFFER_TIME,
        });
    });

    test('page refresh within session validity keeps user logged in', async ({
        page,
        login,
    }) => {
        await login();

        const sidebar = page
            .locator('li.leeds_list_item')
            .filter({ hasText: 'My Accounts' });
        await expect(sidebar).toBeVisible();

        await page.waitForTimeout(5 * 60 * 1000);

        await page.reload();

        await expect(sidebar).toBeVisible({ timeout: 120_000 });
    });
});
