# System Requirements Specification (SRS)

> **Audience:** System Analyst · **Status:** complete (Phase 1, Cycle 1.1) · **Owner:** —

## 1. System overview
Single-server web application: PocketBase (SQLite) backend exposing a REST API plus server-side JS hooks; a React SPA frontend built with Vite and plain CSS; Nginx terminates TLS and serves both. There are no other runtime services — no external queue, cache, or database. The system serves three UI languages (th/en/ja) from one shared dataset.

## 2. Architecture

The browser talks HTTPS to Nginx at `https://northwind.raawww.com`. Nginx serves the built SPA as static files and reverse-proxies `/api/*` (and PocketBase's admin path) to the PocketBase process running as a systemd service. Inside PocketBase, every request passes the collection **API rules** (declarative authorization, layer 1); mutating requests then run through **pb_hooks** (business-rule validation and side effects such as writing inventory transactions, layer 2) before reaching SQLite. Uploaded images are stored by PocketBase on disk and served back through the same API with thumbnail support. A nightly cron copies `pb_data` for backup.

Data flows:
- **Auth:** SPA posts credentials → PocketBase issues a token → SPA stores it and sends it on every request; roles come from the linked `employees` record.
- **CRUD:** SPA → Nginx → PocketBase API → rules → hooks → SQLite; responses may expand relations (e.g., order + customer name) in one round trip.
- **Files:** upload as multipart on the record; served as `/api/files/...` URLs with on-the-fly thumbs for lists.

D2 source: `docs/diagrams/architecture.d2` (embedded below).

```d2
# Northwind web app — component architecture (SRS docs/02 §2)
direction: right

user: {
  label: "User\n(browser, th/en/ja)"
}

vps: {
  label: "DigitalOcean VPS (Ubuntu 24.04)"

  nginx: {
    label: "Nginx\nTLS (Let's Encrypt)\nreverse proxy"
  }

  spa: {
    label: "React SPA (static files)\nVite build + plain CSS\ni18n th/en/ja"
  }

  pocketbase: {
    label: "PocketBase (systemd)"

    api: "REST API + realtime"
    auth: "Auth (email/password)"
    rules: "Collection API rules\n(authorization layer 1)"
    hooks: "pb_hooks JS\nbusiness rules (layer 2)"
    files: "File storage\n(product/category images)"
    db: "SQLite (pb_data)"

    api -> rules: "every request"
    rules -> hooks: "create/update/delete"
    hooks -> db: "validated writes"
    api -> auth
    api -> files
  }

  backup: {
    label: "Nightly backup\ncopy of pb_data"
  }

  nginx -> spa: "serves / (static)"
  nginx -> pocketbase.api: "proxies /api, /_"
  pocketbase.db -> backup: "cron copy"
}

user -> vps.nginx: "HTTPS only\nnorthwind.raawww.com"
```

## 3. Functional requirements

IDs are grouped per module. "Roles" names who may perform the action (admin implicitly includes all rights).

**FR-COM — Companies**
- FR-COM-1: List companies with search, sort, and a type filter (all/customer/supplier/shipper). All roles read.
- FR-COM-2: Create/edit companies with type (multi-select), contact, address, tax id, website, notes. Roles: sales, purchasing, manager, admin.
- FR-COM-3: Block removal of a company type still referenced by documents of that kind (BR-C1).
- FR-COM-4: Block deletion of companies with orders or POs (BR-C2); show the reason.
- FR-COM-5: Companies list shows a **Total purchased** column — lifetime value since the beginning: for customer-type companies the summed revenue of their invoiced/shipped/closed order lines (BR-R1); for supplier-type companies the summed cost of PO lines on approved/closed POs (BR-R2); companies with both types show the sum (company detail splits the two figures). Sortable; 2-decimal currency. *Derivation:* client-side aggregation over `order_details` / `purchase_order_details` (expanded to their parent documents for status + company), fetched in batched list requests of ≤ 500 rows; line revenue = quantity × unit_price × (1 − discount), line cost = quantity × unit_cost (docs/04 §3.11).
- FR-COM-6: Company detail shows related orders and purchase orders.
- FR-COM-7: Create a new customer inline from the order form without losing order context.

**FR-EMP — Employees**
- FR-EMP-1: List/create/edit employees (first/last name, job title required); link an employee to a PocketBase auth user. Roles: admin.
- FR-EMP-2: Assign exactly one role: sales / purchasing / warehouse / manager / admin.
- FR-EMP-3: Deactivate (not delete) employees referenced by documents; inactive employees cannot log in.

**FR-PRD — Products & Categories**
- FR-PRD-1: List products with search, sort, category filter; low-stock rows flagged; discontinued rows visually muted.
- FR-PRD-2: Create/edit products incl. pricing, supplier, reorder/target levels, image. Roles: purchasing, manager, admin.
- FR-PRD-3: Product detail shows computed quantities: on hand, allocated, available to sell, on order (derived per docs/04 §4).
- FR-PRD-4: Manage categories (name, description, image). Roles: manager, admin.
- FR-PRD-5: "Reorder" action on a low-stock product opens PO creation prefilled with supplier and suggested quantity (target level − available).
- FR-PRD-6: Discontinued products excluded from order-line product pickers (BR-O8).

**FR-ORD — Orders**
- FR-ORD-1: List orders with search (order no, customer), status filter, newest-first default sort.
- FR-ORD-2: Create order: customer, employee (defaults to current user), order date (defaults today); add lines with product picker, quantity, unit price defaulted from list price (BR-O6). Roles: sales, manager, admin.
- FR-ORD-3: On line save, set line status by stock check: allocated / no_stock / on_order (BR-I2); write on-hold transactions for allocations.
- FR-ORD-4: Status actions New→Invoiced→Shipped→Closed and Cancel, shown only when legal for the current state and role (BR-O1..O5); invoice writes *sold* transactions.
- FR-ORD-5: Enforce invoice precondition (all lines allocated), ship preconditions (invoiced + shipper + shipping fee), date ordering (BR-O7) — all server-side.
- FR-ORD-6: Freeze line editing after New (BR-O4); allow order deletion only in New/Invoiced (BR-O5).

**FR-PO — Purchase Orders**
- FR-PO-1: List POs with search (po no, supplier), status filter, newest-first default sort.
- FR-PO-2: Create PO: supplier, expected date, lines with product, quantity (default restores target level, BR-P3), unit cost defaulted from standard cost. Roles: purchasing, manager, admin.
- FR-PO-3: Submit (purchasing+), Approve (manager/admin only, BR-P2), Cancel (before receiving), Close.
- FR-PO-4: Receive against an approved PO: record received date per line, post *purchased* transactions, run reallocation of waiting order lines oldest-first (BR-P4), mark lines posted_to_inventory.
- FR-PO-5: Enforce the full transition matrix server-side (BR-P1).

**FR-INV — Inventory**
- FR-INV-1: On-hand view per product (derived), with below-reorder-level filter.
- FR-INV-2: Transaction ledger list, filterable by product, type, and date.
- FR-INV-3: Manual adjustment entry (signed quantity + mandatory comment), roles: warehouse, manager, admin; rejected if it would drive on-hand negative (BR-I1).
- FR-INV-4: Transactions are immutable — no update/delete via API (BR-I4).

**FR-RPT — Reports**
- FR-RPT-1: Sales by period (month/quarter, grouped by employee or product) with date-range filter defaulting to the last 3 months.
- FR-RPT-2: Top-selling products for a date range.
- FR-RPT-3: Stock on hand with reorder flags.
- FR-RPT-4: Outstanding purchase orders (submitted/approved, not received) with expected dates.

**FR-DASH — Dashboard analytics** *(added 2026-07-08; visible to all roles; charts are CSS horizontal bars paired with their numbers, no chart library)*
- FR-DASH-1: Top 5 categories by stored inventory **cost** and top 5 by stock **quantity**. Cost per category = Σ over its products of on-hand(product) × standard_cost; quantity = Σ on-hand. *Derivation:* on-hand per product from the `inventory_transactions` ledger sums (docs/04 §3.10), joined client-side to `products` → `product_categories`.
- FR-DASH-2: Orders and Purchase Orders volume — monthly **count + total value** for the last 6 months, side-by-side bars. Order value = Σ line revenue; PO value = Σ line cost (statuses per BR-R1/BR-R2).
- FR-DASH-3: Top 10 selling products by revenue, quantity shown (orders invoiced/shipped/closed only, BR-R1).
- FR-DASH-4: Top 10 selling categories by revenue (BR-R1), via product → category rollup.
- FR-DASH-5: Top 5 customer companies — top buyers by revenue (BR-R1).
- FR-DASH-6: Top 5 supplier companies by our purchase spend (approved/closed POs only, BR-R2).
- *Derivation note (all of FR-DASH):* computed client-side by aggregation over `order_details` / `purchase_order_details` (expanded with parent order/PO status and dates, product, category, company), fetched in batched list requests of ≤ 500 rows per page; formulas in docs/04 §3.11. No server-side reporting endpoint is added in v1.

**FR-AUTH — Authentication & authorization**
- FR-AUTH-1: Email/password login via PocketBase auth; session persists across reloads; logout everywhere.
- FR-AUTH-2: Every employee auth user maps to a role; UI menus and API rules both respect it (defense in depth).
- FR-AUTH-3: Inactive employees are denied login.

**FR-I18N — Internationalization**
- FR-I18N-1: Full UI in th/en/ja; switcher in top bar and settings; choice persisted (localStorage + user profile).
- FR-I18N-2: Dates, numbers, and currency formatted per active locale (ISO dates as canonical storage).
- FR-I18N-3: No mixed-language screens: every string keyed through the i18n layer.

## 4. Non-functional requirements
- **NFR-1 Responsive:** all screens usable from 360 px to 1440 px; breakpoints 360/768/1024/1440 (docs/06 §4); warehouse flows verified at 360 px.
- **NFR-2 Visual/accessibility:** light theme only; WCAG 2.1 AA contrast for all text incl. status badges; keyboard-navigable forms and tables.
- **NFR-3 Capacity:** runs on a 2 vCPU / 4 GB VPS; SQLite single-node; designed for ≤ 25 concurrent users and low tens of thousands of rows per collection; list responses paginated at 20 records.
- **NFR-4 Performance:** list pages interactive < 2 s on a mid-range phone over 4G; API queries indexed on relation and status fields.
- **NFR-5 Backup/recovery:** nightly copy of `pb_data` retained 14 days; restore procedure documented in `deploy/`.
- **NFR-6 Security:** HTTPS only (Let's Encrypt, HTTP redirected); tokens in memory/localStorage per PB SDK defaults; no secrets in the repo (`env.*.txt` git-ignored); PB admin UI restricted.
- **NFR-7 Maintainability:** migrations as versioned JS in `backend/pb_migrations/`; hooks covered by tests; all diagrams in D2.

## 5. Integration & constraints — PocketBase authorization strategy

Authorization is declared per collection in PocketBase API rules (layer 1), with hooks as layer 2 for anything rules cannot express. Strategy:

- Every rule starts from `@request.auth.id != ""` — no anonymous access to any collection.
- The requester's role is resolved via the `employees` relation to the auth user: `@request.auth.employee.role` (employees stores the back-relation; the effective pattern is a rule on `employees_via_user` lookup or a denormalized `role` field on the auth user — decided at implementation, documented in migrations).
- **Read (list/view):** all authenticated staff can read every business collection (companies, products, categories, orders, order_details, purchase_orders, purchase_order_details, inventory_transactions). Employee records: self + admin.
- **Create/update:** allowed roles per module as in §3 (e.g., orders: `role in ["sales","manager","admin"]`; purchase_orders create/update: `["purchasing","manager","admin"]`).
- **Status-field protection:** API rules cannot validate transitions, so rules permit the update while hooks reject illegal `status` changes, out-of-order dates, negative stock, non-manager approval, and edits to frozen lines. Hooks are the single place transition matrices (docs/04 §5) are encoded.
- **Delete:** narrowest of all — orders/POs deletable only pre-shipment/pre-receipt by their allowed roles; inventory_transactions and posted PO lines: delete rule `null` (nobody, not even via API).
- No external services are required or permitted in v1; email, payment, and accounting integrations are explicitly out of scope.

## 6. Traceability

| FR group | BRD process | Collections touched | PRD feature |
|---|---|---|---|
| FR-COM | 4.1 Companies (+ 4.6 lifetime value) | companies, order_details + purchase_order_details (derived, FR-COM-5) | F3 |
| FR-EMP | 3 roles / 4.1 | employees, users | F9 |
| FR-PRD | 4.2 Catalog | products, product_categories, inventory_transactions (derived) | F4 |
| FR-ORD | 4.3 Sales orders | orders, order_details, inventory_transactions, companies, products | F5 |
| FR-PO | 4.4 Purchasing | purchase_orders, purchase_order_details, inventory_transactions, companies, products | F6 |
| FR-INV | 4.5 Inventory | inventory_transactions, products | F7 |
| FR-RPT | 4.6 Reporting | orders, order_details, purchase_orders, inventory_transactions | F8 |
| FR-DASH | 4.6 Reporting (management dashboards) | orders, order_details, purchase_orders, purchase_order_details, products, product_categories, companies, inventory_transactions (all derived client-side) | F2 |
| FR-AUTH | §3 stakeholders | users, employees | F1, F9 |
| FR-I18N | objective 3 | — (frontend) | F1, all |

## สรุปภาษาไทย

SRS ฉบับนี้กำหนดสถาปัตยกรรมระบบแบบเซิร์ฟเวอร์เดียว: React SPA + PocketBase (SQLite) หลัง Nginx พร้อม TLS โดยมีการควบคุมสิทธิ์สองชั้นคือ API rules ของแต่ละ collection และ hooks ฝั่งเซิร์ฟเวอร์สำหรับกฎธุรกิจ เช่น การเปลี่ยนสถานะเอกสารและการห้ามสต๊อกติดลบ เอกสารระบุ functional requirements ครบทุกโมดูล (บริษัท พนักงาน สินค้า ใบสั่งขาย ใบสั่งซื้อ สต๊อก รายงาน การยืนยันตัวตน และ i18n) พร้อม NFR ด้าน responsive, ความปลอดภัย, ประสิทธิภาพ และการสำรองข้อมูล ท้ายเอกสารมีตาราง traceability เชื่อม FR → กระบวนการธุรกิจ → collection → ฟีเจอร์ใน PRD

ฉบับปรับปรุง 2026-07-08: เพิ่มกลุ่ม FR-DASH-1..6 สำหรับส่วน Analytics บนแดชบอร์ด (กราฟแท่ง CSS 6 รายการ มองเห็นได้ทุกบทบาท คำนวณฝั่ง client โดยรวมยอดจาก order_details / purchase_order_details แบบดึงข้อมูลเป็นชุดละไม่เกิน 500 แถว) และ FR-COM-5 คอลัมน์ "Total purchased" ในหน้ารายชื่อบริษัท (มูลค่าตลอดอายุความสัมพันธ์ตามกฎ BR-R1/BR-R2) โดยเลื่อนข้อเดิมเป็น FR-COM-6/7 และปรับตาราง traceability ให้ครอบคลุม FR-DASH
