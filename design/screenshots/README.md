# UI Style Reference — Frame Definitions

Source: user-provided UI-preview video (`design/01bc0d4cec5f3f4c383ce834605de613.mp4`), 7.8 s, 3200×2400 @30fps, 12 frames extracted at 1.5 fps (2026-07-08).

**Role of this document:** structured definition of everything observed in the frames. It is the *style input* for the graphic interface design and `docs/06-design-system.md`. Workflows, LOB UI patterns, and UX structure are governed by `docs/09-lob-ui-patterns.md` and `docs/05-ux-design.md` — not by this reference.

The video shows one report screen ("Monthly Recurring Revenue") transitioning between **two design generations**:

- **Gen A (frames 02–03):** the older, denser product UI — dark navy icon rail + white secondary nav column, blue accent (#3B6BD6-ish), chip-style toggles (CHARTS/MAPS/COHORTS), boxed cards.
- **Gen B (frames 01, 04–12):** the modernized UI — single light surface, monochrome chrome, top text nav, pastel data labels. **Gen B is our style target.**

## 1. Frame index

| Frame | State captured |
|---|---|
| 01 | Gen B with right-side overlay panel sliding in (weekly view, mini table) |
| 02 | Gen A: two-level sidebar (icon rail collapsed off-canvas), flat line chart (empty/zero data), KPI strip, dense Chart Data table with info-icon row labels |
| 03 | Gen A complete: dark navy icon rail (Dashboards/Reports/Benchmarks/Customers/Opportunities/Tasks; Onboarding/Trial/Search/Targets/Notifications/Profile bottom group), active item = solid blue block |
| 04 | Transition: Gen B left half + Gen A right half (morph mid-point) |
| 05 | Gen B, chart labels animating in (partial pastel blocks) |
| 06 | Gen B complete + hover tooltip on chart (dark tooltip: date, High/Low values) |
| 07 | Gen B with cursor on time-segment control, tooltip visible |
| 08 | Gen B, Year (Y) granularity selected — x-axis re-scaled to 2021–2025 |
| 09 | Gen B, Y-selected variant with reshuffled label positions |
| 10 | Gen B zoomed/cropped page-scroll state (header sheet elevated) |
| 11 | Gen B, M selected, labels settled, negative table row visible |
| 12 | Gen B final resting state (canonical reference frame) |

## 2. Layout anatomy (Gen B — target)

Zones, desktop 1280+:

1. **Canvas**: soft gray page background; content presented as one elevated near-white sheet (large radius ~16px, no visible border)
2. **Top bar** (inside sheet): brand wordmark left · text nav center (Dashboards, Reports, Benchmarks, Opportunities, Tasks, Customers; active = bold) · utility cluster right (search, bell, gear icons + 32px avatar)
3. **Left sidebar** (~180px): segmented toggle (Charts | Maps) → tab pair (Default | Saved, active = black underline) → nav list in two hairline-separated groups; selected item = soft gray pill
4. **Main column**: page header (H1 + actions row: filter icon, save icon, calendar date-range dropdown) · chart toolbar (icon buttons; active = black chip; right side D/W/M/Y/All segmented control) · chart area · legend dots row
5. **Right KPI rail** (~110px): "Current MRR" + big number; below, hairline-separated blocks: 30/60/180/360 days ago, each value + green delta badge (+4.2%…)
6. **Data section**: "Chart data" H2 + table controls right (export icon, "All MRR Movements" dropdown) · data table

## 3. Color definitions (Gen B, approximate)

| Token candidate | Observed | Usage |
|---|---|---|
| canvas | #E5E6E8 gray | page background |
| surface | #FBFBFA near-white | main sheet |
| surface-2 | #F4F4F3 | pills, inactive chips, table stripe |
| text-primary | #111 near-black | headings, values |
| text-secondary | #8A8A88 gray | labels, axis, dates |
| selected-dark | #1A1A1A | active chip/segment, tooltip bg |
| positive | green ~#1FA55A | delta badges |
| data-blue | pastel #CFE5F7 | "New subscriptions" label |
| data-red | pastel #F9D2CE | "Churn" |
| data-yellow | pastel #FAE8B8 | "Expansions" |
| data-green | pastel #C9F0DC | "Reactivations" |
| data-pink | pastel #F9D3EF | "Trial-to-paid" |
| data-purple | pastel #E3D9F6 | "Seasonal" |

Rules observed: chrome is strictly grayscale; chromatic color appears **only** on data labels, legend dots, and delta badges. No shadows except the sheet elevation and tooltip.

## 4. Typography definitions

- One grotesque sans family throughout (Inter-like)
- H1 page title ~28px bold; H2 section ("Chart data") ~20px bold
- Nav/labels ~13px regular; axis/dates ~11px gray
- KPI big number ~22px bold; delta badge ~11px green
- Table: 13px; numbers right-aligned, negatives with minus sign (no red)

## 5. Component inventory (definitions for design-system specs)

| Component | Definition from frames |
|---|---|
| Segmented toggle | 2 options in rounded container; active = dark pill w/ white text (Charts/Maps) |
| Tab pair | text + 2px black underline for active (Default/Saved) |
| Nav list item | 13px text; selected = full-width soft gray pill; grouped with hairlines |
| Icon button | 28px square, gray icon; active = black chip w/ white icon |
| Time segment control | D W M Y All; active = dark chip; hover = gray circle behind cursor |
| Date-range dropdown | calendar icon + "2024–2025" + chevron, hairline border, radius ~8px |
| Data label (chart) | pastel fill, radius ~6px, 12px dark text, no border |
| Legend | 6px color dot + 12px label, single row |
| KPI block | gray caption ~12px → bold value ~22px → green delta; hairline between blocks |
| Tooltip | near-black rounded box, white 12px text, key–value rows (High/Low) |
| Data table | date column headers; hairline row separators; subtle alternating emphasis rows; per-table filter dropdown + export icon |
| Overlay panel (frame 01) | slides from right, same surface color, own granularity control + mini table |

## 6. Motion definitions

- State transitions: crossfade + short horizontal slide (~200–300ms feel)
- Chart labels: staggered fade/scale-in
- Overlay panel: slide-in from right
- No looping or decorative animation; motion communicates state change only

## 7. Application boundaries

| Concern | Governed by |
|---|---|
| Colors, type, spacing, component visuals, motion | this document → `docs/06-design-system.md` |
| Which screens exist, navigation structure | `docs/05-ux-design.md` (from research) |
| Search / sorting / tables / master–detail behavior | `docs/09-lob-ui-patterns.md` (from research) |
| Business workflows & validation | `docs/08-workflows.md` + BRD/SRS |

Gen A (frames 02–03) is retained only as a contrast example of what we are **not** building (dense two-level nav, saturated accent chrome).

## สรุปภาษาไทย

เอกสารนี้นิยามสไตล์ภาพจากวิดีโอตัวอย่าง UI (12 เฟรม): โครงเลย์เอาต์ โทนสี ตัวอักษร คอมโพเนนต์ และการเคลื่อนไหว ใช้เป็น "แหล่งอ้างอิงด้านกราฟิก" ของ design system เท่านั้น ส่วนโครงสร้าง UX, รูปแบบ UI ของงานธุรกิจ (ค้นหา/เรียง/ตาราง/master–detail) และ workflow ให้ยึดตามเอกสารวิจัยของโปรเจกต์
