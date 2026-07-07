# Product Requirements Document (PRD) — Northwind Web App

> **Audience:** whole team · **Status:** revised 2026-07-08 (dashboard analytics + company lifetime totals) · **Owner:** —

## 1. Product summary
A calm, clean, light-themed responsive web app for running Northwind Traders' daily operations — orders, purchasing, inventory, and the company/product master data behind them — in Thai, English, or Japanese. One shared database, five roles, every business rule enforced server-side.

## 2. Users & personas

- **Nok — Sales (desktop-heavy).** Takes phone orders all day. Needs fast order entry with stock visibility at the moment of entry, and the ability to register a brand-new customer without abandoning the order.
- **Ken — Purchasing (desktop).** Watches the low-stock list, turns restock suggestions into POs, chases expected dates. Wants suggested quantities computed for him.
- **Ploy — Warehouse (mobile-heavy).** Receives deliveries against POs and posts stock adjustments from a phone on the floor. Needs big targets, few taps, and numbers she can trust.
- **Suda — Manager (both).** Approves POs, watches sales and outstanding-PO reports, unblocks exceptions. Wants an approval queue on her dashboard.
- **Arthit — Admin (desktop).** Manages employees, roles, categories, and settings. Rarely daily, always precise.

## 3. Feature list & user stories
Priorities: MoSCoW. Wireframes: `docs/07-wireframes/NN-*`.

### F1 Login & language selection — Must
*As a staff member, I sign in with email/password and work in my own language.*
- AC: login with valid credentials lands on the dashboard; invalid shows an inline error; inactive employees are refused.
- AC: language switcher (th/en/ja) available on the login screen and top bar; choice persists across sessions (localStorage + profile).
- AC: all three languages render fully — no untranslated strings in core flows.
- Wireframes: `01-login`, `20-settings`.

### F2 Dashboard — Should
*As any staff member, I open the app and immediately see what needs my attention.*
- AC: role-aware panels — sales: my recent orders & orders stuck in New/Invoiced; purchasing/warehouse: low-stock products and POs awaiting receipt; manager: POs awaiting approval.
- AC: low-stock panel lists products with available < reorder level, linking to the reorder flow (F6).
- AC: recent items (orders/POs) replace the Access MRU list.
- AC: **Analytics section** below the role panels, visible to **all roles**, containing six charts (FR-DASH-1..6): (1) top 5 categories by stored inventory **cost** (Σ per category of on-hand qty × product standard_cost) *and* top 5 categories by stock **quantity**; (2) Orders and Purchase Orders volume — monthly count **and** total value for the last 6 months, side-by-side bars; (3) top 10 selling products by revenue, with quantity shown; (4) top 10 selling categories by revenue; (5) top 5 customer companies (top buyers by revenue); (6) top 5 supplier companies by our purchase spend.
- AC: "selling" figures count only orders with status invoiced/shipped/closed (BR-R1); purchase spend counts only POs with status approved/closed (BR-R2).
- AC: charts are simple CSS horizontal bars paired with their numeric values — design-system compliant, no chart library.
- Wireframes: `02-dashboard`.

### F3 Companies directory & detail — Must
*As a salesperson or buyer, I keep one directory of customers, suppliers, and shippers.*
- AC: list with search, sort, and type filter per docs/09 conventions; row click opens detail.
- AC: create/edit with multi-type, contact, address, tax id, website; validation inline.
- AC: type-in-use cannot be removed; delete blocked with a reason when orders/POs exist (BR-C1/C2).
- AC: detail shows the company's orders and POs.
- AC: list shows a **Total purchased** column — lifetime value since the beginning: customer-type companies show total revenue Northwind invoiced them (invoiced/shipped/closed order lines, BR-R1); supplier-type companies show our total purchase spend with them (approved/closed PO lines, BR-R2); companies holding both roles show the **sum** (the detail view splits the two figures). Column is sortable and formatted as 2-decimal currency.
- Wireframes: `03-companies-list`, `04-company-detail`.

### F4 Products & categories — Must
*As purchasing, I maintain the catalog the whole company sells from.*
- AC: product list flags low stock and mutes discontinued items; search/sort/category filter per docs/09.
- AC: product detail shows derived quantities (on hand, allocated, available, on order) and a Reorder action when below reorder level.
- AC: category management (name, description, image) for manager/admin.
- AC: discontinued products cannot be added to new orders.
- Wireframes: `05-products-list`, `06-product-detail`, `07-categories`.

### F5 Order management — Must
*As a salesperson, I create an order, watch each line allocate against stock, and walk it to Closed.*
- AC: create form defaults employee=me, date=today; lines pick product (searchable), qty; unit price auto-fills and is editable pre-invoice.
- AC: each saved line shows its status badge (allocated / no stock / on order); no-stock lines offer a "create PO" shortcut.
- AC: status buttons appear only when legal (Invoice requires all-allocated; Ship requires shipper+fee); server rejects illegal calls identically.
- AC: lines lock after New; unshipped orders can be cancelled/deleted; dates validate in order.
- Wireframes: `08-orders-list`, `09-order-create`, `10-order-detail`.

### F6 Purchase orders — Must
*As purchasing, I restock from suppliers; as a manager, I approve before anything is received.*
- AC: create PO manually or from a product's Reorder action (supplier and suggested qty prefilled to reach target level).
- AC: Submit → Approve (manager/admin only) → Receive → Close buttons gated by state and role.
- AC: receiving records date per line, posts purchased stock, and re-allocates waiting order lines oldest-first; affected orders update visibly.
- AC: cancel allowed any time before receiving.
- Wireframes: `11-purchase-orders-list`, `12-po-create`, `13-po-detail`.

### F7 Inventory — Must
*As warehouse staff, I see true stock and correct it when reality disagrees.*
- AC: on-hand view per product with below-reorder filter; numbers match the ledger sums exactly.
- AC: transaction ledger filterable by product/type/date; entries are read-only.
- AC: adjustment form takes signed quantity + mandatory comment; negative-result adjustments are rejected with a clear message.
- AC: all three screens comfortable at 360 px.
- Wireframes: `14-inventory-onhand`, `15-inventory-transactions`, `16-adjustment`.

### F8 Reports — Should
*As a manager, I check sales, stock, and outstanding purchasing without exporting anything.*
- AC: four reports — sales by period (by employee/product), top-selling products, stock on hand, outstanding POs — each with the date-range or filter controls it needs (default range: last 3 months).
- AC: every report pairs its chart (where present) with the numbers in a table; tables follow docs/09 conventions.
- Wireframes: `17-reports-home`, `18-report-view`.

### F9 Admin — Must
*As an admin, I manage who can do what.*
- AC: employee list/create/edit with role assignment and active toggle; deactivation blocks login immediately.
- AC: an employee with documents cannot be deleted — only deactivated.
- AC: settings screen covers language default and profile language.
- Wireframes: `19-admin-employees`, `20-settings`.
- **Note:** additional Employees requirements pending — the stakeholder's requirement line for Employees arrived empty/cut off (2026-07-08). Scope above is unchanged; no features are invented until the stakeholder input arrives.

## 4. Out of scope (v1)
Dark theme; offline mode; external accounting/email integration; multi-warehouse and bin locations; partial shipments/invoices; returns & RMA; multi-currency; multi-vendor per product; Buddhist-calendar display; the Access print catalog and employee rosters.

## 5. Release plan
- v0.1-design → v0.2-backend → v1.0 (see PLAN.md cycles)

## 6. Metrics of success
- 100% of F1–F9 acceptance criteria demonstrably pass on production (`northwind.raawww.com`).
- Core flows (create order incl. no-stock path, approve+receive PO, adjustment) completable on a 360 px phone in all three languages.
- Zero business-rule violations reachable through the raw API in the verification test set.
- Wireframe verification gate (docs/07-wireframes/verification.md) passed with every feature mapped to ≥ 1 wireframe and vice versa.

## สรุปภาษาไทย

PRD นี้กำหนดฟีเจอร์ของเว็บแอป Northwind ทั้ง 9 กลุ่ม (F1–F9): การเข้าสู่ระบบพร้อมเลือกภาษา แดชบอร์ดตามบทบาท ทะเบียนบริษัท แคตตาล็อกสินค้า การจัดการใบสั่งขายตามวงจรสถานะ ใบสั่งซื้อพร้อมการอนุมัติและรับของ สต๊อกแบบ ledger รายงาน 4 แบบ และหน้าแอดมิน แต่ละฟีเจอร์มี user story, เกณฑ์การยอมรับ, ลำดับความสำคัญแบบ MoSCoW และอ้างอิง wireframe ชัดเจน มีการระบุ persona 5 บทบาท ขอบเขตที่ไม่ทำใน v1 และตัวชี้วัดความสำเร็จ เช่น ใช้งานได้จริงบนมือถือ 360px ครบ 3 ภาษา

ฉบับปรับปรุง 2026-07-08: แดชบอร์ด (F2) เพิ่มส่วน Analytics ที่ทุกบทบาทมองเห็น ประกอบด้วยกราฟแท่งแนวนอนแบบ CSS 6 รายการ ได้แก่ 5 หมวดสินค้าที่มีมูลค่าสต๊อกสูงสุด (ต้นทุน) และปริมาณสูงสุด, จำนวนและมูลค่าใบสั่งขาย/ใบสั่งซื้อรายเดือนย้อนหลัง 6 เดือน, สินค้าขายดี 10 อันดับ, หมวดขายดี 10 อันดับ, ลูกค้า 5 อันดับ และซัพพลายเออร์ 5 อันดับ โดยยอดขายนับเฉพาะออเดอร์สถานะ invoiced/shipped/closed และยอดซื้อนับเฉพาะ PO สถานะ approved/closed ส่วนหน้ารายชื่อบริษัท (F3) เพิ่มคอลัมน์ "Total purchased" แสดงมูลค่าตลอดอายุความสัมพันธ์ (ลูกค้า = ยอดขาย, ซัพพลายเออร์ = ยอดซื้อ, บริษัทที่เป็นทั้งสองแบบแสดงผลรวมและแยกรายละเอียดในหน้า detail) เรียงลำดับได้และแสดงทศนิยม 2 ตำแหน่ง สำหรับ F9 พนักงาน มีข้อกำหนดเพิ่มเติมที่ยังรอข้อมูลจากผู้มีส่วนได้ส่วนเสีย (requirement pending stakeholder input) จึงยังไม่เพิ่มฟีเจอร์ใด ๆ
