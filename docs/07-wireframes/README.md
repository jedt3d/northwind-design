# Wireframes

Low-fidelity wireframes for **mobile (360px)** and **desktop (1280px)**, produced in Phase 1 Cycle 1.2.

**Format: D2 GUI-frame wireframes.** Each screen is a `.d2` file (rendered to SVG via `d2 file.d2 file.svg`) that draws **one page-shaped frame per file**, mirroring the built app's real chrome — not a flowchart:

- **Desktop** (`*.desktop.d2`): a 2-column grid — sidebar on the left (logo + vertical nav list, active item highlighted dark) and a main column with the topbar on top (app title · language select · user menu), then the screen's content zones stacked vertically (header row, toolbar, table/form/panels, pager/totals).
- **Mobile** (`*.mobile.d2`): a single narrow column — topbar with ☰ hamburger + title + user, then zones stacked vertically; tables collapse to cards. No bottom nav (matches the built app's drawer navigation).
- **No connections/arrows** inside wireframes — a wireframe is a static layout, not a flow. Placement is forced with nested containers using `grid-columns` / `grid-rows` and width/height hints.
- Grayscale sketch level only: fills `#ffffff` / `#f4f4f3` / `#e5e6e8`, strokes `#999`, active nav/primary actions `#1a1a1a` with white text. No real imagery.

D2 sources are the tracked artifacts; rendered SVGs are committed alongside for review. (The flow/structure diagrams in `docs/diagrams/` are a separate concern: they use the ELK layout engine — `vars: {d2-config: {layout-engine: elk}}` — for orthogonal right-angle edges, vertical `direction: down` flow, and the design-system pastel palette.)

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

All 20 screens exist as `.desktop.d2` + `.mobile.d2` (40 files, rebuilt as GUI-frame wireframes 2026-07-08); each file's first line is a comment naming the PRD feature it implements. All 40 SVGs rendered with `d2` v0.7.1 and committed alongside.

Each wireframe must reference the PRD feature ID it implements.
