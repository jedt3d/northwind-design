# UX Design Document

> **Audience:** designer + developers · **Status:** outline (Phase 1, Cycle 1.2) · **Owner:** —

Purpose: how to design the software so it complies with the BA (business rules), SA (system constraints), and PRD (features) — one coherent experience.

**Prerequisite:** `reference/lob-ui-patterns.md` — the researched conventions for search, sorting, data tables, and master–detail/forms are binding for this document.

## 1. Design principles
Stable, calm, clean. Light theme only. Content first, low ornamentation, generous whitespace, no surprise motion.

## 2. Information architecture & navigation
- [ ] Sitemap; primary nav (desktop sidebar / mobile bottom-or-drawer)
- [ ] Per-role landing views (sales vs warehouse vs manager)

## 3. Key user flows (diagram each)
- [ ] Login → language select → dashboard
- [ ] Create sales order (incl. insufficient-stock path → restock prompt)
- [ ] Approve & receive purchase order
- [ ] Inventory adjustment
- [ ] Run/report a report

## 4. Common LOB interaction patterns (from reference/lob-ui-patterns.md)
- [ ] Search: chosen convention applied per module list
- [ ] Sorting: chosen convention (headers on desktop, control on mobile)
- [ ] Data tables: pagination, density, mobile card transformation
- [ ] Master–detail & forms: layout per device, line-item editing (orders/POs), lookup pickers

## 5. Screen states
- [ ] Every screen: loading / empty / error / success states defined
- [ ] Form validation UX: inline, on blur; server-side errors mapped to fields

## 6. Compliance mapping
- [ ] Table: BRD rule → where UX enforces it (e.g., status transition buttons only when legal)
- [ ] Table: SRS NFR → UX decision (e.g., 360px layouts, AA contrast)

## 7. i18n UX
- [ ] Language switcher placement; persisted per user
- [ ] Text expansion tolerance (th/ja line heights, longer labels)
- [ ] Locale formats: dates (Buddhist calendar display optional for th?), currency, numbers

## 8. Accessibility
- [ ] Keyboard navigation, focus order, form labels, contrast per design system

## สรุปภาษาไทย
*(เพิ่มบทสรุปเมื่อเนื้อหาเสร็จ)*
