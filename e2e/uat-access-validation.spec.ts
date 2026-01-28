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

    test('login page loads', async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto(LOGIN_URL, { waitUntil: 'commit' });
        await page.locator('#step01').waitFor({ state: 'visible' });

        await expect(page.locator('#step01')).toBeVisible();
        await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, 'login-page.png'),
        });

        await context.close();
    });

    test('login with valid credentials', async ({ page }) => {
        await page.goto(`${BASE_URL}/#/home`, { waitUntil: 'commit' });
        await page.waitForURL(/\/home/);
        await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, 'dashboard.png'),
        });
    });

    test('invalid username shows error', async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto(LOGIN_URL, { waitUntil: 'commit' });
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

        await context.close();
    });

    test('session persists after refresh', async ({ page }) => {
        await page.goto(`${BASE_URL}/#/home`, { waitUntil: 'commit' });
        await page.waitForURL(/\/home/);

        await page.reload();

        await expect(page.url()).toContain('/home');
    });

    test('logout terminates session', async ({ page }) => {
        await page.goto(`${BASE_URL}/#/home`, { waitUntil: 'commit' });
        await page.waitForURL(/\/home/);

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

        await page.goto(`${BASE_URL}/#/home`, { waitUntil: 'commit' });
        await page.waitForTimeout(3000);

        expect(page.url()).not.toContain('/home');
        await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, 'protected-redirect.png'),
        });

        await context.close();
    });
});

// test.describe('Home Route Behavior', () => {
//     test.setTimeout(180000);

//     test('redirect occurs once without looping', async ({ page, login }) => {
//         const urlHistory: string[] = [];
//         page.on('framenavigated', (frame) => {
//             if (frame === page.mainFrame()) {
//                 urlHistory.push(page.url());
//             }
//         });

//         await login();

//         const homeUrls = urlHistory.filter((url) => url.includes('/home'));
//         expect(homeUrls.length).toBeLessThanOrEqual(2);
//         expect(page.url()).toContain('/home');
//     });

//     test('dashboard loads with user info', async ({
//         page,
//         login,
//         testUser,
//     }) => {
//         await login();

//         const spinner = page.locator('mat-spinner, .spinner, .loading').first();
//         if (await spinner.isVisible().catch(() => false)) {
//             await spinner.waitFor({ state: 'hidden', timeout: 30000 });
//         }

//         await expect(page.locator('text=Home')).toBeVisible();
//         await expect(page.locator('text=My Accounts')).toBeVisible();

//         await expect(page.locator(`text=${testUser.name}`)).toBeVisible();

//         await page.screenshot({
//             path: path.join(SCREENSHOTS_DIR, 'dashboard-loaded.png'),
//         });
//     });

//     test('data populates consistently across refreshes', async ({
//         page,
//         login,
//     }) => {
//         await login();
//         await page.waitForTimeout(3000);

//         await page.reload();
//         await page.waitForLoadState('networkidle');

//         expect(page.url()).toContain('/home');
//         await expect(page.locator('text=Home')).toBeVisible();
//     });

test('browser back/forward navigation works', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/home`, { waitUntil: 'commit' });

    const chequingCard = page
        .locator('.araure-primary-ribbon-item')
        .filter({ hasText: '960202029006' });

    await chequingCard.waitFor({ state: 'visible' });

    await expect(chequingCard).toContainText('Chequing Account');
    await expect(chequingCard).toContainText('960202029006');

    // Navigate to My Accounts
    await page
        .locator('li.leeds_list_item a:has(span:text-is("My Accounts"))')
        .click();

    const accs = page.locator('div.ohio_text', { hasText: 'All Accounts' });
    await accs.waitFor({ state: 'visible' });

    const accountsUrl = page.url();

    // Go back to dashboard/home
    await page.goBack();

    // Verify dashboard content using welcome message
    const welcome = page.getByText('Welcome, Kory', { exact: true });
    await welcome.waitFor({ state: 'visible' });

    // Go forward to accounts page
    await page.goForward();
    await accs.waitFor({ state: 'visible' });

    // Verify URL and "All Accounts" content
    expect(page.url()).toBe(accountsUrl);
});

//     test('page is responsive after load', async ({ page, login }) => {
//         await login();

//         const startTime = Date.now();
//         await page.locator('text=My Accounts').click();
//         const clickTime = Date.now() - startTime;

//         expect(clickTime).toBeLessThan(2000);
//     });
// });

// Example: test with specific user
// test.describe('User-specific tests', () => {
//     test.use({ userId: 'user2' });
//
//     test('user2 can login', async ({ page, login, testUser }) => {
//         await login();
//         await expect(page.locator(`text=${testUser.name}`)).toBeVisible();
//     });
// });
