# Wireframe Verification Gate

> **Status:** PASSED (2026-07-08) · Cross-check of every PRD feature against BRD processes, SRS FRs, wireframes, UX flows, LOB pattern conventions, and workflow states, per the gate defined in `README.md`.

## Cross-check matrix

| PRD feature | BRD process | SRS FRs | Wireframes (desktop+mobile) | UX flow (docs/05) | LOB patterns applied (docs/09) | Workflow states covered | Result |
|---|---|---|---|---|---|---|---|
| F1 Login & language | Objective 3 (multilingual staff) | FR-AUTH-1..3, FR-I18N-1..3 | 01-login, 20-settings | §3.1 login→language→dashboard | Form: single page, explicit submit, inline errors | n/a (auth states: ok / invalid / inactive) | **Pass** |
| F2 Dashboard | 4.3/4.4/4.5 entry points | FR-ORD-1, FR-PO-1, FR-PRD-5 (links) | 02-dashboard | §2 role-composed panels | Cards; recent items replace MRU | Surfaces New/Invoiced orders, Submitted POs, low stock | **Pass** |
| F3 Companies | 4.1 Companies | FR-COM-1..6 | 03-companies-list, 04-company-detail | §3.2 (new-customer modal branch) | Search (name+contact), type filter, sort, 20/page, row→detail, cards+load-more on mobile | Type-in-use disabled, guarded delete (BR-C1/C2) | **Pass** |
| F4 Products & categories | 4.2 Catalog | FR-PRD-1..6 | 05-products-list, 06-product-detail, 07-categories | §2, reorder entry to §3.3 | Search (code+name), category filter, low-stock flag, sort, pagination | Low-stock → Reorder action; discontinued muted/excluded | **Pass** |
| F5 Orders | 4.3 Sales order lifecycle | FR-ORD-1..6 | 08-orders-list, 09-order-create, 10-order-detail | §3.2 create-order flow (D2 diagram) | List conventions; detail = parent+inline line editor; lookup pickers; explicit Save + dirty guard | All of new/invoiced/shipped/closed/cancelled + line statuses incl. No Stock path; disabled Invoice with reason | **Pass** |
| F6 Purchase orders | 4.4 Purchasing lifecycle | FR-PO-1..5 | 11-purchase-orders-list, 12-po-create, 13-po-detail | §3.3 approve & receive flow | Same list/detail conventions; suggested qty prefilled | new/submitted/approved/closed/cancelled; Approve visible to manager/admin only; per-line Receive + posted flag | **Pass** |
| F7 Inventory | 4.5 Inventory transactions | FR-INV-1..4 | 14-inventory-onhand, 15-inventory-transactions, 16-adjustment | §3.4 adjustment flow | Search, type/date filters, read-only ledger table, mobile-first cards | Transaction types purchased/sold/on_hold/waiting shown; negative-result rejection previewed | **Pass** |
| F8 Reports | 4.6 Reporting needs | FR-RPT-1..4 | 17-reports-home, 18-report-view | §3.5 run-a-report flow | Chart+table pairing, date-range default 3 months, empty state defined | Outstanding-PO report keyed to submitted/approved states | **Pass** |
| F9 Admin | §3 stakeholders/roles | FR-EMP-1..3 | 19-admin-employees, 20-settings | §2 (role-gated nav) | List conventions; deactivate-not-delete pattern visible | Active/inactive employee states; role assignment | **Pass** |

Reverse check: all 40 wireframe files map back to a PRD feature via their first-line `# PRD: F<n>` comment — no orphan wireframes. All four docs/09 conventions (per-list search, header/dropdown sort, 20-per-page tables→cards, list→detail with inline lines) appear identically on every list and document screen.

## Findings

The cross-check found no functional gaps: every BRD process has the screens and controls it needs, every SRS FR is reachable from the navigation in the sitemap, and every workflow state (order, order-line, PO) has a visible representation and a legal action path on the wireframes, including the awkward corners — the insufficient-stock loop (order line No Stock → prefilled PO → receive → reallocation feedback toast on 13-po-detail), privilege-gated approval (Approve rendered only for manager/admin), and the immutable ledger (15-inventory-transactions exposes no edit affordances). Two conscious notes rather than defects: (1) rendered SVGs are still pending since `d2` was not available in this environment — sources are the tracked artifact and must be rendered before the `v0.1-design` tag; (2) docs/08-workflows.md is a Phase 2 Cycle 2.1 deliverable, so workflow-state coverage above was verified against the transition tables in docs/04 §5, which docs/08 must later restate as state diagrams. Gate result: **all pass** — proceed to graphic design + tokens (already reflected in docs/06) and Phase 2.

## สรุปภาษาไทย

เอกสารนี้คือด่านตรวจสอบ wireframe: ตารางไขว้ยืนยันว่าฟีเจอร์ PRD ทั้ง F1–F9 ครบทั้งกระบวนการธุรกิจ (BRD), ความต้องการระบบ (SRS), ไฟล์ wireframe เดสก์ท็อป+มือถือทั้ง 40 ไฟล์, โฟลว์ UX, ข้อกำหนดรูปแบบ UI ทั้ง 4 เรื่อง และสถานะของ workflow ทุกตัว ผลคือผ่านทุกแถว ไม่พบช่องว่างเชิงฟังก์ชัน มีเพียงหมายเหตุว่า SVG ยังไม่ได้เรนเดอร์ (ต้องรัน d2 ก่อนติดแท็ก v0.1-design) และ docs/08-workflows.md เป็นงานของเฟส 2 จึงใช้ตารางการเปลี่ยนสถานะใน data dictionary เป็นเกณฑ์แทน
