# Data Dictionary & Database Description Guideline

> **Audience:** Database Administrator · **Status:** complete (Phase 1, Cycle 1.1) · **Owner:** —

## 1. Conventions (guideline for describing the DB)
- Collection names: `snake_case`, plural (`companies`, `order_details`)
- Every field documented as: name · type · required · default · relation · description · example
- PocketBase system fields (`id`, `created`, `updated`) assumed on every collection and omitted from the tables
- PocketBase types used: `text`, `number`, `bool`, `email`, `url`, `date`, `select` (enum; "select multi" = multiple values), `relation`, `file`
- Enum values are listed with meaning; allowed transitions are in §5
- Money fields are `number` in the base currency with 2-decimal convention; quantities are integers
- Currency: one base currency for v1 (display formatted per locale); no multi-currency fields

## 2. ERD (modernized from Northwind 2.0)

D2 source: `docs/diagrams/erd.d2` (embedded below; render with `d2 docs/diagrams/erd.d2 docs/diagrams/erd.svg`).

```d2
# Northwind modernized schema — ERD (docs/04 §2)
direction: right

companies: {
  shape: sql_table
  id: text {constraint: primary_key}
  company_type: "select multi: customer|supplier|shipper"
  company_name: text
  contact_name: text
  email: email
  phone: text
  address: text
  city: text
  state_province: text
  postal_code: text
  country: text
  tax_id: text
  website: url
  notes: text
}

employees: {
  shape: sql_table
  id: text {constraint: primary_key}
  user: "relation users (optional)" {constraint: foreign_key}
  first_name: text
  last_name: text
  title: text
  email: email
  phone: text
  job_title: text
  role: "select: sales|purchasing|warehouse|manager|admin"
  active: bool
}

product_categories: {
  shape: sql_table
  id: text {constraint: primary_key}
  category_name: text
  description: text
  image: file
}

products: {
  shape: sql_table
  id: text {constraint: primary_key}
  product_code: text
  product_name: text
  description: text
  category: "relation product_categories" {constraint: foreign_key}
  supplier: "relation companies" {constraint: foreign_key}
  list_price: number
  standard_cost: number
  reorder_level: number
  target_level: number
  quantity_per_unit: text
  discontinued: bool
  image: file
}

orders: {
  shape: sql_table
  id: text {constraint: primary_key}
  order_number: text
  customer: "relation companies" {constraint: foreign_key}
  employee: "relation employees" {constraint: foreign_key}
  shipper: "relation companies (optional)" {constraint: foreign_key}
  order_date: date
  invoice_date: date
  shipped_date: date
  paid_date: date
  status: "select: new|invoiced|shipped|closed|cancelled"
  ship_name: text
  ship_address: text
  ship_city: text
  ship_postal_code: text
  ship_country: text
  shipping_fee: number
  taxes: number
  payment_method: "select: cash|card|transfer|check"
  notes: text
}

order_details: {
  shape: sql_table
  id: text {constraint: primary_key}
  order: "relation orders" {constraint: foreign_key}
  product: "relation products" {constraint: foreign_key}
  quantity: number
  unit_price: number
  discount: number
  status: "select: none|allocated|invoiced|shipped|on_order|no_stock"
  date_allocated: date
}

purchase_orders: {
  shape: sql_table
  id: text {constraint: primary_key}
  po_number: text
  supplier: "relation companies" {constraint: foreign_key}
  created_by: "relation employees" {constraint: foreign_key}
  submitted_date: date
  approved_by: "relation employees (optional)" {constraint: foreign_key}
  approved_date: date
  status: "select: new|submitted|approved|closed|cancelled"
  expected_date: date
  shipping_fee: number
  taxes: number
  payment_amount: number
  payment_date: date
  payment_method: "select: cash|card|transfer|check"
  notes: text
}

purchase_order_details: {
  shape: sql_table
  id: text {constraint: primary_key}
  purchase_order: "relation purchase_orders" {constraint: foreign_key}
  product: "relation products" {constraint: foreign_key}
  quantity: number
  unit_cost: number
  date_received: date
  posted_to_inventory: bool
}

inventory_transactions: {
  shape: sql_table
  id: text {constraint: primary_key}
  transaction_type: "select: purchased|sold|on_hold|waiting"
  transaction_date: date
  product: "relation products" {constraint: foreign_key}
  quantity: "number (signed)"
  related_order: "relation orders (optional)" {constraint: foreign_key}
  related_purchase_order: "relation purchase_orders (optional)" {constraint: foreign_key}
  comments: text
}

users: {
  shape: sql_table
  id: text {constraint: primary_key}
  email: email
  password: hidden
}

employees.user -> users.id
products.category -> product_categories.id
products.supplier -> companies.id
orders.customer -> companies.id
orders.shipper -> companies.id
orders.employee -> employees.id
order_details.order -> orders.id
order_details.product -> products.id
purchase_orders.supplier -> companies.id
purchase_orders.created_by -> employees.id
purchase_orders.approved_by -> employees.id
purchase_order_details.purchase_order -> purchase_orders.id
purchase_order_details.product -> products.id
inventory_transactions.product -> products.id
inventory_transactions.related_order -> orders.id
inventory_transactions.related_purchase_order -> purchase_orders.id
```

## 3. Collections

### 3.1 `companies`
Unified directory of customers, suppliers, and shippers (Northwind 2.0 "Companies"). A company may hold several types at once (deliberate relaxation of the Access one-type rule — see notes decision #2). Contact persons are a single embedded contact for v1 (the Access `Contacts` child table is deferred).

| Field | Type | Req | Default | Relation | Description | Example |
|---|---|---|---|---|---|---|
| company_type | select multi (customer, supplier, shipper) | yes | — | — | Roles this company plays; ≥ 1 value. Guarded by hook: a type in use cannot be removed (BR-C1) | `["customer","supplier"]` |
| company_name | text | yes | — | — | Legal/trading name, unique | `Proseware, Inc.` |
| contact_name | text | no | — | — | Primary contact person | `Somchai Rattanakorn` |
| email | email | no | — | — | Primary email | `orders@proseware.example` |
| phone | text | no | — | — | Primary phone, free format | `+66 2 123 4567` |
| address | text | no | — | — | Street address line | `123 Sukhumvit Rd.` |
| city | text | no | — | — | City | `Bangkok` |
| state_province | text | no | — | — | State / province | `Krung Thep` |
| postal_code | text | no | — | — | Postal code | `10110` |
| country | text | no | — | — | Country name | `Thailand` |
| tax_id | text | no | — | — | Tax registration number | `0105551234567` |
| website | url | no | — | — | Company website | `https://proseware.example` |
| notes | text | no | — | — | Free-form remarks | `Prefers Friday deliveries` |

### 3.2 `employees`
Staff records; the app's role source. Optionally linked to a PocketBase auth user (link required for anyone who logs in).

| Field | Type | Req | Default | Relation | Description | Example |
|---|---|---|---|---|---|---|
| user | relation (single) | no | — | `users` (auth) | Login identity; unique when set. Employees without a user cannot log in | `k3f9s...` |
| first_name | text | yes | — | — | Given name (required per template rule) | `Karen` |
| last_name | text | yes | — | — | Family name (required) | `Finster` |
| title | text | no | — | — | Courtesy title (was Titles lookup) | `Ms.` |
| email | email | no | — | — | Work email | `karen@northwind.example` |
| phone | text | no | — | — | Work phone | `+66 81 234 5678` |
| job_title | text | yes | — | — | Position name (required per template rule) | `Sales Representative` |
| role | select (sales, purchasing, warehouse, manager, admin) | yes | `sales` | — | App role driving API rules and UI. manager/admin carry PO-approval privilege | `sales` |
| active | bool | yes | `true` | — | Inactive employees are hidden from pickers and denied login (replaces delete, FR-EMP-3) | `true` |

### 3.3 `product_categories`

| Field | Type | Req | Default | Relation | Description | Example |
|---|---|---|---|---|---|---|
| category_name | text | yes | — | — | Category name, unique | `Beverages` |
| description | text | no | — | — | Short description | `Coffee, tea, juice` |
| image | file (single, image) | no | — | — | Category image (was Attachment) | `beverages.jpg` |

### 3.4 `products`

| Field | Type | Req | Default | Relation | Description | Example |
|---|---|---|---|---|---|---|
| product_code | text | yes | — | — | Internal SKU, unique | `NWTB-1` |
| product_name | text | yes | — | — | Catalog name | `Chai Tea` |
| description | text | no | — | — | Long description | `Black tea blend, 10 boxes` |
| category | relation (single) | yes | — | `product_categories` | Category | `Beverages` |
| supplier | relation (single) | yes | — | `companies` | Supplying company; must have type `supplier` (hook-checked). Single supplier in v1 (decision #8) | `Exotic Liquids` |
| list_price | number | yes | `0` | — | Selling price per unit; snapshotted to order lines | `18.00` |
| standard_cost | number | yes | `0` | — | Default purchase cost; snapshotted to PO lines | `13.50` |
| reorder_level | number | yes | `0` | — | When available-to-sell drops below this, restock is suggested (BR-P5) | `50` |
| target_level | number | yes | `0` | — | Stock level a reorder should restore (suggested PO qty = target − available) | `100` |
| quantity_per_unit | text | no | — | — | Packaging description | `10 boxes x 20 bags` |
| discontinued | bool | yes | `false` | — | Excluded from new order lines (BR-O8); kept for history | `false` |
| image | file (single, image) | no | — | — | Product photo | `chai.jpg` |

### 3.5 `orders`
Sales order header. Totals (subtotal + taxes + shipping_fee) are computed client/report-side from lines; not stored.

| Field | Type | Req | Default | Relation | Description | Example |
|---|---|---|---|---|---|---|
| order_number | text | yes | hook-generated | — | Human-readable unique number `SO-YYYY-NNNN` (decision #9) | `SO-2026-0042` |
| customer | relation (single) | yes | — | `companies` | Buyer; must have type `customer` | `Adatum Corporation` |
| employee | relation (single) | yes | current user's employee | `employees` | Salesperson who took the order | `Karen Finster` |
| shipper | relation (single) | no | — | `companies` | Carrier; must have type `shipper`; required before shipping (BR-O3) | `Shipping Alliance` |
| order_date | date | yes | today | — | When the order was taken | `2026-07-08` |
| invoice_date | date | no | — | — | Set by Invoice action; ≥ order_date (BR-O7) | `2026-07-09` |
| shipped_date | date | no | — | — | Set by Ship action; ≥ invoice_date | `2026-07-10` |
| paid_date | date | no | — | — | When payment was received (informational) | `2026-07-20` |
| status | select (new, invoiced, shipped, closed, cancelled) | yes | `new` | — | Workflow state; transitions per §5.1, hook-enforced | `new` |
| ship_name | text | no | copied from customer | — | Deliver-to name | `Adatum Warehouse` |
| ship_address | text | no | — | — | Deliver-to street | `99 Rama IV Rd.` |
| ship_city | text | no | — | — | Deliver-to city | `Bangkok` |
| ship_postal_code | text | no | — | — | Deliver-to postal code | `10500` |
| ship_country | text | no | — | — | Deliver-to country | `Thailand` |
| shipping_fee | number | no | `0` | — | Carrier fee added to total; must be set before shipping | `120.00` |
| taxes | number | no | `0` | — | Tax amount snapshot at invoicing (decision #10) | `86.10` |
| payment_method | select (cash, card, transfer, check) | no | — | — | How the customer paid | `transfer` |
| notes | text | no | — | — | Remarks | `Call before delivery` |

### 3.6 `order_details`
One line per product on an order. Line total = `quantity × unit_price × (1 − discount)`.

| Field | Type | Req | Default | Relation | Description | Example |
|---|---|---|---|---|---|---|
| order | relation (single) | yes | — | `orders` | Parent order; cascade delete with parent (only legal pre-shipment) | `SO-2026-0042` |
| product | relation (single) | yes | — | `products` | Product sold; must not be discontinued at entry | `Chai Tea` |
| quantity | number | yes | `1` | — | Units ordered; integer ≥ 1 | `10` |
| unit_price | number | yes | product.list_price | — | Price snapshot at entry (BR-O6) | `18.00` |
| discount | number | yes | `0` | — | Fraction 0–1 applied to the line | `0.05` |
| status | select (none, allocated, invoiced, shipped, on_order, no_stock) | yes | `none` | — | Line fulfillment state; set by hooks per §5.2, never typed by users | `allocated` |
| date_allocated | date | no | — | — | When stock was reserved for this line | `2026-07-08` |

### 3.7 `purchase_orders`
Restocking document sent to a supplier.

| Field | Type | Req | Default | Relation | Description | Example |
|---|---|---|---|---|---|---|
| po_number | text | yes | hook-generated | — | Unique `PO-YYYY-NNNN` | `PO-2026-0017` |
| supplier | relation (single) | yes | — | `companies` | Supplier; must have type `supplier` | `Exotic Liquids` |
| created_by | relation (single) | yes | current user's employee | `employees` | Creator (purchasing) | `Andrew Cencini` |
| submitted_date | date | no | — | — | Set by Submit action | `2026-07-08` |
| approved_by | relation (single) | no | — | `employees` | Approver; must hold manager/admin role (BR-P2); set by Approve action | `Mgr. Suda` |
| approved_date | date | no | — | — | Set by Approve action; ≥ submitted_date | `2026-07-09` |
| status | select (new, submitted, approved, closed, cancelled) | yes | `new` | — | Workflow state per §5.3; "received" is recorded on lines (date_received) and closing the PO | `approved` |
| expected_date | date | no | — | — | Supplier's promised delivery date (feeds FR-RPT-4) | `2026-07-15` |
| shipping_fee | number | no | `0` | — | Inbound freight | `300.00` |
| taxes | number | no | `0` | — | Tax amount on the PO | `210.00` |
| payment_amount | number | no | — | — | Amount paid to supplier | `3210.00` |
| payment_date | date | no | — | — | When paid | `2026-08-01` |
| payment_method | select (cash, card, transfer, check) | no | — | — | How paid | `transfer` |
| notes | text | no | — | — | Remarks | `Split delivery OK` |

### 3.8 `purchase_order_details`

| Field | Type | Req | Default | Relation | Description | Example |
|---|---|---|---|---|---|---|
| purchase_order | relation (single) | yes | — | `purchase_orders` | Parent PO | `PO-2026-0017` |
| product | relation (single) | yes | — | `products` | Product ordered | `Chai Tea` |
| quantity | number | yes | target−available | — | Units ordered; default suggested to restore target level (BR-P3); integer ≥ 1 | `100` |
| unit_cost | number | yes | product.standard_cost | — | Cost snapshot at entry | `13.50` |
| date_received | date | no | — | — | Set when the line is received; enables posting | `2026-07-15` |
| posted_to_inventory | bool | yes | `false` | — | True once the receiving hook has written the `purchased` transaction; posted lines are immutable | `false` |

### 3.9 `inventory_transactions`
Append-only stock ledger; the single source of truth for quantities (decision #7). **No update or delete via API** (rules `null`).

| Field | Type | Req | Default | Relation | Description | Example |
|---|---|---|---|---|---|---|
| transaction_type | select (purchased, sold, on_hold, waiting) | yes | — | — | See semantics below | `purchased` |
| transaction_date | date | yes | now | — | When the movement happened | `2026-07-15` |
| product | relation (single) | yes | — | `products` | Product moved | `Chai Tea` |
| quantity | number | yes | — | — | **Signed convention below**; never 0 | `+100` |
| related_order | relation (single) | no | — | `orders` | Source sales order (sold / on_hold / waiting) | `SO-2026-0042` |
| related_purchase_order | relation (single) | no | — | `purchase_orders` | Source PO (purchased) | `PO-2026-0017` |
| comments | text | no | — | — | Mandatory for manual adjustments (BR-I4) | `Stock count correction` |

**Type semantics & signed-quantity convention.** `quantity` is signed so on-hand is a plain SUM:

| transaction_type | Meaning | Sign | Written by |
|---|---|---|---|
| purchased | Goods received on a PO, or a positive manual adjustment | **+** | PO receive hook / adjustment form |
| sold | Order invoiced (stock leaves), or a negative manual adjustment | **−** | Order invoice hook / adjustment form |
| on_hold | Stock reserved for an allocated order line (and its release: a matching + entry when allocation is freed) | − (reserve) / + (release) | Line allocation hook |
| waiting | Demand recorded for a no-stock line; zero stock effect, kept for restock reporting | 0-effect: excluded from on-hand sums | Line save hook |

### 3.10 On-hand derivation (the query)

Physical on hand (Allen Browne formula with the ledger as sole source — no stock-take baseline needed):

```sql
-- on hand: everything physically on the shelf (allocated stock still counts)
SELECT product, SUM(quantity) AS on_hand
FROM inventory_transactions
WHERE transaction_type IN ('purchased', 'sold')
GROUP BY product;

-- available to sell: on hand minus active reservations
SELECT product, SUM(quantity) AS available_to_sell
FROM inventory_transactions
WHERE transaction_type IN ('purchased', 'sold', 'on_hold')
GROUP BY product;

-- on order: quantity on approved, not-yet-received PO lines
SELECT pod.product, SUM(pod.quantity) AS on_order
FROM purchase_order_details pod
JOIN purchase_orders po ON po.id = pod.purchase_order
WHERE po.status = 'approved' AND pod.posted_to_inventory = 0
GROUP BY pod.product;
```

Via the PocketBase API the same numbers come from filtered list queries summed client-side or from a small custom route in `pb_hooks`; the low-stock flag is `available_to_sell < reorder_level`.

### 3.11 Derived analytics values (dashboard FR-DASH-1..6, companies FR-COM-5 — added 2026-07-08)

All values below are **derived, never stored**, and are computed client-side by aggregating `order_details` / `purchase_order_details` (expanded with their parent document, product, category, and company) fetched in batched list requests of ≤ 500 rows. Status filters follow BR-R1/BR-R2.

| Value | Formula | Statuses that count |
|---|---|---|
| Line revenue | `quantity × unit_price × (1 − discount)` per `order_details` row | parent order `invoiced`, `shipped`, `closed` (BR-R1) |
| Line cost | `quantity × unit_cost` per `purchase_order_details` row | parent PO `approved`, `closed` (BR-R2) |
| Inventory value per category | `Σ over products in category ( on_hand(product) × standard_cost )`, on_hand from the ledger sum in §3.10 | ledger types `purchased`, `sold` |
| Inventory quantity per category | `Σ over products in category ( on_hand(product) )` | ledger types `purchased`, `sold` |
| Monthly order count / value (6 mo) | count of orders per calendar month; value = Σ line revenue of those orders | orders `invoiced`/`shipped`/`closed` (BR-R1) |
| Monthly PO count / value (6 mo) | count of POs per calendar month; value = Σ line cost of those POs | POs `approved`/`closed` (BR-R2) |
| Product / category sales rank | Σ line revenue grouped by product, or rolled up product → category; quantity = Σ line quantity | BR-R1 statuses |
| Lifetime customer value | Σ line revenue of **all** the company's orders since the beginning (no date filter) | orders `invoiced`/`shipped`/`closed` (BR-R1) |
| Lifetime supplier spend | Σ line cost of **all** POs on the company since the beginning (no date filter) | POs `approved`/`closed` (BR-R2) |
| Total purchased (companies list) | lifetime customer value + lifetime supplier spend (companies holding both types show the sum; company detail shows the two figures separately) | as above |

Money results follow the 2-decimal money convention in §1; ranks truncate to top 5 / top 10 as required by the consuming chart.

## 4. Business-rule constraints at data level
- Stock on hand is derived (queries above); hooks reject any transaction batch that would make on-hand negative (BR-I1).
- Status enums and their legal transitions (§5) are enforced in `pb_hooks` on update; the status fields are never directly editable in the UI (buttons only).
- Snapshots: `order_details.unit_price`, `purchase_order_details.unit_cost`, `orders.taxes` copy values at entry time and are never recomputed from the catalog.
- Referential guards: companies with orders/POs cannot be deleted (BR-C2); `inventory_transactions` and posted PO lines have delete rule `null`.
- PocketBase API rules per collection (summary; full strategy in docs/02 §5): all business collections list/view for any authenticated user; create/update per role — companies (sales, purchasing, manager, admin), products & categories (purchasing, manager, admin / manager, admin), orders + order_details (sales, manager, admin), purchase_orders + details (purchasing, manager, admin), inventory_transactions create (warehouse, manager, admin; plus hooks), employees (admin; self-view allowed), delete rules narrowest per module.

## 5. Status transition tables

### 5.1 `orders.status`

| From \ To | new | invoiced | shipped | closed | cancelled |
|---|---|---|---|---|---|
| **new** | — | ✔ all lines `allocated` (BR-O2); sets invoice_date; writes `sold` + releases `on_hold` | ✘ | ✘ | ✔ frees allocations |
| **invoiced** | ✘ | — | ✔ requires shipper + shipping_fee (BR-O3); sets shipped_date | ✘ | ✔ reverses `sold` via compensating entries |
| **shipped** | ✘ | ✘ | — | ✔ | ✘ (BR-O5) |
| **closed** | ✘ | ✘ | ✘ | — | ✘ |
| **cancelled** | ✘ | ✘ | ✘ | ✘ | — |

Roles: invoice/ship/close/cancel — sales, manager, admin.

### 5.2 `order_details.status` (hook-managed, oldest-first reallocation)

| From \ To | allocated | on_order | no_stock | invoiced | shipped |
|---|---|---|---|---|---|
| **none** (just saved) | ✔ stock available (writes `on_hold` −, `waiting` if partial flow) | ✔ approved PO covers it | ✔ nothing available | ✘ | ✘ |
| **no_stock** | ✔ on PO receipt / freed allocation | ✔ covering PO approved | — | ✘ | ✘ |
| **on_order** | ✔ on PO receipt (ReallocateInventory equivalent) | — | ✔ covering PO cancelled | ✘ | ✘ |
| **allocated** | — | ✘ | ✔ allocation freed (line edit while order still new) | ✔ order invoiced | ✘ |
| **invoiced** | ✘ | ✘ | ✘ | — | ✔ order shipped |

### 5.3 `purchase_orders.status`

| From \ To | new | submitted | approved | closed | cancelled |
|---|---|---|---|---|---|
| **new** (draft) | — | ✔ purchasing+; sets submitted_date | ✘ | ✘ | ✔ |
| **submitted** | ✘ | — | ✔ manager/admin only (BR-P2); sets approved_by/date | ✘ | ✔ |
| **approved** | ✘ | ✘ | — (receiving happens here: lines get date_received, `purchased` posted, reallocation runs — BR-P4) | ✔ all lines posted_to_inventory | ✔ only if nothing received yet |
| **closed** | ✘ | ✘ | ✘ | — | ✘ |
| **cancelled** | ✘ | ✘ | ✘ | ✘ | — |

## 6. Seed & sample data policy
Seed data is adapted from the legacy Northwind dataset (northwind-pubs on GitHub, MIT; any file used is logged in `asset.md`): ~10 companies of each type, the classic product categories and a subset of products with prices/levels, 5 employees covering all roles, and a handful of orders/POs in assorted statuses so every workflow state appears in demos. Names/addresses are localized examples (Thai/English mix) rather than the 1990s US data; product and category images come from free sources logged in `asset.md`. Seeds live in `backend/seed/` and are idempotent.

## สรุปภาษาไทย

พจนานุกรมข้อมูลนี้กำหนด 9 collections ของ PocketBase สำหรับ Northwind เวอร์ชันเว็บ ได้แก่ companies (ประเภทเลือกได้หลายแบบ), employees (ผูก auth user + role), product_categories, products (ราคา ต้นทุน จุดสั่งซื้อ), orders + order_details (สถานะเอกสารและสถานะรายบรรทัด), purchase_orders + purchase_order_details (วงจรอนุมัติและรับของ) และ inventory_transactions (บัญชีเคลื่อนไหวแบบ append-only ใช้เครื่องหมายบวก/ลบ) ทุกฟิลด์ระบุชนิด ค่าบังคับ ค่าเริ่มต้น ความสัมพันธ์ คำอธิบาย และตัวอย่าง พร้อมสูตรคำนวณสต๊อกคงเหลือจาก ledger ตารางการเปลี่ยนสถานะที่อนุญาต และ ERD เป็นไฟล์ D2 (`docs/diagrams/erd.d2`)

ฉบับปรับปรุง 2026-07-08: เพิ่ม §3.11 สูตรค่าที่คำนวณได้สำหรับ Analytics ได้แก่ รายได้ต่อบรรทัด = quantity × unit_price × (1 − discount), มูลค่าสต๊อกต่อหมวด = Σ(on-hand ของสินค้า × standard_cost), มูลค่าตลอดอายุของลูกค้า (นับเฉพาะออเดอร์ invoiced/shipped/closed ตาม BR-R1) และยอดซื้อจากซัพพลายเออร์ (นับเฉพาะ PO approved/closed ตาม BR-R2) ทั้งหมดคำนวณฝั่ง client จากการดึงข้อมูลเป็นชุดละไม่เกิน 500 แถว ไม่มีการเก็บค่าลงฐานข้อมูล
