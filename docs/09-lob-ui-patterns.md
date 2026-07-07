# Line-of-Business UI Patterns — Research

> **Status:** concluded (Phase 1 Cycle 1.2, 2026-07-08). Findings here feed docs/05-ux-design.md, docs/06-design-system.md, and docs/07-wireframes/. The four Decision lines below are **binding conventions** for every module.

Purpose: study how mature LOB applications solve the four patterns below, then pick one convention per pattern and apply it consistently across all modules.

## 1. Search
- [x] Global search vs per-list search — global search is a power feature for huge suites (Salesforce, SAP launchpad); for a 7-module app, per-list search is simpler and always in context. NN/g notes users expect search scoped to what they see.
- [x] Instant filter vs submit — SAP Fiori list reports and Lightning list views both filter live; instant with debounce avoids a useless "Search" button for small result sets served by PocketBase's paged API.
- [x] Searching across relations — order lists are searched by customer name far more often than by number; PB filters can traverse relations (`customer.company_name ~ "x"`).
- [x] Mobile pattern — expanding icon-only search hides the affordance; Fluent and Carbon keep a visible field on list toolbars.
- **Decision:** **per-list instant filter** — one search field on every list toolbar, filters as you type with a **300 ms debounce**, matching the module's key fields **plus related names** (orders: order_number + customer name; POs: po_number + supplier name; products: code + name; companies: name + contact). On mobile the same field renders full-width above the list (no icon-collapse). No global search in v1.

## 2. Sorting
- [x] Column-header sorting — every reference system (Fiori, Lightning, Fluent DataGrid, Carbon) uses clickable headers with an arrow indicator; multi-column sort is consistently hidden away as an advanced feature → skip it.
- [x] Cycle order — Lightning/Carbon cycle asc → desc on repeated clicks; a third "none" state confuses more than it helps → two-state cycle, clicking another column resets.
- [x] Mobile — headers don't exist on card lists; Fiori and mobile commerce converge on a sort dropdown/sheet above the list.
- [x] Defaults per module — orders & POs: newest first (order_date/created desc); products & companies & categories: name A–Z; inventory transactions: date desc; employees: name A–Z.
- [x] Persistence — session-level only (kept in component state per visit); persisting sort per user is not worth schema/profile weight in v1.
- **Decision:** **single-column header sort**, indicator arrow on the active column, click cycles **asc ↔ desc**; on mobile a **sort dropdown** in the list toolbar exposes the same options; defaults as listed above; choice persists for the session only.

## 3. Data tables (listing database records)
- [x] Column selection — a column must earn its place: identifier, the 2–4 fields users scan to choose a row, status, and one date/amount; everything else is detail-only. (Fiori's "smart table" guidance; NN/g data-table heuristics.)
- [x] Pagination — PocketBase's API is paged; classic numbered pagination beats infinite scroll for record-keeping tasks (NN/g: users need a sense of place and reachable footers). 20/page matches our density.
- [x] Alignment/density — numbers right-aligned, text left, dates uniform per locale; single-line rows, generous row height per design-system density (docs/06).
- [x] Mobile transformation — below 768 px tables become card lists (title line + 2-3 key values + status badge); pagination becomes a **Load more** button (Carbon/Fiori mobile pattern) since page numbers are clumsy on cards.
- [x] Filters — one or two dropdown filters per list (status, type, category) sitting beside search; filters, search, and sort combine as AND. No faceted chip builder in v1.
- [x] Empty/loading/error — every list defines all three states (docs/05 §5): skeleton rows while loading, illustrated empty state with primary action, inline error with retry.
- **Decision:** **paginated tables, 20 rows/page** (numbered pager on desktop, **Load more on mobile card lists**); numbers right-aligned; **entire row clickable → detail page**; per-list dropdown filters that combine (AND) with search and sort; standard loading/empty/error states everywhere.

## 4. Master–detail & form patterns
- [x] Layouts — side-panel master-detail (Outlook style) suits triage workloads; document-centric LOB work (orders, POs) is better served by full detail pages with their own URL (Lightning record pages, Fiori object pages). Simpler responsive behavior too: one layout for desktop and mobile.
- [x] Parent + child lines — Fiori object page and Lightning record page both show header fields + line-item table on one page; a separate "line editor screen" adds navigation cost. Inline line editing wins while the document is editable.
- [x] Single page vs wizard — order creation has only two steps' worth of data (header + lines); wizards pay off at 4+ steps (NN/g). Single page with a lines section it is.
- [x] Save model — LOB users expect explicit Save (Fiori's draft-handling exists precisely because autosave surprises people); dirty-state guard on navigation is mandatory.
- [x] Lookup pickers — all reference systems use a searchable select (combobox) for FK fields; create-on-the-fly is needed exactly once in our flows (new customer mid-order) and opens as a modal that returns the created record.
- **Decision:** **list page → full detail page** (no side panel); parent fields and line items live on **one detail page with an inline line editor** (add/edit/remove rows while status permits); forms are **single-page with explicit Save/Cancel** and an **unsaved-changes guard**; all FK fields use a **searchable-select lookup picker**, with "＋ New customer" inside the order form's customer picker (modal, returns selection).

> Note: the UI-preview video frames in `design/screenshots/` are a **visual style** reference for the design system (docs/06 §0) only. The pattern decisions above were made from the research sources in this document, not from that video.

## Sources studied (finding per source)
- [x] **SAP Fiori** (list report & object page floorplans) — toolbar search + filters above a paginated table; object page = header + item table on one page; explicit draft/save handling.
- [x] **Salesforce Lightning** (list views, record pages) — live-filtered list views, single-column header sort with arrow, record page = detail + related lists; searchable comboboxes for lookups with inline "New" record creation.
- [x] **Microsoft Fluent 2** (DataGrid, Field) — header sort cycling asc/desc, right-aligned numerics, visible search fields in toolbars, explicit form validation on blur/submit.
- [x] **IBM Carbon** (data table, pagination) — 20–25 rows/page defaults, skeleton loading states, mobile "load more", empty-state guidance with a primary action.
- [x] **Atlassian design system** — inline editing reserved for single fields, full pages for documents; unsaved-changes warnings on navigation.
- [x] **Nielsen Norman Group** (data tables, search, forms, wizards) — pagination over infinite scroll for task-based work; scoped search expectations; wizards only for long multi-step processes; inline validation on blur.
- [x] Comparable products (modern ERP/ordering web apps, e.g. Odoo/ERPNext patterns) — confirm the list → document-page model with inline line grids and status-button workflows as the LOB default.

## Output
The four Decision lines above are the conventions; they are referenced by the UX doc (docs/05 §4), the design-system component specs (docs/06 §3), and every wireframe in docs/07-wireframes/.

## สรุปภาษาไทย

งานวิจัยรูปแบบ UI สำหรับซอฟต์แวร์ธุรกิจสรุปเป็นข้อกำหนด 4 เรื่องที่ใช้เหมือนกันทุกโมดูล: (1) ค้นหาแบบกรองทันทีต่อหน้ารายการ หน่วง 300ms ค้นทั้งฟิลด์หลักและชื่อที่เกี่ยวข้อง (2) เรียงลำดับด้วยหัวคอลัมน์ทีละคอลัมน์ สลับ asc/desc ส่วนมือถือใช้ dropdown (3) ตารางแบ่งหน้า 20 แถว มือถือเป็นการ์ดพร้อมปุ่มโหลดเพิ่ม ตัวเลขชิดขวา คลิกแถวเปิดหน้ารายละเอียด (4) โครงสร้าง master–detail แบบหน้ารายการ → หน้ารายละเอียดเต็ม แก้ไขรายการย่อยในหน้าเดียว ฟอร์มบันทึกด้วยปุ่ม Save ชัดเจน มีตัวเตือนงานค้าง และใช้ตัวเลือกแบบค้นหาได้สำหรับฟิลด์อ้างอิง โดยอ้างอิงแนวทางจาก SAP Fiori, Salesforce Lightning, Fluent, Carbon และ NN/g
