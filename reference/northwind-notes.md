# Northwind 2.0 Developer Edition — Study Notes

> **Status:** complete (Phase 1 Cycle 1.1) · Compiled 2026-07-08 from the Microsoft support articles listed below. One section per Microsoft article; captures entities, fields, business rules, and workflows relevant to the web modernization.

## Sources
- Overview: https://support.microsoft.com/en-US/Access/northwind-2-0-developer-edition
- Companies · Employees · Orders · Product Categories · Products · Inventory · Purchase Orders · Reports · Things You Should Know (links in PLAN.md; all fetched and studied 2026-07-08)
- Legacy SQL: https://github.com/microsoft/sql-server-samples/tree/master/samples/databases/northwind-pubs (log any file used in asset.md)

## Per-module notes

### Companies — unified model (customer/supplier/shipper)

The Developer Edition expands the Starter Edition's single "Customer" concept into three company types: **Customer**, **Shipper**, and **Vendor** (supplier). In the Access template each company holds exactly one type, and the types drive where a company may appear: a Customer or Shipper on an Order, a Vendor on a Purchase Order or as a vendor for a Product. Companies can have multiple **Contacts** (child table). Products can have multiple vendors (a `ProductVendor` junction table).

Key fields observed: company name, company type, contact info (phone, email), address block, website hyperlink. The Company List form offers prebuilt filters (All / Customers / Shippers / Vendors) plus on-demand column filtering; applied filters carry into the detail form.

**Business rules captured:**
- A company's type cannot be changed while the company is "active" — i.e., it has any Orders, Purchase Orders, or is a Vendor for a Product (function `CompanyIsActive()`). References must be cleared first.
- Deletion is blocked when the company has Orders or Purchase Orders. If only ProductVendor links or Contacts exist, the template confirms intent and cascade-deletes those child records.
- Saving must be explicit: the detail form intercepts Access's implicit autosave and forces a Save/Cancel decision (`Form_BeforeUpdate` prompt). This is stated as a Northwind business rule, not just a UI nicety.
- A new customer can be created mid-order-entry (type an unknown name in the customer dropdown → Company Detail opens → return to the order).

**Web takeaway:** one `companies` collection with a multi-select `company_type` (a company can legitimately be both a customer and a supplier in the real world — we deliberately relax the Access single-type restriction), guarded type changes and deletes enforced by PocketBase hooks.

### Employees — roles, relationship to logins

Employees is a single list+detail (split form) module. Required fields: **First Name, Last Name, Job Title** (validated in `Form_BeforeUpdate` via a reusable `modValidation` module). The **Title** dropdown is a lookup table (`Titles`) users may extend; **SupervisorID** is a self-referential FK (an employee cannot be their own supervisor). Employee photos live in an Attachment field — the article itself notes attachments bloat the file and recommends external storage with a path reference. An Orders subform lists the employee's recent orders, newest first. Privileges (e.g., Purchase Approval) live in an `EmployeePrivileges` table.

**Business rules captured:**
- Employees with related Orders, Purchase Orders, supervisees, or Privileges cannot be deleted (`EmployeeCanBeDeleted`); a friendly dialog explains why.
- First/last name and job title are mandatory; validation highlights the offending fields rather than throwing a raw error.

**Web takeaway:** `employees` collection with an optional relation to a PocketBase auth user; the privilege table collapses into a single `role` enum (sales / purchasing / warehouse / manager / admin) — the manager and admin roles carry the old "Purchase Approval" privilege.

### Orders — status lifecycle, allocation, pricing rules

Order header: customer, employee (defaults to the logged-in user), order date (defaults to today), shipper, shipped date, paid date, tax rate (read from `SystemSettings`), tax status (defaulted from the customer), shipping fee, notes. Lines: product (chosen via cascading Category → Product dropdowns), quantity, unit price (auto-filled from the product's list price), computed line price.

**Order status lifecycle (header):** `New → Invoiced → Shipped → Closed`, advanced only by workflow buttons — never by typing into the status field. Tracking fields are locked and set programmatically.

**Line-item statuses:** *None* (just entered), *Allocated* (stock reserved), *Invoiced*, *Shipped*, *On Order* (covered by an approved PO), *No Stock*. Inventory is checked when each line is saved and the status is set accordingly.

**Business rules captured:**
- An order can only be **Invoiced** when every line is Allocated; any line in No Stock or On Order blocks invoicing with a validation error. The remedy is to raise and receive a Purchase Order, which flips the line to Allocated.
- **Shipping** requires a Shipper and a Shipping Fee; the fee is added to the order total.
- Line items cannot be modified once the order is past **New**.
- Only unshipped orders may be deleted.
- The Access template deliberately does *not* validate date logic (a Shipped Date before the Order Date is possible) — flagged as "not production quality". Our web version **will** validate date ordering.
- Unit price snapshots the product's list price at entry time; editing the product's price later never rewrites existing lines.

### Product Categories — structure

A small admin-managed module (reached via System Admin in the template). Fields: category name, description, and a `ProductCategoryImage` Attachment used in the Fall Catalog report. Simple listbox-driven navigation; no workflow. Web takeaway: `product_categories` collection with a PocketBase file field for the image; category management restricted to manager/admin roles.

### Products — pricing, reorder levels, images

Product fields observed: product code, name, description, category, vendor(s), list price, standard cost, quantity per unit, reorder level, target level, minimum reorder quantity, discontinued flag, image. The Product List highlights low-inventory rows (conditional formatting) and shades discontinued products. The Product Detail computes and displays inventory-derived numbers via shared functions: *Qty Available, Qty Allocated, Qty On Order, Qty No Stock, Qty To Reorder*.

**Business rules captured (Reorder Product flow):**
- The **Reorder Product** action identifies the vendor, then either appends a line to that vendor's existing *open* purchase order or creates a new PO, with the default quantity taken from the product's minimum reorder quantity.
- If a product has multiple vendors and none has an open PO, the user is prompted to choose a vendor.
- Reorder is suggested when available stock falls below the product's **reorder level**; the purchase should bring stock back up to at least the **target level**.

**Web takeaway:** single `supplier` relation per product in v1 (multi-vendor is out of scope), image as PocketBase file field, low-stock highlighting reproduced with a computed on-hand value.

### Inventory — transaction types, on-hand calculation

The template defines its terms precisely (modInventory):
- A product is **bought** when Northwind *receives* it on a PO (not when the PO is approved).
- A product is **sold** when Northwind *invoices* an order for it (not when it ships).
- **Product Available** = physically on the shelf, *including* units allocated to unshipped orders.
- **Product to Sell** = on the shelf and *not* allocated — free to promise.
- **Product On Order** = on a PO in *Approved* status.

**On-hand formula (Allen Browne pattern):**
`[Last Stock Take Qty] + [Sum bought since] − [Sum sold since] = [Physical qty on hand]`

**Allocation walk-through (demo scenario):** a new product with zero stock: an order line for qty 10 gets status *No Stock*; creating a PO (default qty = min reorder qty, e.g. 100) and advancing it to *Approved* flips the line to *On Order*; advancing the PO to *Received* runs `ReallocateInventory`, which walks order lines in No Stock / On Order status oldest-first and sets them to *Allocated* while quantity remains, adding the rest to stock (a StockTake record is written).

Reallocation also runs when an allocated line is deleted, its quantity is decreased, or its product is changed — the freed quantity is re-offered to waiting lines.

**Explicitly out of scope in the template (and in our v1):** partial invoices/shipments, returns/RMA, preferential allocation, bin locations/barcodes, product expiration.

**Web takeaway:** an `inventory_transactions` ledger with types *purchased / sold / on_hold / waiting* and a signed-quantity convention; on-hand is always derived from the ledger, never stored on the product.

### Purchase Orders — approval workflow, receiving into stock

PO header: vendor, creator, submitted date/by, approved date/by, expected date, shipping fee, taxes, payment fields, notes. Lines: product, quantity, unit cost, date received, posted-to-inventory flag.

**PO lifecycle:** created as a draft (**New**) → **Submitted** → **Approved** → **Received** → **Closed**, advanced by header buttons only; tracking fields are locked and set programmatically.

**Business rules captured:**
- **Approving a PO requires the Purchase Approval privilege** (in the template only Andrew Cencini has it out of the box). Northwind lets users grant themselves the privilege — called out as exactly what a production app must *not* allow.
- Line quantity must be **at least the product's Minimum Reorder Quantity**, and should ideally restore inventory to at least the **Target Level**.
- On **Received**, `AllocateToInventory` distributes arriving stock to order lines waiting in *No Stock* status (setting them Allocated); the remainder goes to inventory and a StockTake record is added.
- POs can also be spawned from the Product form's Reorder button (see Products above).

### Reports — shipped reports and their queries

Three categories ship with the template:
- **Sales reports:** Monthly Sales per Employee, Monthly Sales per Product, Quarterly Sales per Product. All take a Start/End date range (defaults: today back three months); charts summarize the numbers; Monthly-per-Employee supports interactive filtering by employee.
- **Employee reports:** Email List (grouped by first letter) and Phone List — simple rosters, no parameters.
- **Catalog report:** the Northwind Fall Catalog with a generated table of contents (report runs twice — a trick we do not need on the web).

**Web takeaway (report set for v1, per BRD §4.6):** sales by period (by employee / by product), top-selling products, stock on hand, outstanding purchase orders. All are straightforward aggregates over orders, order_details, and inventory_transactions.

### Things You Should Know — design decisions to keep or change

The article is mostly Access mechanics; the durable ideas and their web fates:
- **SystemSettings table** (tax rate, ShowWelcome flag) → keep as a tiny `settings` mechanism or constants file; tax rate must not be hard-coded.
- **Global error handler** (`clsErrorHandler`, consistent handling in one place) → the principle maps to a single API-error → toast/field-error mapping layer in the React app and consistent hook error responses.
- **MRU (most recently used) list** of orders/POs in the ribbon → useful UX; on the web this becomes browser history plus dashboard "recent items"; not a database feature.
- **OpenArgs/querystring parameter passing** → literally URL query/route params in a SPA; the web gets this for free.
- **Trusted locations / VBA / macros** → no equivalent needed; business logic moves to PocketBase hooks executed server-side, which is strictly safer than client-side VBA.
- **Bound forms with implicit autosave** (and the workarounds to force explicit save) → we adopt explicit Save as the only model; no autosave.

## Modernization decisions log

| # | Access-era design | Web version decision | Rationale |
|---|---|---|---|
| 1 | Lookup tables for closed domains (OrderStatus, POStatus, TransactionTypes, Titles) | PocketBase **select (enum) fields** with fixed value lists | Values are stable and workflow-coupled; enums remove joins, keep API payloads flat, and hooks can validate transitions directly |
| 2 | One company type per company (Customer *or* Shipper *or* Vendor) | `company_type` as a **multi-select** enum on one `companies` collection | Real businesses can be both customer and supplier; one directory avoids duplicate records while filters reproduce the old per-type lists |
| 3 | Attachment fields for images (employees, categories, products) | **PocketBase file fields** with thumb generation | The Access article itself warns attachments bloat the DB; PB stores files on disk and serves them over HTTP with thumbs |
| 4 | VBA validation (`modValidation`, Form_BeforeUpdate) and workflow button logic | **PocketBase server-side hooks** (`pb_hooks/*.js`) on create/update | Rules enforced once, server-side, regardless of client; direct-table edits that Access allowed become impossible |
| 5 | EmployeePrivileges table (e.g., Purchase Approval) | Single **`role` enum** on `employees` + PB collection API rules | Five roles cover all template privileges; API rules give a declarative first authorization layer, hooks the second |
| 6 | SupervisorID self-referential field + Titles lookup | **Dropped for v1**; `job_title` is plain text | Org-chart features are not used by any workflow in scope; cutting them keeps the schema lean |
| 7 | Inventory = StockTake baseline + bought − sold queries | Pure **`inventory_transactions` ledger**; on-hand always derived by aggregation | One source of truth; SQLite sums a few thousand rows instantly; no stock-take table needed at this scale (an adjustment is just another transaction) |
| 8 | Multiple vendors per product (`ProductVendor` junction) | Single `supplier` relation on `products` (v1) | Simplifies the reorder flow (no vendor-picker dialog); multi-vendor can return as a junction collection later without breaking the API |
| 9 | Order/PO numbers = Access AutoNumber IDs | Human-readable **`order_number` / `po_number`** (`SO-YYYY-NNNN`, `PO-YYYY-NNNN`) generated by a create hook | PocketBase IDs are random strings; users need sortable, citable document numbers |
| 10 | Tax rate in `SystemSettings`, Tax Status per customer | Tax stored **per order** (`taxes` amount) with the rate applied at creation time from app config | Snapshot semantics: changing a config rate must never alter historical orders |
| 11 | MRU list in the ribbon (custom table + ribbon XML) | Dashboard "recent orders / POs" queries sorted by `updated` | Same user value, zero extra schema; the browser also provides history/deep links |
| 12 | No date validation (shipped-before-ordered allowed) | Hooks enforce **date ordering** (order ≤ invoice ≤ ship) and legal status transitions only | The template admits this is a showcase gap; a production web app must close it |
| 13 | Split forms / datasheet filtering, Show-Hide Fields per user | Standard LOB list pages: search + column sort + pagination (docs/09 conventions) | Web tables have their own mature conventions; per-user column layouts are out of scope for v1 |

## สรุปภาษาไทย

เอกสารนี้สรุปการศึกษา Northwind 2.0 Developer Edition จากบทความของ Microsoft ครบทุกโมดูล ได้แก่ บริษัท (ลูกค้า/ซัพพลายเออร์/ผู้ส่งสินค้า) พนักงาน ใบสั่งขาย (สถานะ New → Invoiced → Shipped → Closed) สินค้าและหมวดหมู่ สต๊อก (คำนวณคงเหลือจากรายการเคลื่อนไหว) ใบสั่งซื้อ (Submit → Approve → Receive → Close ต้องมีสิทธิ์อนุมัติ) และรายงาน พร้อมกฎธุรกิจสำคัญ เช่น ออกใบแจ้งหนี้ได้เมื่อจองสต๊อกครบทุกรายการ และต้องระบุผู้ส่งกับค่าส่งก่อนจัดส่ง ส่วนท้ายเป็นตารางบันทึกการตัดสินใจปรับปรุงสู่เว็บ 13 ข้อ เช่น เปลี่ยน lookup table เป็น enum, ใช้ไฟล์ของ PocketBase แทน attachment และย้าย validation จาก VBA ไปเป็น hooks ฝั่งเซิร์ฟเวอร์
