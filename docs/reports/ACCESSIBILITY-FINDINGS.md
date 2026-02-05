# Accessibility Findings Report

**Date:** 2026-02-04
**Test Suites:** `e2e/accessability.spec.ts`, `e2e/accessibility-advanced.spec.ts`
**Related Issue:** #53
**Target Standard:** WCAG 2.1 Level AA

---

## Summary

During accessibility testing of the Republic Bank UAT environment, **significant accessibility barriers** were identified across all pages. The most critical issues affect keyboard-only users, screen reader users, and users with low vision. No pages are fully WCAG 2.1 AA compliant.

**Key statistics:**
- 27 pages scanned with axe-core (baseline)
- 12 advanced accessibility categories tested
- Every page has at least 2 axe violations
- `color-contrast` violations appear on every page
- `meta-viewport` zoom restriction on every page
- Zero skip navigation links across the entire application
- Zero `<h1>` elements on any page
- All form fields lack proper `<label>` associations
- Sidebar navigation is not keyboard-accessible

---

## Finding 1: Missing Skip Navigation Link

### Observation
No skip-to-content link exists on any page. Users must Tab through the entire navigation sidebar before reaching page content.

### Location
- Login page
- Dashboard
- All authenticated pages

### WCAG Criteria Violated
- **2.4.1** Bypass Blocks (Level A)

### Why This Matters
Keyboard and screen reader users must navigate through the same sidebar, header, and footer on every page load. Without a skip link, accessing main content requires dozens of Tab presses.

### Recommended Remediation
Add a visually hidden skip link as the first focusable element:
```html
<a href="#main-content" class="skip-link">Skip to main content</a>
```
With CSS that reveals it on focus:
```css
.skip-link { position: absolute; left: -9999px; }
.skip-link:focus { position: static; }
```

---

## Finding 2: Sidebar Navigation Not Keyboard-Accessible

### Observation
The sidebar navigation items (`li.leeds_list_item`) receive zero Tab focus. Keyboard-only users cannot navigate between sections (My Accounts, Transfer, Pay, etc.) without a mouse.

### Location
- Dashboard sidebar (all 6 navigation items)

### WCAG Criteria Violated
- **2.1.1** Keyboard (Level A)
- **2.1.2** No Keyboard Trap (Level A)

### Why This Matters
Users who cannot use a mouse (motor impairments, screen reader users) are completely locked out of navigating between application sections.

### Recommended Remediation
- Add `tabindex="0"` to sidebar list items or use `<a>` or `<button>` elements
- Add `role="navigation"` and `aria-label="Main menu"` to the sidebar container
- Ensure Enter/Space activates the selected item

---

## Finding 3: No `<h1>` Elements and Heading Level Skips

### Observation
No page in the application has an `<h1>` element. All headings use `<h4>` or `<h6>`. Heading levels frequently skip (e.g., `h4` to `h6` with no `h5`).

### Location
- Dashboard: 7 headings, all `<h6>`, no `<h1>`
- My Accounts: 7 headings, no `<h1>`
- Transfer: 19 headings, `h4 → h6` skips
- Pay: 54 headings, 8x `h4 → h6` skips
- Service Request: 56 headings, 8x `h4 → h6` skips
- Manage: 53 headings, 8x `h4 → h6` skips

### WCAG Criteria Violated
- **1.3.1** Info and Relationships (Level A)
- **2.4.6** Headings and Labels (Level AA)

### Why This Matters
Screen reader users navigate by heading structure. Without `<h1>` and with skipped levels, the page structure is incomprehensible to assistive technology.

### Recommended Remediation
- Add a single `<h1>` per page identifying the current section (e.g., "Dashboard", "Transfer")
- Use `<h2>` for major subsections, `<h3>` for sub-subsections
- Never skip heading levels

---

## Finding 4: All Form Fields Missing Labels

### Observation
100% of form inputs across the application lack proper `<label>` associations. No inputs use `aria-label`, `aria-labelledby`, or `label[for]`. Some rely on `placeholder` text only.

### Location
- Login page: 21/21 fields unlabeled
- Transfer form: 10/10 fields unlabeled
- All form pages affected

### WCAG Criteria Violated
- **1.3.1** Info and Relationships (Level A)
- **4.1.2** Name, Role, Value (Level A)
- **3.3.2** Labels or Instructions (Level A)

### Why This Matters
Screen reader users hear nothing when focusing on a form field. Placeholder text disappears when typing and is not reliably announced. Users cannot understand what information is required.

### Recommended Remediation
Associate every input with a label:
```html
<label for="username">Username</label>
<input id="username" formcontrolname="username">
```
Or use `aria-label` for visually hidden labels:
```html
<input aria-label="Username" formcontrolname="username">
```

---

## Finding 5: Duplicate Page Titles Across All Sections

### Observation
Every page shares the same title: "Republic Bank | We're the One for you!" No section or page-specific title is set.

### Location
- All pages (Login, Dashboard, Accounts, Transfer, Pay, Service Request, Manage)
- Only 1 unique title across 6+ sections

### WCAG Criteria Violated
- **2.4.2** Page Titled (Level A)

### Why This Matters
Screen reader users rely on page titles to identify which page they are on. With identical titles, users cannot distinguish between sections in their tab history or when switching windows.

### Recommended Remediation
Set dynamic page titles per route:
```
"Dashboard | Republic Bank"
"Transfer - Between Own Accounts | Republic Bank"
"My Accounts | Republic Bank"
```

---

## Finding 6: Color Contrast Violations

### Observation
Color contrast violations appear on every page tested. The most affected pages have 20+ elements below the WCAG AA threshold (4.5:1 ratio).

### Location
- Login: 2 elements (AA violation)
- Dashboard: 17 elements
- Transfer > International Bank Account: 20 elements
- My Transactions > Scheduled: 23 elements
- Service Request > Requests Status: 23 elements

### WCAG Criteria Violated
- **1.4.3** Contrast (Minimum) (Level AA)

### Why This Matters
Users with low vision cannot read text that lacks sufficient contrast against its background.

### Recommended Remediation
- Audit all text/background color combinations
- Ensure at minimum 4.5:1 contrast for normal text, 3:1 for large text
- Use browser dev tools or axe DevTools to identify specific elements

---

## Finding 7: Viewport Zoom Restriction

### Observation
The `<meta name="viewport">` tag disables user zoom (`maximum-scale=1` or `user-scalable=no`), preventing users from enlarging text.

### Location
- Every page (set in the root HTML template)

### WCAG Criteria Violated
- **1.4.4** Resize Text (Level AA)

### Why This Matters
Users with low vision need to zoom to 200% or more. Disabling zoom locks out these users entirely.

### Recommended Remediation
Remove zoom restrictions from the viewport meta tag:
```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

---

## Finding 8: Focus Not Managed After Navigation

### Observation
After clicking a sidebar navigation item, focus remains on `<body>` rather than moving to the new content area. No focus indicator or announcement for the content change.

### Location
- All sidebar navigation transitions (My Accounts, Transfer, Pay)

### WCAG Criteria Violated
- **2.4.3** Focus Order (Level A)
- **3.2.2** On Input (Level A)

### Why This Matters
Screen reader users receive no indication that content has changed. They must search the page to find what loaded.

### Recommended Remediation
After SPA route change, programmatically move focus to the main content area or a heading:
```typescript
document.querySelector('h1')?.focus();
```
Or use an `aria-live` region to announce the page change.

---

## Finding 9: Missing ARIA Live Regions

### Observation
No `aria-live` regions exist on the Dashboard or any authenticated page. Dynamic content updates (account balances, notifications, transaction status) are not announced to assistive technology.

### Location
- Dashboard (account balances, message counts)
- All transaction pages

### WCAG Criteria Violated
- **4.1.3** Status Messages (Level AA - WCAG 2.1)

### Why This Matters
Screen reader users are not informed when account balances update, transactions process, or errors occur. They must manually re-read the page to discover changes.

### Recommended Remediation
Add `aria-live="polite"` to containers that dynamically update:
```html
<div aria-live="polite" aria-atomic="true">
  Balance: $1,234.56
</div>
```

---

## Finding 10: Interactive Elements Missing Accessible Names

### Observation
Several interactive elements on the Dashboard lack accessible names, including social media links and navigation controls.

### Location
- Dashboard: 7 elements without names (on initial scan), including:
  - `a.tucson-header-link-open` (hamburger menu)
  - `a.marrakesh_links_container_left` / `right` (pagination)
  - Social media links (Facebook, Twitter, YouTube, email)

### WCAG Criteria Violated
- **4.1.2** Name, Role, Value (Level A)

### Why This Matters
Screen reader users hear "link" with no description, making these controls unusable.

### Recommended Remediation
Add `aria-label` to icon-only links:
```html
<a href="..." aria-label="Open menu" class="tucson-header-link-open">
<a href="..." aria-label="Facebook" class="oxford-contact-fb">
```

---

## Finding 11: Login Page Missing `<nav>` Landmark

### Observation
The Login page has `<main>` and `<header>` landmarks but no `<nav>` landmark. Navigation links are not semantically grouped.

### Location
- Login page only (Dashboard has `<nav>`)

### WCAG Criteria Violated
- **1.3.1** Info and Relationships (Level A)

### Recommended Remediation
Wrap navigation links in a `<nav>` element with an `aria-label`.

---

## WCAG Compliance Matrix

| WCAG Level     | Login | Dashboard | Accounts | Transfer | Pay | Service Req | Manage |
|----------------|-------|-----------|----------|----------|-----|-------------|--------|
| 2.0 A          | 1     | 2         | 0        | 0        | 0   | 0           | 0      |
| 2.0 AA         | 2     | 2         | 2        | 3        | 2   | 2           | 2      |
| 2.1 AA         | 0     | 0         | 0        | 0        | 0   | 0           | 0      |
| Best Practices | 0     | 0         | 0        | 0        | 0   | 0           | 0      |

*Values = number of axe-core automated violations per level*

---

## Category Results

| Category                | Status | Notes |
|-------------------------|--------|-------|
| Keyboard Navigation     | FAIL   | Sidebar items not reachable via Tab; login has only 2 tabbable elements out of 52 |
| Focus Management        | FAIL   | Focus stays on `<body>` after navigation; logout dialog does not trap focus |
| ARIA Landmarks          | WARN   | Dashboard has all required landmarks; Login missing `<nav>` |
| Tab Order               | WARN   | Login tab order matches visual order but only 2 elements are tabbable |
| Page Titles             | FAIL   | All pages share identical title |
| Heading Hierarchy       | FAIL   | No `<h1>` on any page; h4→h6 skips throughout |
| Skip Navigation         | FAIL   | No skip-to-content link on any page |
| Form Accessibility      | FAIL   | 100% of form fields lack labels |
| Color Contrast (AA)     | FAIL   | Every page has contrast violations |
| Color Contrast (AAA)    | PASS   | No AAA-specific violations beyond AA |
| Responsive Zoom (200%)  | WARN   | No horizontal overflow but 12 clipped text elements on Dashboard |
| Screen Reader Support   | FAIL   | Missing accessible names, no aria-live regions |

---

## Risk Matrix

| Finding | Severity | WCAG Level | User Impact | Priority |
|---------|----------|------------|-------------|----------|
| Sidebar not keyboard-accessible | Critical | A | Keyboard users locked out | P1 |
| All form fields unlabeled | Critical | A | Screen reader users cannot fill forms | P1 |
| No skip navigation | High | A | Excessive tabbing for keyboard users | P1 |
| No h1, heading skips | High | A/AA | Screen readers cannot parse structure | P1 |
| Duplicate page titles | High | A | Pages indistinguishable for screen readers | P2 |
| Color contrast failures | High | AA | Low-vision users cannot read text | P2 |
| Viewport zoom disabled | High | AA | Low-vision users cannot zoom | P2 |
| No focus management | Medium | A | Navigation changes go unnoticed | P2 |
| Missing ARIA live regions | Medium | AA | Dynamic updates not announced | P2 |
| Missing accessible names | Medium | A | Icon-only controls unidentifiable | P3 |
| Missing nav landmark (Login) | Low | A | Minor structural gap | P3 |

---

## Recommendations Summary

### Immediate (P1)
- Make sidebar navigation keyboard-accessible (`tabindex`, proper `role`)
- Add `<label>` associations to all form fields
- Add skip-to-content links on every page
- Fix heading hierarchy (add `<h1>`, remove level skips)

### Short-term (P2)
- Set unique, descriptive page titles per route
- Fix all color contrast failures (4.5:1 minimum)
- Remove viewport zoom restrictions
- Implement focus management after SPA navigation
- Add `aria-live` regions for dynamic content (balances, notifications)

### Ongoing
- Include accessibility tests in CI/CD pipeline
- Train development team on WCAG 2.1 AA requirements
- Conduct screen reader testing with NVDA/VoiceOver
- Engage users with disabilities for usability testing

---

## Test Coverage

| Test | WCAG Criteria | Verifies |
|------|---------------|----------|
| Baseline axe scans (27 pages) | Multiple | Automated rule violations per page |
| WCAG compliance by level | 2.0A/AA, 2.1AA | Violations categorized by standard |
| Login keyboard navigation | 2.1.1, 2.1.2 | Interactive elements reachable via Tab |
| Dashboard keyboard sidebar | 2.1.1 | Sidebar items reachable via keyboard |
| Transfer form tab sequence | 2.4.3 | Form fields in logical tab order |
| Focus after navigation | 2.4.3, 3.2.2 | Focus moves to content area |
| Logout dialog focus trap | 2.4.3 | Focus stays within modal |
| ARIA landmarks (Login/Dashboard) | 1.3.1, 2.4.1 | Required landmark regions present |
| Page titles | 2.4.2 | Unique, descriptive titles per page |
| Heading hierarchy | 1.3.1, 2.4.6 | No h1 missing, no level skips |
| Skip navigation | 2.4.1 | Skip-to-content link exists |
| Form labels (Login/Transfer) | 1.3.1, 4.1.2, 3.3.2 | Labels associated with inputs |
| Color contrast AAA | 1.4.6 | Enhanced contrast ratio |
| 200% zoom (Dashboard/Transfer) | 1.4.10 | Content reflows without h-scroll |
| Screen reader (axe rules) | 4.1.2, 1.1.1 | link-name, button-name, image-alt, label |
| ARIA live regions | 4.1.3 | Dynamic content announced |
| Tab order vs visual order | 2.4.3 | Tab sequence matches layout |

---

## References

- [WCAG 2.1 Guidelines](https://www.w3.org/TR/WCAG21/)
- [WCAG Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe-core Rule Descriptions](https://github.com/dequelabs/axe-core/blob/master/doc/rule-descriptions.md)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [OWASP Accessibility Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
