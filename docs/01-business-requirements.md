# Business Requirements Document (BRD)

> **Audience:** Business Analyst · **Status:** complete (Phase 1, Cycle 1.1) · **Owner:** —

## 1. Background
Northwind Traders is a specialty food trading company: it buys products from supplier companies, holds inventory, and sells to customer companies through sales orders processed by employees. Today these operations are modeled in Microsoft's Northwind 2.0 Developer Edition, an Access desktop template. This document restates that business model as requirements for a web application, so the proven processes survive the platform change while desktop-only limitations (single user context, no mobile access, English-only UI) are removed.

## 2. Business objectives
1. Replace the Access-only Northwind 2.0 with a web application usable on any modern device (phone to desktop), with no local installation.
2. Preserve the proven business model — unified company directory, sales orders with stock allocation, purchase-driven restocking, ledger-based inventory — including every business rule catalogued in `reference/northwind-notes.md`.
3. Support staff working in Thai, English, and Japanese; each user works in the language of their choice and the data remains shared.
4. Strengthen rule enforcement: rules that the Access template only enforced in specific forms (and could be bypassed by editing tables directly) must be enforced centrally on the server.

## 3. Stakeholders & roles
| Role | Interest |
|---|---|
| Sales staff | create/manage orders, register new customers mid-order, see stock availability |
| Purchasing staff | create and submit purchase orders, act on restock suggestions |
| Warehouse staff | receive stock against POs, perform stock adjustments, check on-hand — often from a phone on the floor |
| Manager | approve purchase orders, monitor reports, unblock exceptions |
| Administrator | manage employees/roles, master data (categories, settings) |

## 4. Business processes

### 4.1 Customer & supplier management (Companies)
Northwind keeps one directory of external companies, each flagged with one or more types: **customer**, **supplier**, or **shipper**. The type determines where the company may be used — customers and shippers on sales orders, suppliers on purchase orders and products. Staff browse and filter the directory by type, keep contact and address details current, and open a company to see its related orders or purchase orders. A salesperson taking an order from a brand-new customer can register the company without leaving the order flow. Companies that already appear on documents are protected: their type usage cannot be withdrawn and they cannot be deleted while orders or POs reference them.

### 4.2 Product catalog & categories
The catalog holds every product Northwind trades, grouped into product categories (an image and description per category feed the catalog presentation). Each product carries a code, name, category, supplier, list price (what customers pay), standard cost (what Northwind pays), packaging description, an image, and the inventory planning numbers: reorder level, target level. Discontinued products stay on record for history but are excluded from new orders. Purchasing and admins maintain the catalog; sales and warehouse consume it. Low-stock products are visibly highlighted in the product list so restocking needs are seen without running a report.

### 4.3 Sales order lifecycle
A sales order is created by an employee for a customer, dated today by default, and filled with line items (product, quantity, unit price copied from the list price). As each line is saved, the system checks stock: if enough unallocated stock exists the line is **allocated** (reserved); otherwise it is marked **no stock**, or **on order** when an approved PO already covers it. The order header then advances through a fixed workflow: **New → Invoiced → Shipped → Closed**. Invoicing is only possible when every line is allocated — this is the moment stock is considered *sold*. Shipping requires a shipper and a shipping fee, which joins the order total. A cancelled path exists for orders that die before shipping; shipped orders can no longer be deleted or cancelled. Line items are frozen once the order leaves New status.

### 4.4 Purchasing lifecycle
When stock runs low — spotted on the product page, the dashboard, or triggered explicitly via a "reorder" action — purchasing raises a purchase order on the product's supplier. The reorder action reuses an existing open PO for that supplier when one exists, otherwise it starts a new one; the suggested quantity restores stock to the product's target level. The PO advances **New (draft) → Submitted → Approved → Received → Closed**. Approval is a privileged act reserved for managers (and admins) — nobody approves their own elevation. Only an approved PO counts as incoming stock ("on order"). On receipt the warehouse records what arrived; received quantity first satisfies sales-order lines waiting in no-stock status (oldest first), and the remainder becomes shelf stock. A PO can be cancelled any time before receiving.

### 4.5 Inventory transactions
Inventory is a ledger, not a stored number. Every movement writes a transaction: **purchased** (goods received on a PO, stock in), **sold** (order invoiced, stock out), **on hold** (stock reserved by allocation), **waiting** (demand recorded that stock cannot yet satisfy). On-hand and available-to-sell quantities are always computed from the ledger, so the numbers reconcile by construction. Warehouse staff may post manual adjustments (breakage, count corrections) as ledger entries with a comment; adjustments never edit history. Stock can never be driven negative: any action that would oversell is rejected and routed to the restock flow instead.

### 4.6 Reporting needs
Management needs four recurring views, each filterable by date range where applicable: **sales by period** (grouped by employee or by product, monthly/quarterly), **top-selling products**, **stock on hand** (current ledger position per product, flagging items below reorder level), and **outstanding purchase orders** (submitted/approved POs not yet received, with expected dates). These correspond to the template's shipped sales reports plus the operational views its forms provided implicitly. Employee rosters and the print catalog from the Access template are out of scope for v1.

**Management dashboards (added 2026-07-08).** Beyond the four reports, management wants an at-a-glance analytics section on the dashboard, visible to all roles, covering six views: (1) the top 5 product categories by stored inventory **cost** (on-hand quantity × product standard cost, summed per category) and the top 5 by stock **quantity**; (2) the volume of Orders and Purchase Orders — monthly count and total value over the last 6 months, side by side; (3) the top 10 selling products by revenue (quantity shown); (4) the top 10 selling categories; (5) the top 5 customer companies (top buyers by revenue); (6) the top 5 supplier companies by our purchase spend. In addition, the companies directory must make **lifetime value** visible: every company row shows the total purchased since the beginning — for customers, everything they have bought from Northwind; for suppliers, everything Northwind has bought from them; companies that are both show the sum, split apart on the company detail.

## 5. Business rules
Rules below are binding; the system (not user discipline) enforces them. Source: `reference/northwind-notes.md`.

**Companies**
- BR-C1: A company must have at least one type (customer/supplier/shipper); a type may not be removed while documents of that kind reference the company.
- BR-C2: A company with any orders or purchase orders cannot be deleted.

**Orders**
- BR-O1: Order status moves only forward along New → Invoiced → Shipped → Closed; Cancelled is reachable only from New or Invoiced. No skipping, no reversing.
- BR-O2: An order cannot be invoiced unless **every** line item is Allocated.
- BR-O3: An order cannot be shipped before it is invoiced, and shipping requires a shipper and a shipping fee.
- BR-O4: Line items are read-only once the order is past New.
- BR-O5: Only orders in New or Invoiced status (never shipped) may be deleted/cancelled.
- BR-O6: Line unit price defaults from the product's list price at entry and is snapshotted — later catalog price changes never alter existing orders.
- BR-O7: Dates must be ordered: order date ≤ invoice date ≤ shipped date (closing the gap the Access template left open).
- BR-O8: Discontinued products cannot be added to new orders.

**Inventory**
- BR-I1: Stock on hand can never go negative; a sale is only recognized (line allocated → invoiced) against stock that exists.
- BR-I2: Ordering more than available stock does not fail silently — the line is marked No Stock / On Order and the user is prompted toward the restock flow.
- BR-I3: On-hand is derived exclusively from the transaction ledger; no editable "quantity" field exists on the product.
- BR-I4: Manual adjustments are new ledger entries with a mandatory comment; existing transactions are never edited or deleted.

**Purchasing**
- BR-P1: PO status moves only forward along New → Submitted → Approved → Received/Closed; Cancelled is reachable any time before receiving.
- BR-P2: Approval requires the manager or admin role; a PO must be approved before it can be received (no approval, no receiving).
- BR-P3: A PO line's quantity should restore stock to at least the product's target level; the reorder flow proposes this quantity by default.
- BR-P4: Receiving a PO posts *purchased* inventory transactions and first fulfills sales-order lines waiting in No Stock status, oldest first.
- BR-P5: Reorder is triggered (suggested on dashboard/product list) whenever available stock falls below the product's reorder level.

**Pricing**
- BR-PR1: List price is what customers are charged; standard cost is the purchasing default on PO lines. Both live on the product; documents snapshot their own copies.

**Reporting & analytics**
- BR-R1: "Selling" figures (top products/categories, customer revenue, lifetime customer value) count **only** orders whose status is invoiced, shipped, or closed. New and cancelled orders never contribute to sales numbers.
- BR-R2: Purchase-spend figures (supplier ranking, lifetime supplier spend, PO value chart) count **only** purchase orders whose status is approved or closed. Draft, submitted, and cancelled POs never contribute.

## 6. Success criteria
- Every workflow in §4 is achievable end-to-end in the web app: directory upkeep, order from creation to Closed (including the no-stock → PO → receive → allocate loop), PO from draft to received, manual adjustment, and all four reports — verified against the wireframe verification gate (`docs/07-wireframes/verification.md`).
- All §5 rules are enforced server-side; attempts to break them via the raw API are rejected, not just hidden in the UI.
- Warehouse tasks (receive PO, adjustment, stock lookup) are comfortably usable on a 360 px phone.
- The full UI is available in Thai, English, and Japanese with locale-correct dates, numbers, and currency.

## สรุปภาษาไทย

เอกสารนี้แปลงโมเดลธุรกิจของ Northwind 2.0 (Access) เป็นข้อกำหนดเชิงธุรกิจของเว็บแอป ครอบคลุม 6 กระบวนการหลัก: ทะเบียนบริษัท (ลูกค้า/ซัพพลายเออร์/ผู้ส่ง) แคตตาล็อกสินค้า วงจรใบสั่งขาย (New → Invoiced → Shipped → Closed) วงจรใบสั่งซื้อพร้อมการอนุมัติ บัญชีเคลื่อนไหวสต๊อก และรายงาน กฎธุรกิจสำคัญถูกระบุชัดเจน เช่น สต๊อกติดลบไม่ได้ ออกใบแจ้งหนี้ได้ต่อเมื่อจองสต๊อกครบทุกรายการ ต้องอนุมัติใบสั่งซื้อก่อนรับของ และแนะนำสั่งซื้อเมื่อสต๊อกต่ำกว่าจุดสั่งซื้อ โดยทุกกฎต้องถูกบังคับที่ฝั่งเซิร์ฟเวอร์ และเกณฑ์ความสำเร็จคือทำงานครบทุกกระบวนการบนมือถือได้และรองรับ 3 ภาษา

ฉบับปรับปรุง 2026-07-08: §4.6 เพิ่มความต้องการแดชบอร์ดผู้บริหาร 6 มุมมอง (มูลค่า/ปริมาณสต๊อกตามหมวด 5 อันดับ, จำนวนและมูลค่าใบสั่งขาย-ใบสั่งซื้อรายเดือน 6 เดือน, สินค้าและหมวดขายดี 10 อันดับ, ลูกค้าและซัพพลายเออร์ 5 อันดับ) และการแสดงมูลค่าตลอดอายุความสัมพันธ์ของบริษัทในทะเบียน พร้อมกฎใหม่ BR-R1 (ยอดขายนับเฉพาะออเดอร์ invoiced/shipped/closed) และ BR-R2 (ยอดซื้อนับเฉพาะ PO approved/closed)
