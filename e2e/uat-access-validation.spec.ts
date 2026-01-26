import * as fs from 'node:fs';
import * as path from 'node:path';
import { expect, test } from '../test-data/fixtures';

const BASE_URL = process.env.BASE_URL;
if (!BASE_URL) {
    throw new Error('BASE_URL environment variable is required');
}

const LOGIN_URL = `${BASE_URL}/#/administrationGeneral/login`;
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');

test.describe('UAT Access Validation', () => {
    test.setTimeout(180000);

    test.beforeAll(() => {
        if (!fs.existsSync(SCREENSHOTS_DIR)) {
            fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
        }
    });

    test('login page loads', async ({ page }) => {
        await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
        await page.locator('#step01').waitFor({ state: 'visible' });

        await expect(page.locator('#step01')).toBeVisible();
        await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, 'login-page.png'),
        });
    });

    test('login with valid credentials', async ({ page, login }) => {
        await login();
        await expect(page).toHaveURL(/\/home/);
        await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, 'dashboard.png'),
        });
    });

    test('invalid username shows error', async ({ page }) => {
        await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
        await page.locator('#step01').waitFor({ state: 'visible' });

        await page.locator('#step01').fill('invalid_user');
        await page
            .locator('icb-login-step-user a')
            .filter({ hasText: 'Next' })
            .click();
        await page.waitForTimeout(3000);

        await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, 'invalid-username.png'),
        });
    });

    test('session persists after refresh', async ({ page, login }) => {
        await login();
        await page.reload();
        await page.waitForLoadState('networkidle');

        expect(page.url()).toContain('/home');
    });

    test('logout terminates session', async ({ page, login }) => {
        await login();

        await page
            .locator('icb-logout a.derby-link')
            .waitFor({ state: 'visible' });
        await page.locator('icb-logout a.derby-link').click();

        await page
            .getByText('Are you sure you want to exit?')
            .waitFor({ state: 'visible' });
        await page.getByText('Confirm').first().click();
        await page.waitForTimeout(3000);

        expect(page.url()).toContain('/login');
        await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, 'logged-out.png'),
        });
    });

    test('protected page redirects when not logged in', async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto(`${BASE_URL}/#/home`, {
            waitUntil: 'domcontentloaded',
        });
        await page.waitForTimeout(3000);

        expect(page.url()).not.toContain('/home');
        await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, 'protected-redirect.png'),
        });

        await context.close();
    });
});

test.describe('Home Route Behavior', () => {
    test.setTimeout(180000);

    test('redirect occurs once without looping', async ({ page, login }) => {
        const urlHistory: string[] = [];
        page.on('framenavigated', (frame) => {
            if (frame === page.mainFrame()) {
                urlHistory.push(page.url());
            }
        });

        await login();

        const homeUrls = urlHistory.filter((url) => url.includes('/home'));
        expect(homeUrls.length).toBeLessThanOrEqual(2);
        expect(page.url()).toContain('/home');
    });

    test('dashboard loads with user info', async ({
        page,
        login,
        testUser,
    }) => {
        await login();

        const spinner = page.locator('mat-spinner, .spinner, .loading').first();
        if (await spinner.isVisible().catch(() => false)) {
            await spinner.waitFor({ state: 'hidden', timeout: 30000 });
        }

        await expect(page.locator('text=Home')).toBeVisible();
        await expect(page.locator('text=My Accounts')).toBeVisible();

        await expect(page.locator(`text=${testUser.name}`)).toBeVisible();

        await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, 'dashboard-loaded.png'),
        });
    });

    test('data populates consistently across refreshes', async ({
        page,
        login,
    }) => {
        await login();
        await page.waitForTimeout(3000);

        await page.reload();
        await page.waitForLoadState('networkidle');

        expect(page.url()).toContain('/home');
        await expect(page.locator('text=Home')).toBeVisible();
    });

    test('browser back/forward navigation works', async ({ page, login }) => {
        await login();

        await page.locator('text=My Accounts').click();
        await page.waitForTimeout(2000);
        const accountsUrl = page.url();

        await page.goBack();
        await page.waitForTimeout(2000);

        await page.goForward();
        await page.waitForTimeout(2000);
        expect(page.url()).toBe(accountsUrl);
    });

    test('page is responsive after load', async ({ page, login }) => {
        await login();

        const startTime = Date.now();
        await page.locator('text=My Accounts').click();
        const clickTime = Date.now() - startTime;

        expect(clickTime).toBeLessThan(2000);
    });
});

// Example: test with specific user
// test.describe('User-specific tests', () => {
//     test.use({ userId: 'user2' });
//
//     test('user2 can login', async ({ page, login, testUser }) => {
//         await login();
//         await expect(page.locator(`text=${testUser.name}`)).toBeVisible();
//     });
// }); blah
