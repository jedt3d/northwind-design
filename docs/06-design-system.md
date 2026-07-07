# Design System — "Northwind Calm"

> **Audience:** designer + frontend devs · **Status:** outline (Phase 1, Cycle 1.2) · **Owner:** —

Stable, calm, clean. **Light theme only.** Multilingual: Thai, English, Japanese.

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
Component specs for search, sort, table, and master–detail/forms must follow the conventions decided in `reference/lob-ui-patterns.md`.

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
