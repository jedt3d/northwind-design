# Design System — "Northwind Calm"

> **Audience:** designer + frontend devs · **Status:** outline (Phase 1, Cycle 1.2) · **Owner:** —

Stable, calm, clean. **Light theme only.** Multilingual: Thai, English, Japanese.

## 0. Style reference (analyzed 2026-07-08)

Source: user-provided UI-preview video; 12 extracted frames in `design/screenshots/`, with the full structured definition (frame index, layout anatomy, color/type/component/motion definitions) in `design/screenshots/README.md`. **Scope: visual style only** — workflows, LOB interaction patterns, and UX structure follow `docs/09-lob-ui-patterns.md` and `docs/05-ux-design.md`, not this video.

Observed style to carry into our tokens and components:

- **Light, calm, neutral base** — near-white content surface presented as one elevated sheet on a soft gray canvas; hierarchy from spacing and type weight, not boxes
- **Monochrome-first chrome** — near-black text, thin hairline dividers, almost no borders; selected states are dark or soft-gray pills rather than bright accent colors
- **Color reserved for data/status** — soft pastel fills (blue/red/yellow/green/pink/purple) only on data labels, legend dots, and badges; ideal model for our order/PO status badges (verify WCAG AA on our palette)
- **Typography** — one grotesque sans; large bold page titles; small quiet labels; numbers dominate; green/red delta badges next to KPI figures
- **Density** — generous whitespace with tall rows and small type: calm but information-rich
- **Page header pattern** — big title left, actions right (filter/save/date-range) — consistent on every screen
- **KPI presentation** — current value + period deltas (30/60/180/360 days) as a quiet right rail; reusable for our Dashboard/Reports
- **Chart + data table pairing** — every chart backed by its numbers in a table (right-aligned currency, negatives with minus, hairline separators, quiet headers)
- **Motion** — subtle fades/slides on state change only; no decorative animation

## 1. Design tokens (to finalize)
- [ ] Color: neutral background scale, one calm primary (proposal: muted blue-green), semantic colors (success/warn/danger/info), AA-checked
- [ ] Spacing: 4px base scale
- [ ] Radius, elevation (subtle, at most 2 shadow levels)
- [ ] Tokens shipped as CSS custom properties (`design/tokens.css`)

## 2. Typography
- [ ] Font stacks with coverage for all 3 scripts, e.g. `"Noto Sans", "Noto Sans Thai", "Noto Sans JP", sans-serif` (Google Fonts — log in asset.md)
- [ ] Type scale + line-height rules per script (Thai/JP need taller line height)
- [ ] Number/currency/date formatting conventions per locale

## 3. Components (spec + states each)
Component specs for search, sort, table, and master–detail/forms must follow the conventions decided in `docs/09-lob-ui-patterns.md`.

- [ ] Buttons (primary/secondary/ghost/danger), inputs, select, date picker
- [ ] **Search field** (list-level filter; mobile expanding variant)
- [ ] **Sortable table header** (sort indicator + cycle behavior) / mobile sort control
- [ ] **Data table** (density, alignment, pagination, row actions) ↔ card list (mobile) pattern
- [ ] **Master–detail layout** (desktop split / mobile stacked) and **line-item editor** (order/PO lines)
- [ ] **Lookup picker** (company/product reference selector)
- [ ] Status badge (order/PO statuses with fixed colors)
- [ ] Form layout, modal/confirm, toast, empty state, page header, nav (sidebar + mobile)

## 4. Layout & breakpoints
- [ ] 360 / 768 / 1024 / 1440; content max-width; density rules

## 5. Implementation rules
- [ ] Plain CSS only (custom properties + a small `components.css`); no CSS framework
- [ ] Class naming convention (proposal: simple BEM-lite)

## สรุปภาษาไทย
*(เพิ่มบทสรุปเมื่อเนื้อหาเสร็จ)*
