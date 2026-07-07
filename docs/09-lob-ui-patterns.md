# Line-of-Business UI Patterns — Research

> **Status:** to be researched in Phase 1 Cycle 1.2, **before** wireframing and design-system work. Findings here feed docs/05-ux-design.md, docs/06-design-system.md, and docs/07-wireframes/.

Purpose: study how mature LOB applications solve the four patterns below, then pick one convention per pattern and apply it consistently across all modules.

## 1. Search
- [ ] Global search vs per-list search; placement and keyboard shortcut
- [ ] Instant filter-as-you-type vs submit search; debounce behavior
- [ ] Searching across relations (e.g., order search by customer name)
- [ ] Mobile search pattern (expanding field vs dedicated screen)
- [ ] Decision: __

## 2. Sorting
- [ ] Column-header sorting (indicator, multi-column? cycle order asc → desc → none)
- [ ] Sort control on mobile card lists (dropdown/sheet)
- [ ] Default sort per module (e.g., orders newest first, products A–Z)
- [ ] Persistence of user's sort choice
- [ ] Decision: __

## 3. Data tables (listing database records)
- [ ] Column selection: what earns a column vs detail-only field
- [ ] Pagination vs infinite scroll vs load-more (with PocketBase paged API)
- [ ] Row density, alignment rules (numbers right, text left), row actions
- [ ] Table → card-list transformation on mobile breakpoints
- [ ] Filters (faceted chips vs filter panel) and how they combine with search + sort
- [ ] Empty/loading/error states for lists
- [ ] Decision: __

## 4. Master–detail & form patterns
- [ ] Master–detail layouts: list + side panel (desktop) vs list → push screen (mobile)
- [ ] Detail-page pattern for parent + child lines (Order → order details, PO → PO lines)
- [ ] Form patterns: single-page vs wizard (order creation), inline edit vs edit mode
- [ ] Validation display, dirty-state/unsaved-changes handling, autosave vs explicit save
- [ ] Lookup/reference-picker pattern (choose company, product) incl. create-on-the-fly
- [ ] Decision: __

> Note: the UI-preview video frames in `design/screenshots/` are a **visual style** reference for the design system (docs/06 §0) only. The pattern decisions below (search, sorting, tables, master–detail/forms) are made from the research sources in this document, not from that video.

## Sources to study (log findings per source)
- [ ] Established design systems with LOB focus: SAP Fiori, Salesforce Lightning, Microsoft Fluent, IBM Carbon, Atlassian
- [ ] Pattern references: Nielsen Norman Group articles (tables, search, forms), UI Patterns
- [ ] Comparable products: any modern ERP/ordering web apps for concrete master-detail examples

## Output
A short "conventions" section per pattern (the four Decision lines above), referenced by the UX doc §5, the design-system component specs, and every wireframe.

## สรุปภาษาไทย
ก่อนออกแบบ wireframe และ design system ต้องศึกษารูปแบบ UI มาตรฐานของซอฟต์แวร์ธุรกิจ 4 เรื่อง: การค้นหา การเรียงลำดับ ตารางแสดงข้อมูล และรูปแบบ master–detail / ฟอร์ม แล้วสรุปเป็นข้อกำหนดกลางที่ใช้เหมือนกันทุกโมดูล
