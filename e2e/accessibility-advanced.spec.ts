import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from '../test-data/fixtures';

async function dismissOverlay(page: Page) {
    const overlay = page.locator('div.custom-overlay[data-hidden="false"]');

    if (await overlay.isVisible({ timeout: 500 }).catch(() => false)) {
        await overlay.click();
        await page.waitForTimeout(300);
    }
}

async function navigateToSection(page: Page, sectionName: string) {
    await dismissOverlay(page);
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

async function goToLoginPage(page: Page) {
    const baseUrl = process.env.BASE_URL;
    if (!baseUrl) throw new Error('BASE_URL required');
    await page.goto(`${baseUrl}/#/administrationGeneral/login`, {
        waitUntil: 'domcontentloaded',
    });
    await expect(page.locator('#step01')).toBeVisible({ timeout: 180_000 });
}

test.describe('Advanced A11y - WCAG Compliance', () => {
    const WCAG_LEVELS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'];

    test('Login page - scan per WCAG level', async ({ page }) => {
        await goToLoginPage(page);

        for (const tag of WCAG_LEVELS) {
            const { violations } = await new AxeBuilder({ page })
                .withTags([tag])
                .analyze();
            console.log(`[${tag}] ${violations.length} violations`);

            for (const v of violations) {
                console.log(
                    `  ${v.impact} | ${v.id} - ${v.help} (${v.nodes.length} el)`
                );
            }
        }
    });

    test('Dashboard - scan per WCAG level', async ({ page, login }) => {
        await login();

        for (const tag of WCAG_LEVELS) {
            const { violations } = await new AxeBuilder({ page })
                .withTags([tag])
                .analyze();
            console.log(`[${tag}] ${violations.length} violations`);

            for (const v of violations) {
                console.log(
                    `  ${v.impact} | ${v.id} - ${v.help} (${v.nodes.length} el)`
                );
            }
        }
    });

    test('All sections - WCAG 2.1 AA', async ({ page, login }) => {
        await login();

        const sections = [
            {
                name: 'Accounts',
                go: () => navigateToSection(page, 'My Accounts'),
            },
            {
                name: 'Transfer',
                go: async () => {
                    await navigateToSection(page, 'Transfer');
                    await clickMenuOption(page, 'Between Your Own Accounts');
                },
            },
            {
                name: 'Pay',
                go: async () => {
                    await navigateToSection(page, 'Pay');
                    await clickMenuOption(page, 'Your Credit Card');
                },
            },
            {
                name: 'Service Request',
                go: async () => {
                    await navigateToSection(page, 'Service Request');
                    await clickMenuOption(page, 'New Application');
                },
            },
            {
                name: 'Manage',
                go: async () => {
                    await navigateToSection(page, 'Manage');
                    await clickMenuOption(page, 'Third-Party Beneficiaries');
                },
            },
        ];

        for (const section of sections) {
            await section.go();
            const { violations } = await new AxeBuilder({ page })
                .withTags(['wcag21aa'])
                .analyze();
            console.log(`${section.name}: ${violations.length} violations`);

            for (const v of violations) {
                console.log(`  ${v.impact} | ${v.id} (${v.nodes.length} el)`);
            }
        }
    });
});

test.describe('Advanced A11y - Keyboard Navigation', () => {
    test('Login - interactive elements reachable via Tab', async ({ page }) => {
        await goToLoginPage(page);

        // count how many elements exist vs how many we can tab to
        const totalInteractive = await page.evaluate(
            () =>
                document.querySelectorAll(
                    'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
                ).length
        );

        const reached: string[] = [];
        for (let i = 0; i < totalInteractive + 5; i++) {
            await page.keyboard.press('Tab');
            const tag = await page.evaluate(() => {
                const el = document.activeElement;
                if (!el || el === document.body) return null;
                return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}`;
            });

            if (tag && !reached.includes(tag)) {
                reached.push(tag);
            }
        }

        console.log(`Interactive elements on page: ${totalInteractive}`);
        console.log(`Reachable via Tab: ${reached.length}`);
        for (const el of reached) {
            console.log(`  ${el}`);
        }

        expect(
            reached.length,
            'Some elements should be tabbable'
        ).toBeGreaterThan(0);
    });

    test('Dashboard - sidebar items keyboard accessible', async ({
        page,
        login,
    }) => {
        await login();

        const sidebarCount = await page.locator('li.leeds_list_item').count();
        const reached: string[] = [];

        for (let i = 0; i < 30; i++) {
            await page.keyboard.press('Tab');
            const text = await page.evaluate(() => {
                const el = document.activeElement;
                if (!el || el === document.body) {
                    return null;
                }

                return el.closest('.leeds_list_item')
                    ? (el.textContent?.trim().substring(0, 40) ?? null)
                    : null;
            });

            if (text && !reached.includes(text)) {
                reached.push(text);
            }
        }

        console.log(
            `Sidebar items: ${sidebarCount}, reachable via Tab: ${reached.length}`
        );
        for (const item of reached) {
            console.log(`  ${item}`);
        }
    });

    test('Transfer form - fields reachable via Tab', async ({
        page,
        login,
    }) => {
        await login();
        await navigateToSection(page, 'Transfer');
        await clickMenuOption(page, 'Between Your Own Accounts');

        const tabbed: string[] = [];
        for (let i = 0; i < 20; i++) {
            await page.keyboard.press('Tab');

            const desc = await page.evaluate(() => {
                const el = document.activeElement;
                if (!el || el === document.body) {
                    return null;
                }

                const tag = el.tagName.toLowerCase();
                const name =
                    el.getAttribute('name') ||
                    el.getAttribute('formcontrolname') ||
                    '';
                const text = el.textContent?.trim().substring(0, 30) || '';

                return `${tag}${name ? `[${name}]` : ''} "${text}"`;
            });

            if (desc) {
                tabbed.push(desc);
            }
        }

        console.log(`Tab sequence (${tabbed.length} stops):`);
        for (const [i, el] of tabbed.entries()) {
            console.log(`  ${i + 1}. ${el}`);
        }
    });
});

test.describe('Advanced A11y - Focus Management', () => {
    test('focus moves to content after sidebar navigation', async ({
        page,
        login,
    }) => {
        await login();

        for (const section of ['My Accounts', 'Transfer', 'Pay']) {
            await navigateToSection(page, section);

            const focused = await page.evaluate(() => {
                const el = document.activeElement;
                if (!el || el === document.body) {
                    return 'body';
                }

                return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '');
            });

            const inSidebar = await page.evaluate(() => {
                const el = document.activeElement;
                return !!el?.closest('.leeds_list_item, nav');
            });

            console.log(
                `${section}: focus on <${focused}> ${inSidebar ? '(still in sidebar)' : '(content area)'}`
            );
        }
    });

    test('logout dialog traps focus', async ({ page, login }) => {
        await login();

        const logoutLink = page.locator('icb-logout a.derby-link');
        if (!(await logoutLink.isVisible().catch(() => false))) {
            console.log('Logout link not visible, skipping');
            return;
        }

        await logoutLink.click();
        await page.waitForTimeout(1000);

        // check if focus is inside a dialog
        const focusInDialog = await page.evaluate(() => {
            const el = document.activeElement;
            return !!el?.closest(
                '[role="dialog"], [role="alertdialog"], .modal, [class*="dialog"]'
            );
        });
        console.log(`Focus in dialog after open: ${focusInDialog}`);

        // tab around and see if focus escapes
        let escaped = 0;
        for (let i = 0; i < 10; i++) {
            await page.keyboard.press('Tab');
            const still = await page.evaluate(() => {
                const el = document.activeElement;
                return !!el?.closest(
                    '[role="dialog"], [role="alertdialog"], .modal, [class*="dialog"]'
                );
            });

            if (!still) {
                escaped++;
            }
        }
        console.log(`Focus escaped dialog: ${escaped}/10 tabs`);

        // dismiss
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);

        const cancelBtn = page.getByText('Cancel').first();
        if (await cancelBtn.isVisible().catch(() => false)) {
            await cancelBtn.click();
        }
    });
});

test.describe('Advanced A11y - ARIA Landmarks', () => {
    test('Login page has required landmarks', async ({ page }) => {
        await goToLoginPage(page);

        const found = await page.evaluate(() => {
            const tags: Record<string, string> = {
                main: 'main',
                nav: 'navigation',
                header: 'banner',
            };

            const results: string[] = [];
            for (const [tag, role] of Object.entries(tags)) {
                if (document.querySelector(tag)) {
                    results.push(role);
                }
            }

            // also check explicit role attributes
            document.querySelectorAll('[role]').forEach((el) => {
                const role = el.getAttribute('role') || '';
                if (
                    ['main', 'navigation', 'banner'].includes(role) &&
                    !results.includes(role)
                ) {
                    results.push(role);
                }
            });
            return results;
        });

        for (const required of ['main', 'navigation', 'banner']) {
            console.log(
                `${required}: ${found.includes(required) ? 'FOUND' : 'MISSING'}`
            );
        }
    });

    test('Dashboard has required landmarks', async ({ page, login }) => {
        await login();

        const found = await page.evaluate(() => {
            const tags: Record<string, string> = {
                main: 'main',
                nav: 'navigation',
                header: 'banner',
            };

            const results: string[] = [];
            for (const [tag, role] of Object.entries(tags)) {
                if (document.querySelector(tag)) {
                    results.push(role);
                }
            }

            document.querySelectorAll('[role]').forEach((el) => {
                const role = el.getAttribute('role') || '';
                if (
                    ['main', 'navigation', 'banner'].includes(role) &&
                    !results.includes(role)
                ) {
                    results.push(role);
                }
            });

            return results;
        });

        for (const required of ['main', 'navigation', 'banner']) {
            console.log(
                `${required}: ${found.includes(required) ? 'FOUND' : 'MISSING'}`
            );
        }
    });
});

test.describe('Advanced A11y - Page Titles', () => {
    test('Login has a meaningful title', async ({ page }) => {
        await goToLoginPage(page);
        const title = await page.title();
        console.log(`Title: "${title}"`);
        expect(title.length, 'Page should have a title').toBeGreaterThan(0);
    });

    test('each section has a unique title', async ({ page, login }) => {
        await login();

        const titles: Record<string, string> = {};
        titles.Dashboard = await page.title();

        for (const section of [
            'My Accounts',
            'Transfer',
            'Pay',
            'Service Request',
            'Manage',
        ]) {
            await navigateToSection(page, section);
            titles[section] = await page.title();
        }

        const unique = new Set(Object.values(titles));
        for (const [section, title] of Object.entries(titles)) {
            console.log(`${section}: "${title}"`);
        }

        console.log(
            `Unique titles: ${unique.size}/${Object.keys(titles).length}`
        );
    });
});

test.describe('Advanced A11y - Heading Hierarchy', () => {
    test('Dashboard headings', async ({ page, login }) => {
        await login();

        const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', (els) =>
            els.map((el) => ({
                level: Number(el.tagName[1]),
                text: el.textContent?.trim().substring(0, 50) || '(empty)',
            }))
        );

        const hasH1 = headings.some((h) => h.level === 1);
        console.log(`Headings: ${headings.length}, has h1: ${hasH1}`);
        for (const h of headings) {
            console.log(`  h${h.level}: ${h.text}`);
        }

        // check for level skips
        for (let i = 1; i < headings.length; i++) {
            if (headings[i].level > headings[i - 1].level + 1) {
                console.log(
                    `  SKIP: h${headings[i - 1].level} -> h${headings[i].level}`
                );
            }
        }
    });

    test('all sections heading hierarchy', async ({ page, login }) => {
        await login();

        for (const section of [
            'My Accounts',
            'Transfer',
            'Pay',
            'Service Request',
            'Manage',
        ]) {
            await navigateToSection(page, section);

            const headings = await page.$$eval(
                'h1, h2, h3, h4, h5, h6',
                (els) =>
                    els.map((el) => ({
                        level: Number(el.tagName[1]),
                        text:
                            el.textContent?.trim().substring(0, 50) ||
                            '(empty)',
                    }))
            );

            const hasH1 = headings.some((h) => h.level === 1);
            let skips = 0;
            for (let i = 1; i < headings.length; i++) {
                if (headings[i].level > headings[i - 1].level + 1) {
                    skips++;
                }
            }

            console.log(
                `${section}: ${headings.length} headings, h1: ${hasH1}, skips: ${skips}`
            );
        }
    });
});

test.describe('Advanced A11y - Skip Navigation', () => {
    test('Login page has skip-to-content link', async ({ page }) => {
        await goToLoginPage(page);

        const skipLinks = await page.evaluate(() => {
            const found: string[] = [];
            document.querySelectorAll('a').forEach((a) => {
                const text = (a.textContent || '').trim().toLowerCase();
                if (text.includes('skip') || text.includes('main content')) {
                    found.push(a.textContent?.trim() || '');
                }
            });

            return found;
        });

        console.log(`Skip links found: ${skipLinks.length}`);
        for (const link of skipLinks) {
            console.log(`  "${link}"`);
        }

        if (skipLinks.length === 0) {
            console.log('  WCAG 2.4.1: skip link missing');
        }
    });

    test('Dashboard has skip-to-content link', async ({ page, login }) => {
        await login();

        const skipLinks = await page.evaluate(() => {
            const found: string[] = [];
            document.querySelectorAll('a').forEach((a) => {
                const text = (a.textContent || '').trim().toLowerCase();
                if (text.includes('skip') || text.includes('main content')) {
                    found.push(a.textContent?.trim() || '');
                }
            });

            return found;
        });

        console.log(`Skip links found: ${skipLinks.length}`);
        if (skipLinks.length === 0) {
            console.log('  WCAG 2.4.1: skip link missing');
        }
    });
});

test.describe('Advanced A11y - Form Accessibility', () => {
    test('Login form fields have labels', async ({ page }) => {
        await goToLoginPage(page);

        const fields = await page.$$eval('input, select, textarea', (els) =>
            els.map((el) => {
                const id = el.id;
                const hasLabel = id
                    ? !!document.querySelector(`label[for="${id}"]`)
                    : false;
                const hasAria =
                    !!el.getAttribute('aria-label') ||
                    !!el.getAttribute('aria-labelledby');
                return {
                    name:
                        el.getAttribute('name') ||
                        el.getAttribute('formcontrolname') ||
                        '?',
                    type: el.getAttribute('type') || el.tagName.toLowerCase(),
                    labeled: hasLabel || hasAria,
                };
            })
        );

        let unlabeled = 0;
        for (const f of fields) {
            if (!f.labeled) {
                unlabeled++;
            }
            console.log(
                `${f.type}[${f.name}]: ${f.labeled ? 'labeled' : 'MISSING LABEL'}`
            );
        }

        console.log(`Unlabeled: ${unlabeled}/${fields.length}`);
    });

    test('Transfer form fields have labels and required indicators', async ({
        page,
        login,
    }) => {
        await login();
        await navigateToSection(page, 'Transfer');
        await clickMenuOption(page, 'Between Your Own Accounts');

        const fields = await page.$$eval('input, select, textarea', (els) =>
            els.map((el) => {
                const id = el.id;
                const hasLabel = id
                    ? !!document.querySelector(`label[for="${id}"]`)
                    : false;
                const hasAria =
                    !!el.getAttribute('aria-label') ||
                    !!el.getAttribute('aria-labelledby');

                return {
                    name:
                        el.getAttribute('name') ||
                        el.getAttribute('formcontrolname') ||
                        '?',
                    type: el.getAttribute('type') || el.tagName.toLowerCase(),
                    labeled: hasLabel || hasAria,
                    required:
                        el.hasAttribute('required') ||
                        el.getAttribute('aria-required') === 'true',
                };
            })
        );

        let unlabeled = 0;
        for (const f of fields) {
            if (!f.labeled) {
                unlabeled++;
            }

            console.log(
                `${f.type}[${f.name}]: ${f.labeled ? 'labeled' : 'MISSING'} ${f.required ? '(required)' : ''}`
            );
        }
        console.log(`Unlabeled: ${unlabeled}/${fields.length}`);
    });
});

test.describe('Advanced A11y - Color Contrast AAA', () => {
    test('Login - enhanced contrast check', async ({ page }) => {
        await goToLoginPage(page);

        const { violations } = await new AxeBuilder({ page })
            .withTags(['wcag2aaa'])
            .analyze();

        const contrast = violations.filter((v) => v.id.includes('contrast'));
        console.log(`AAA contrast violations: ${contrast.length}`);

        for (const v of contrast) {
            console.log(`  ${v.id}: ${v.nodes.length} elements`);
        }
    });

    test('Dashboard - enhanced contrast check', async ({ page, login }) => {
        await login();

        const { violations } = await new AxeBuilder({ page })
            .withTags(['wcag2aaa'])
            .analyze();

        const contrast = violations.filter((v) => v.id.includes('contrast'));
        console.log(`AAA contrast violations: ${contrast.length}`);

        for (const v of contrast) {
            console.log(`  ${v.id}: ${v.nodes.length} elements`);
        }
    });
});

test.describe('Advanced A11y - Responsive Zoom', () => {
    test('Dashboard at 200% zoom', async ({ page, login }) => {
        await login();

        // halve viewport to simulate 200% zoom
        await page.setViewportSize({ width: 640, height: 360 });
        await page.waitForTimeout(1000);

        const overflow = await page.evaluate(
            () => document.body.scrollWidth > window.innerWidth
        );
        console.log(`Horizontal overflow: ${overflow}`);

        if (overflow) {
            console.log(
                '  WCAG 1.4.10: content should reflow without h-scroll'
            );
        }

        await page.setViewportSize({ width: 1280, height: 720 });
    });

    test('Transfer form at 200% zoom', async ({ page, login }) => {
        await login();
        await navigateToSection(page, 'Transfer');
        await clickMenuOption(page, 'Between Your Own Accounts');

        await page.setViewportSize({ width: 640, height: 360 });
        await page.waitForTimeout(1000);

        const overflow = await page.evaluate(
            () => document.body.scrollWidth > window.innerWidth
        );
        const visibleInputs = await page
            .locator('input:visible, select:visible, textarea:visible')
            .count();

        console.log(`Horizontal overflow: ${overflow}`);
        console.log(`Visible form inputs at zoom: ${visibleInputs}`);

        await page.setViewportSize({ width: 1280, height: 720 });
    });
});

test.describe('Advanced A11y - Screen Reader Support', () => {
    test('Dashboard - interactive elements have accessible names', async ({
        page,
        login,
    }) => {
        await login();

        // axe already checks this with link-name, button-name, etc. — run those specific rules
        const { violations } = await new AxeBuilder({ page })
            .withRules([
                'link-name',
                'button-name',
                'image-alt',
                'input-image-alt',
                'label',
            ])
            .analyze();

        console.log(`Violations: ${violations.length}`);

        for (const v of violations) {
            console.log(`  ${v.id}: ${v.help} (${v.nodes.length} el)`);
        }
    });

    test('Dashboard - aria-live regions for dynamic content', async ({
        page,
        login,
    }) => {
        await login();

        const count = await page.evaluate(
            () =>
                document.querySelectorAll(
                    '[aria-live], [role="alert"], [role="status"], [role="log"]'
                ).length
        );

        console.log(`Live regions found: ${count}`);
        if (count === 0) {
            console.log(
                '  Banking apps with dynamic updates should use aria-live regions'
            );
        }
    });
});

test.describe('Advanced A11y - Tab Order', () => {
    test('Login tab order follows visual layout', async ({ page }) => {
        await goToLoginPage(page);

        // get visual order of interactive elements
        const visual = await page.$$eval(
            'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
            (els) =>
                els
                    .filter((el) => {
                        const r = el.getBoundingClientRect();
                        return r.width > 0 && r.height > 0;
                    })
                    .map((el) => ({
                        tag:
                            el.tagName.toLowerCase() +
                            (el.id ? '#' + el.id : ''),
                        y: Math.round(el.getBoundingClientRect().top),
                        tabindex: el.getAttribute('tabindex'),
                    }))
                    .sort((a, b) => a.y - b.y)
        );

        // collect actual tab order
        const tabbed: string[] = [];
        for (let i = 0; i < visual.length + 3; i++) {
            await page.keyboard.press('Tab');

            const tag = await page.evaluate(() => {
                const el = document.activeElement;
                if (!el || el === document.body) {
                    return null;
                }

                return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '');
            });

            if (tag) {
                tabbed.push(tag);
            }
        }

        console.log('Visual order:');
        for (const el of visual) {
            console.log(
                `  ${el.tag} (y=${el.y})${el.tabindex ? ` tabindex=${el.tabindex}` : ''}`
            );
        }

        console.log('Tab order:');
        for (const el of tabbed) {
            console.log(`  ${el}`);
        }

        // warn on positive tabindex (anti-pattern)
        const badTabindex = visual.filter(
            (el) => el.tabindex && Number(el.tabindex) > 0
        );
        if (badTabindex.length > 0) {
            console.log('Positive tabindex found (anti-pattern):');

            for (const el of badTabindex) {
                console.log(`  ${el.tag} tabindex=${el.tabindex}`);
            }
        }
    });
});
