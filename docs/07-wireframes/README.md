# Wireframes

Low-fidelity wireframes for **mobile (360px)** and **desktop (1280px)**, produced in Phase 1 Cycle 1.2.

**Format: D2 diagrams.** Each screen is a `.d2` file (rendered to SVG via `d2 file.d2 file.svg`) using nested containers to show layout structure — zones, panels, tables, buttons as labeled boxes. Grayscale sketch level only: no colors beyond gray fills, no real imagery. D2 sources are the tracked artifacts; rendered SVGs are committed alongside for review.

**Prerequisite:** wireframes must apply the conventions from `../09-lob-ui-patterns.md` (search, sorting, tables, master–detail/forms) consistently — every list screen shows the same search/sort/table pattern; every parent-child screen (order, PO) uses the chosen master–detail pattern.

## Verification gate (before any graphic design)

Every wireframe set must pass a cross-check, recorded in `verification.md` in this folder:

| Check against | Question |
|---|---|
| BRD (docs/01) | Does every business process and rule have the screens/controls it needs? |
| SRS (docs/02) | Is every functional requirement reachable? Do NFRs (breakpoints, i18n) hold? |
| PRD (docs/03) | Does every feature/user story map to at least one wireframe, and vice versa? |
| UX design (docs/05) | Do flows, navigation, and screen states match? |
| LOB patterns (docs/09) | Are the four pattern conventions applied identically on every screen? |
| Workflows (docs/08) | Can every state transition be performed by the intended role? |

Only after this gate passes do we proceed to graphic design + design tokens (docs/06), then the real web application.

## Naming
`NN-screen-name.mobile.d2` / `NN-screen-name.desktop.d2` (+ rendered `.svg`)

## Screen checklist (from PRD features)
- [x] 01-login (+ language select)
- [x] 02-dashboard
- [x] 03-companies-list / 04-company-detail
- [x] 05-products-list / 06-product-detail
- [x] 07-categories
- [x] 08-orders-list / 09-order-create / 10-order-detail
- [x] 11-purchase-orders-list / 12-po-create / 13-po-detail (approve/receive)
- [x] 14-inventory-onhand / 15-inventory-transactions / 16-adjustment
- [x] 17-reports-home / 18-report-view
- [x] 19-admin-employees
- [x] 20-settings (language)

All 20 screens exist as `.desktop.d2` + `.mobile.d2` (40 files, 2026-07-08); each file's first line is a comment naming the PRD feature it implements. SVG rendering pending (`d2` not run in this environment).

Each wireframe must reference the PRD feature ID it implements.
