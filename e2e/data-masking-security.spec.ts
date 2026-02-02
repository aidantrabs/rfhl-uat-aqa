import { expect, test } from '../test-data/fixtures';

const SESSION_TOKEN_PATTERN = /[?&](token|session|sid|auth|jwt)=/i;

test.describe('Security - Data Masking', () => {
    test('account display does not expose sensitive data in DOM attributes', async ({
        page,
        login,
    }) => {
        await login();

        const accountRibbon = page
            .locator('.araure-primary-ribbon-item')
            .first();
        await expect(accountRibbon).toBeVisible();

        // check that account numbers are not exposed in data attributes or hidden fields
        const sensitiveAttributes = await page.evaluate(() => {
            const findings: string[] = [];
            const elements = document.querySelectorAll(
                '[data-account], [data-number], [data-card]'
            );
            elements.forEach((el) => {
                const attrs = Array.from(el.attributes);
                attrs.forEach((attr) => {
                    if (/\d{10,16}/.test(attr.value)) {
                        findings.push(`${attr.name}="${attr.value}"`);
                    }
                });
            });

            return findings;
        });

        expect(
            sensitiveAttributes.length === 0,
            `Sensitive data found in DOM attributes: ${sensitiveAttributes.join(', ')}`
        ).toBeTruthy();
    });

    test('card numbers show only last 4 digits when present', async ({
        page,
        login,
    }) => {
        await login();

        const myAccountsLink = page
            .locator('li.leeds_list_item')
            .filter({ hasText: 'My Accounts' });
        await expect(myAccountsLink).toBeVisible();
        await myAccountsLink.click();

        await page.waitForTimeout(2000);

        // look for card number elements and verify masking
        const cardElements = page.locator(
            '[class*="card"], [class*="account"]'
        );
        const cardCount = await cardElements.count();

        for (let i = 0; i < cardCount; i++) {
            const element = cardElements.nth(i);
            const isVisible = await element.isVisible().catch(() => false);

            if (isVisible) {
                const text = await element.textContent();

                if (text) {
                    // check for full 16-digit card numbers (PAN)
                    const hasFullCardNumber =
                        /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/.test(text);
                    expect(
                        !hasFullCardNumber,
                        `Full card number (PAN) may be exposed in element`
                    ).toBeTruthy();
                }
            }
        }
    });

    test('CVV is never displayed or pre-filled', async ({ page, login }) => {
        await login();

        const myAccountsLink = page
            .locator('li.leeds_list_item')
            .filter({ hasText: 'My Accounts' });
        await expect(myAccountsLink).toBeVisible();
        await myAccountsLink.click();

        await page.waitForTimeout(2000);

        // CVV inputs should never have pre-filled values
        const cvvInputs = page.locator(
            'input[name*="cvv" i], input[name*="cvc" i], input[name*="security" i], input[autocomplete*="cc-csc"]'
        );
        const cvvCount = await cvvInputs.count();

        for (let i = 0; i < cvvCount; i++) {
            const input = cvvInputs.nth(i);
            const value = await input.inputValue().catch(() => '');
            expect(
                value === '' || value.length === 0,
                'CVV input should not have a pre-filled value'
            ).toBeTruthy();
        }

        // check page content for exposed CVV values near CVV labels
        const pageContent = await page.content();
        // CVV should not appear as plain text with actual 3-4 digit values
        const cvvExposure =
            /cvv[:\s]*\d{3,4}|cvc[:\s]*\d{3,4}|security\s*code[:\s]*\d{3,4}/i.test(
                pageContent
            );
        expect(
            !cvvExposure,
            'CVV value may be exposed in page content'
        ).toBeTruthy();
    });
});

test.describe('Security - Session Protection', () => {
    test('session tokens are not exposed in URL', async ({ page, login }) => {
        await login();

        // check current URL
        const currentUrl = page.url();
        expect(
            !SESSION_TOKEN_PATTERN.test(currentUrl),
            `Session token found in URL: ${currentUrl}`
        ).toBeTruthy();

        // navigate and check URL again
        const myAccountsLink = page
            .locator('li.leeds_list_item')
            .filter({ hasText: 'My Accounts' });
        await myAccountsLink.click();
        await page.waitForTimeout(2000);

        const afterNavUrl = page.url();
        expect(
            !SESSION_TOKEN_PATTERN.test(afterNavUrl),
            `Session token found in URL after navigation: ${afterNavUrl}`
        ).toBeTruthy();

        // check for sensitive query params
        const sensitiveParams = ['password', 'pwd', 'secret', 'key', 'apikey'];
        for (const param of sensitiveParams) {
            expect(
                !afterNavUrl.toLowerCase().includes(param),
                `Sensitive parameter "${param}" found in URL`
            ).toBeTruthy();
        }
    });

    test('session tokens are not exposed in browser console', async ({
        page,
        login,
    }) => {
        const consoleLogs: string[] = [];

        page.on('console', (msg) => {
            consoleLogs.push(msg.text());
        });

        await login();

        const myAccountsLink = page
            .locator('li.leeds_list_item')
            .filter({ hasText: 'My Accounts' });
        await myAccountsLink.click();
        await page.waitForTimeout(3000);

        // check logs for sensitive data patterns
        const sensitivePatterns = [
            /token["\s]*[:=]["\s]*[a-zA-Z0-9_-]{20,}/i,
            /session["\s]*[:=]["\s]*[a-zA-Z0-9_-]{20,}/i,
            /jwt["\s]*[:=]["\s]*[a-zA-Z0-9._-]{50,}/i,
            /bearer\s+[a-zA-Z0-9._-]{20,}/i,
            /password["\s]*[:=]/i,
        ];

        for (const log of consoleLogs) {
            for (const pattern of sensitivePatterns) {
                expect(
                    !pattern.test(log),
                    `Sensitive data pattern found in console log`
                ).toBeTruthy();
            }
        }
    });

    test('session maintained via secure cookies not URL', async ({
        page,
        login,
    }) => {
        await login();

        const sidebar = page
            .locator('li.leeds_list_item')
            .filter({ hasText: 'My Accounts' });
        await expect(sidebar).toBeVisible();

        // verify URL doesn't contain session tokens
        const currentUrl = page.url();
        expect(!SESSION_TOKEN_PATTERN.test(currentUrl)).toBeTruthy();

        await page.reload();
        await expect(sidebar).toBeVisible({ timeout: 120_000 });

        // session should be maintained via cookies
        const cookies = await page.context().cookies();
        const hasSessionCookie = cookies.some(
            (c) => c.name.toLowerCase().includes('session') || c.httpOnly
        );
        expect(
            hasSessionCookie,
            'Session should be maintained via secure cookies'
        ).toBeTruthy();
    });

    test('passwords and credentials not stored in browser storage', async ({
        page,
        login,
    }) => {
        await login();

        // check localStorage and sessionStorage for highly sensitive data
        const storageCheck = await page.evaluate(() => {
            const findings: string[] = [];
            const criticalKeys = [
                'password',
                'secret',
                'apikey',
                'credential',
                'private',
            ];

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) {
                    const lowerKey = key.toLowerCase();
                    for (const sensitive of criticalKeys) {
                        if (lowerKey.includes(sensitive)) {
                            findings.push(`localStorage: ${key}`);
                        }
                    }

                    const value = localStorage.getItem(key) || '';
                    if (/password|secret/i.test(value)) {
                        findings.push(
                            `localStorage value contains sensitive data: ${key}`
                        );
                    }
                }
            }

            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key) {
                    const lowerKey = key.toLowerCase();
                    for (const sensitive of criticalKeys) {
                        if (lowerKey.includes(sensitive)) {
                            findings.push(`sessionStorage: ${key}`);
                        }
                    }

                    const value = sessionStorage.getItem(key) || '';
                    if (/password|secret/i.test(value)) {
                        findings.push(
                            `sessionStorage value contains sensitive data: ${key}`
                        );
                    }
                }
            }

            return findings;
        });

        expect(
            storageCheck.length === 0,
            `Sensitive data found in browser storage: ${storageCheck.join(', ')}`
        ).toBeTruthy();
    });
});

test.describe('Security - Input Protection', () => {
    test('password fields use correct input type', async ({ page }) => {
        const baseUrl = process.env.BASE_URL;
        if (!baseUrl) throw new Error('BASE_URL required');

        await page.goto(`${baseUrl}/#/administrationGeneral/login`);

        const usernameField = page.locator('#step01');
        await expect(usernameField).toBeVisible({ timeout: 180_000 });

        const nextButton = page
            .locator('icb-login-step-user a')
            .filter({ hasText: 'Next' });
        await usernameField.fill('testuser');
        await nextButton.click();

        const passwordField = page.locator('#step02');
        await expect(passwordField).toBeVisible({ timeout: 30_000 });

        const inputType = await passwordField.getAttribute('type');
        expect(inputType, 'Password field should have type="password"').toBe(
            'password'
        );
    });
});
