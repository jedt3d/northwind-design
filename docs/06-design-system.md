# Design System — "Northwind Calm"

> **Audience:** designer + frontend devs · **Status:** complete (Phase 1, Cycle 1.2) · **Owner:** —

Stable, calm, clean. **Light theme only.** Multilingual: Thai, English, Japanese. All tokens ship as CSS custom properties in `design/tokens.css`.

## 0. Style reference (analyzed 2026-07-08)

Source: user-provided UI-preview video; 12 extracted frames in `design/screenshots/`, with the full structured definition (frame index, layout anatomy, color/type/component/motion definitions) in `design/screenshots/README.md`. **Scope: visual style only** — workflows, LOB interaction patterns, and UX structure follow `docs/09-lob-ui-patterns.md` and `docs/05-ux-design.md`, not this video.

Observed style carried into our tokens and components:

- **Light, calm, neutral base** — near-white content surface presented as one elevated sheet on a soft gray canvas; hierarchy from spacing and type weight, not boxes
- **Monochrome-first chrome** — near-black text, thin hairline dividers, almost no borders; selected states are dark or soft-gray pills rather than bright accent colors
- **Color reserved for data/status** — soft pastel fills only on data labels and badges; adopted for our order/PO status badges with **text darkened to pass WCAG AA** (§1)
- **Typography** — one grotesque sans; large bold page titles; small quiet labels; numbers dominate
- **Density** — generous whitespace with tall rows and small type: calm but information-rich
- **Page header pattern** — big title left, actions right — consistent on every screen
- **Chart + data table pairing** — every chart backed by its numbers in a table
- **Motion** — subtle fades on state change only; no decorative animation

## 1. Design tokens

Full machine-readable set: `design/tokens.css`. Values below are the canonical tables.

### 1.1 Neutrals & chrome

| Token | Value | Usage |
|---|---|---|
| `--color-canvas` | `#E5E6E8` | page background |
| `--color-surface` | `#FBFBFA` | main elevated sheet, cards, modals |
| `--color-surface-2` | `#F4F4F3` | pills, inactive chips, table stripe, skeletons |
| `--color-border-hairline` | `#E3E3E1` | row separators, input borders |
| `--color-text-primary` | `#111111` | headings, values, body |
| `--color-text-secondary` | `#6B6B69` | labels, captions (darkened from observed `#8A8A88` → 5.6:1 on surface, AA) |
| `--color-text-disabled` | `#9C9C9A` | disabled text (paired with disabled state, not for reading) |
| `--color-selected-dark` | `#1A1A1A` | active segment/chip, tooltip bg, primary button |
| `--color-on-dark` | `#FFFFFF` | text/icons on dark fills |
| `--color-focus-ring` | `#1D4E7A` | 2px focus outline |

### 1.2 Semantic

| Token | Value | Usage |
|---|---|---|
| `--color-positive` / `-bg` | `#157A43` / `#C9F0DC` | success text/badge (green darkened from `#1FA55A` for AA) |
| `--color-warning` / `-bg` | `#7A5B00` / `#FAE8B8` | warnings, low-stock flags |
| `--color-danger` / `-bg` | `#A4302A` / `#F9D2CE` | destructive, errors, no-stock |
| `--color-info` / `-bg` | `#1D4E7A` / `#CFE5F7` | informational |

### 1.3 Data/status pastel pairs (fill + AA text)

Fills are the observed pastels; each is paired with a darkened text color of the same hue, ≥ 4.5:1 on its fill:

| Pair | Fill | Text |
|---|---|---|
| blue | `#CFE5F7` | `#1D4E7A` |
| red | `#F9D2CE` | `#A4302A` |
| yellow | `#FAE8B8` | `#7A5B00` |
| green | `#C9F0DC` | `#157A43` |
| pink | `#F9D3EF` | `#94317C` |
| purple | `#E3D9F6` | `#5B3FA8` |
| gray | `#ECECEA` | `#55554F` |

### 1.4 Spacing, radius, elevation

- Spacing, 4px base: `--space-1..8` = 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64.
- Radius: `--radius-sm 6` (badges) / `--radius-md 8` (inputs, buttons) / `--radius-lg 12` (cards, modals) / `--radius-xl 16` (content sheet).
- Elevation, exactly two levels: `--shadow-sheet` (content sheet) and `--shadow-overlay` (modals, dropdowns, toasts). Nothing else casts shadow.

## 2. Typography

**Rule: all fonts come from Google Fonts** (logged in `asset.md`):
- Latin: **Inter** — https://fonts.google.com/specimen/Inter
- Thai: **Noto Sans Thai** — https://fonts.google.com/noto/specimen/Noto+Sans+Thai
- Japanese: **Noto Sans JP** — https://fonts.google.com/noto/specimen/Noto+Sans+JP

Stack: `"Inter", "Noto Sans Thai", "Noto Sans JP", sans-serif` (`--font-family-base`). Weights loaded: 400, 500, 700 for each family.

**Type scale** (tokens `--font-size-*`):

| Size | Weight | Usage |
|---|---|---|
| 28 | 700 | H1 page title |
| 20 | 700 | H2 section title ("Chart data", card headers) |
| 16 | 500 | emphasized body, KPI captions, card titles |
| 14 | 400 | body text, inputs, form labels |
| 13 | 400 | table body, nav items, secondary labels |
| 11 | 400/500 | axis, dates, badges, deltas |

Line-height: 1.5 for en/ja (`--line-height-latin`), **1.6 when the document language is Thai** (`--line-height-thai`; Thai stacked vowels/tone marks clip at 1.5). Set via `:lang(th)`. Tables always use `font-variant-numeric: tabular-nums`.

Number/currency/date conventions: format via `Intl` with the active locale; currency symbol per locale, negatives with a minus sign (never red-only); dates Gregorian in all locales (docs/05 §7), short format in tables, long in details.

## 3. Components

Search, sort, table, and master–detail specs implement the conventions of `docs/09-lob-ui-patterns.md`. All states: default / hover / focus (ring token) / active / disabled, plus per-component states below.

- **Buttons** — primary (dark fill `--color-selected-dark`, white text), secondary (surface-2 fill, primary text), ghost (transparent, hairline on hover), danger (danger color fill). Height 36px desktop / 44px mobile, radius-md, padding 0 `--space-4`, font 14/500. Disabled: 40% opacity + reason tooltip when it encodes a business rule.
- **Inputs / select / date picker** — 36/44px height, radius-md, hairline border, surface bg; focus ring; error state: danger border + 13px danger text below; label 13px secondary above, required mark `*`.
- **Search field** — the per-list filter: input with leading search icon and clear (×) button, placeholder names the searched fields ("Search order no. or customer…"); debounce 300 ms; desktop width 280px in the list toolbar, mobile full-width row above the list. Never icon-collapsed.
- **Sortable table header** — 13px/500 secondary text; active column shows ▲/▼ and primary text color; click cycles asc ↔ desc; full header cell is the hit target; `aria-sort` set. **Mobile sort control:** dropdown in the toolbar listing the same columns with direction toggle.
- **Data table** — row height `--table-row-height` 44px, hairline row separators, no vertical rules; numbers right-aligned tabular; text left; status badges in their own column; whole row clickable (hover: surface-2) with visible focus for keyboard; pagination footer "1–20 of 143" + pager, 20/page. **Card list (mobile <768):** each row becomes a card — line 1: identifier + badge; line 2: 2–3 key values 13px secondary; Load more button instead of pager.
- **Master–detail layout** — list page → full detail page. Detail page: page header (back link, H1 = document number/name, status badge, action buttons right), two-column field grid ≥1024 (one column below), then the line-items section. Never a side panel.
- **Line-item editor** — inline table inside order/PO detail: editable rows (product picker, qty, price/cost, computed line total, per-line status badge) while the document permits editing; "+ Add line" row at the bottom; delete per row; rows render read-only once frozen (BR-O4). Mobile: lines as editable cards.
- **Lookup picker** — searchable select for relations (customer, supplier, shipper, product, category): input opens a filtered dropdown (same 300 ms debounce), keyboard navigable, shows secondary text (e.g., product code) under the primary label; optional footer action "＋ New customer" opening the create modal (order flow only).
- **Status badges** — pill, radius-sm, 11px/500 text, `--space-1`/`--space-2` padding, pastel fill + darkened text pairs. Exact assignments (tokens in tokens.css):

| Domain | Status | Fill | Text |
|---|---|---|---|
| Order | new | `#CFE5F7` | `#1D4E7A` |
| Order | invoiced | `#FAE8B8` | `#7A5B00` |
| Order | shipped | `#E3D9F6` | `#5B3FA8` |
| Order | closed | `#C9F0DC` | `#157A43` |
| Order | cancelled | `#ECECEA` | `#55554F` |
| PO | new | `#ECECEA` | `#55554F` |
| PO | submitted | `#CFE5F7` | `#1D4E7A` |
| PO | approved | `#FAE8B8` | `#7A5B00` |
| PO | closed | `#C9F0DC` | `#157A43` |
| PO | cancelled | `#F9D2CE` | `#A4302A` |
| Line | none | `#ECECEA` | `#55554F` |
| Line | allocated | `#C9F0DC` | `#157A43` |
| Line | on_order | `#CFE5F7` | `#1D4E7A` |
| Line | no_stock | `#F9D2CE` | `#A4302A` |
| Line | invoiced | `#FAE8B8` | `#7A5B00` |
| Line | shipped | `#E3D9F6` | `#5B3FA8` |

- **Form layout** — single-page forms (docs/09 §4): 13px labels above fields, `--space-4` field gap, `--space-6` section gap, sticky footer bar with Save (primary) + Cancel (ghost) and the unsaved-changes guard.
- **Modal / confirm** — surface, radius-lg, shadow-overlay, max-width 480px (forms 640px); title 20px, body 14px; confirm dialogs state consequences; Esc/backdrop close (guarded when dirty).
- **Toast** — bottom center mobile / bottom right desktop; dark fill, white 13px text; 4 s auto-dismiss; `aria-live=polite`.
- **Empty state** — centered icon (secondary color), 16px title, 13px secondary line, optional primary action.
- **Page header** — H1 left; actions right (buttons/filters); consistent on every screen (video pattern).
- **Nav** — desktop sidebar 220px: 13px items, selected = soft gray pill (surface-2) + 500 weight; groups separated by hairlines. Mobile bottom nav 56px: 5 slots, icon + 11px label, active = primary text.
- **KPI block / delta badge** (dashboard, reports) — 12px secondary caption, 22px/700 value, delta as small badge (positive/danger pair).
- **Skeleton** — surface-2 blocks with a subtle pulse; row-shaped in lists.

## 4. Layout & breakpoints
- Breakpoints: **360** (baseline mobile) / **768** (tables appear, two-pane forms) / **1024** (sidebar replaces bottom nav) / **1440** (max density). Content max-width 1200px, centered as the elevated sheet (radius-xl) on the canvas; mobile: sheet is edge-to-edge.
- Density: one density only — 44px rows/controls; whitespace does the layering (no compact mode in v1).
- Touch targets ≥ 44px on mobile; desktop click targets ≥ 32px.

## 5. Implementation rules
- Plain CSS only: `design/tokens.css` (custom properties, `:root`, light theme only) + a small `components.css`; no CSS framework, no preprocessor.
- **BEM-lite** class naming: `.block`, `.block-element`, `.block-element--modifier` (single-dash element, double-dash modifier); component names match this doc (`.data-table`, `.status-badge--order-new`, `.lookup-picker`).
- Never hard-code a color, size, or font — every value goes through a token; new tokens require a design-system PR touching this doc and tokens.css together.
- Status badge classes are generated from the enum values so doc, tokens, and code stay aligned.
- Motion: `--motion-fast/base` fades only; respect `prefers-reduced-motion`.

## สรุปภาษาไทย

ระบบดีไซน์ "Northwind Calm" ใช้ธีมสว่างเท่านั้น โทนสีหลักเป็นกลาง (แผ่นเนื้อหาเกือบขาวบนพื้นเทาอ่อน) สีพาสเทลสงวนไว้สำหรับป้ายสถานะโดยจับคู่พื้นอ่อนกับตัวอักษรเฉดเข้มที่ผ่าน WCAG AA ครบทุกสถานะของใบสั่งขาย ใบสั่งซื้อ และรายการย่อย ฟอนต์ทั้งหมดมาจาก Google Fonts (Inter + Noto Sans Thai + Noto Sans JP) สเกลตัวอักษร 11/13/14/16/20/28 ระยะห่างฐาน 4px มุมโค้ง 6/8/12/16 เบรกพอยต์ 360/768/1024/1440 พร้อมสเปกคอมโพเนนต์ครบ (ช่องค้นหา หัวตารางเรียงได้ ตาราง/การ์ด line-item editor, lookup picker ฯลฯ) โทเคนทั้งหมดถูกเขียนเป็น CSS custom properties ใน `design/tokens.css` และบังคับเขียน CSS ล้วนแบบ BEM-lite
