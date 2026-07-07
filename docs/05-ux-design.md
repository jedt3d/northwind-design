# UX Design Document

> **Audience:** designer + developers · **Status:** complete (Phase 1, Cycle 1.2) · **Owner:** —

Purpose: how to design the software so it complies with the BA (business rules), SA (system constraints), and PRD (features) — one coherent experience.

**Prerequisite:** `docs/09-lob-ui-patterns.md` — the researched conventions for search, sorting, data tables, and master–detail/forms are binding for this document.

## 1. Design principles
Stable, calm, clean. Light theme only. Content first, low ornamentation, generous whitespace, no surprise motion. The interface should feel like a well-kept ledger: numbers and statuses are the heroes, chrome stays gray, color appears only where it carries meaning (status badges, deltas, low-stock flags).

## 2. Information architecture & navigation

The app is one authenticated shell. Desktop (≥1024 px): fixed left **sidebar** with the seven module entries plus settings, content to the right; the sidebar mirrors the modules in PLAN.md order (Dashboard, Orders, Purchase Orders, Products, Inventory, Companies, Reports, Admin, Settings). Mobile (<768 px): **bottom navigation** with the five highest-traffic destinations (Dashboard, Orders, POs, Inventory, More), "More" opening a sheet with the remaining modules. Every record has its own URL (deep-linkable, per docs/09 §4).

Per-role landing emphasis is handled by the dashboard, not separate homepages: the dashboard composes panels by role (sales → my open orders; purchasing/warehouse → low stock + POs in transit; manager → approval queue). Navigation itself is identical for all roles; entries a role cannot use (Admin for non-admins) are hidden.

**Dashboard analytics (added 2026-07-08).** Below the role panels sits an **Analytics** section, identical for every role (FR-DASH-1..6). It is a grid of six chart panels: two columns at ≥ 1024 px, stacked single-column below (mobile shows the same six panels in order). Each chart is a list of **CSS horizontal bars** — a plain div whose width is proportional to the value, styled with the design-system grays from docs/06 — always paired with its numbers (value label beside each bar, quantity in parentheses where relevant); no chart library is used. Panels: ① top 5 categories by inventory cost & quantity, ② orders vs POs monthly count + value for the last 6 months as side-by-side bars, ③ top 10 selling products (revenue, qty), ④ top 10 selling categories, ⑤ top 5 customers, ⑥ top 5 suppliers by purchase spend. A caption states the counting rules (BR-R1/BR-R2) so numbers are never ambiguous. Wireframes: `02-dashboard`.

**Companies list — Total purchased column (added 2026-07-08).** The companies table gains a right-aligned, sortable **Total purchased** currency column (2 decimals) showing lifetime value per FR-COM-5; on mobile the amount appears as the card's third line. Companies with both customer and supplier types show the summed figure here, and the company detail presents the customer-revenue and supplier-spend figures separately. Wireframes: `03-companies-list`.

Sitemap D2 source: `docs/diagrams/sitemap.d2` (embedded):

```d2
# Northwind web app — sitemap (docs/05 §2)
direction: down

login: "Login (+ language)"
app: {
  label: "Authenticated app shell\n(sidebar desktop / bottom nav mobile)"

  dashboard: "Dashboard"

  companies: {
    label: "Companies"
    list: "Companies list"
    detail: "Company detail\n(+ related orders/POs)"
    list -> detail
  }

  products: {
    label: "Products"
    list: "Products list"
    detail: "Product detail\n(+ stock levels, reorder)"
    categories: "Categories (admin)"
    list -> detail
  }

  orders: {
    label: "Orders"
    list: "Orders list"
    create: "Order create"
    detail: "Order detail\n(lines + status actions)"
    list -> create
    list -> detail
    create -> detail
  }

  pos: {
    label: "Purchase orders"
    list: "PO list"
    create: "PO create"
    detail: "PO detail\n(submit/approve/receive)"
    list -> create
    list -> detail
    create -> detail
  }

  inventory: {
    label: "Inventory"
    onhand: "On-hand view"
    transactions: "Transaction ledger"
    adjustment: "Adjustment form"
    onhand -> transactions
    onhand -> adjustment
  }

  reports: {
    label: "Reports"
    home: "Reports home"
    view: "Report view\n(sales, top products,\nstock, outstanding POs)"
    home -> view
  }

  admin: "Admin: employees & roles"
  settings: "Settings (language, profile)"
}

login -> app.dashboard: "auth ok"
app.dashboard -> app.orders.list: "orders to process"
app.dashboard -> app.pos.list: "POs to approve"
app.dashboard -> app.products.list: "low stock"
app.products.detail -> app.pos.create: "Reorder action"
app.orders.detail -> app.pos.create: "no-stock line -> create PO"
```

## 3. Key user flows

### 3.1 Login → language → dashboard
User opens the app; if a language was previously chosen it applies immediately (localStorage), otherwise browser language maps to th/en/ja with English fallback. The login card offers the language switcher so users authenticate in their language. On success the profile's language (if set) wins over localStorage, and the role-composed dashboard loads. Failure states: wrong credentials (inline error under the form), inactive employee (distinct message), server unreachable (retry banner).

### 3.2 Create sales order (incl. insufficient-stock path)
The central flow. Sales starts a new order; header defaults (me, today) mean the first meaningful act is picking the customer via the lookup picker — with "＋ New customer" opening a modal that creates the company and returns it selected (F3/FR-COM-7). Lines are added inline: choose product (searchable, discontinued excluded), enter quantity, price auto-fills. On save of each line the server assigns the line status; a **No Stock** badge comes with an inline prompt to create a PO prefilled for that product's supplier. Invoicing stays disabled (with an explanatory tooltip listing blocking lines) until every line is Allocated; then Invoice → Ship (asks for shipper + fee if missing) → Close, each via a single status button that always states what it needs.

D2 source: `docs/diagrams/flow-create-order.d2` (embedded):

```d2
# Flow: create sales order incl. insufficient-stock path (docs/05 §3.2)
direction: down

start: "Sales opens Orders -> New order"
header: "Fill header\n(customer, date=today, employee=me)"
new_customer: "Customer missing?\n+ New customer modal\n(create -> auto-select)"
add_line: "Add line:\npick product, qty\n(unit price auto-fills)"
stock_check: "Server checks available stock" {shape: diamond}
allocated: "Line status: Allocated\n(on_hold transaction written)"
on_order: "Line status: On Order\n(approved PO covers qty)"
no_stock: "Line status: No Stock\n+ prompt: Create PO?"
create_po: "Create PO (prefilled\nsupplier + suggested qty)\n-> submit -> approve -> receive"
realloc: "Receiving reallocates:\nline becomes Allocated"
more_lines: "More lines?" {shape: diamond}
save: "Save order (status: New)"
invoice_gate: "All lines Allocated?" {shape: diamond}
invoice: "Invoice action\n(sold transactions written,\ninvoice_date set)"
ship: "Ship action\n(requires shipper + fee,\nshipped_date set)"
close: "Close order"
blocked: "Invoice blocked\n(validation message)"

start -> header
header -> new_customer: "if new customer"
new_customer -> header: "back with selection"
header -> add_line
add_line -> stock_check
stock_check -> allocated: "enough free stock"
stock_check -> on_order: "covered by approved PO"
stock_check -> no_stock: "not available"
no_stock -> create_po: "user accepts prompt"
create_po -> realloc
realloc -> invoice_gate
allocated -> more_lines
on_order -> more_lines
no_stock -> more_lines: "decide later"
more_lines -> add_line: "yes"
more_lines -> save: "no"
save -> invoice_gate
invoice_gate -> invoice: "yes"
invoice_gate -> blocked: "no (No Stock / On Order line)"
blocked -> create_po
invoice -> ship
ship -> close
```

### 3.3 Approve & receive purchase order
Purchasing opens a submitted PO (often straight from the manager's dashboard approval panel). A manager/admin sees the **Approve** button; others see the status only — the affordance itself encodes the privilege (BR-P2). After approval, warehouse opens the PO (mobile-first screen): each line shows ordered quantity and a receive control; confirming **Receive** stamps dates, posts *purchased* transactions, and triggers reallocation — the confirmation toast reports "3 waiting order lines allocated" so the effect is visible. When all lines are posted, **Close** becomes available.

### 3.4 Inventory adjustment
Warehouse finds the product from the on-hand view (search or scan-eyes on the low-stock filter), taps **Adjust**, enters a signed quantity and a mandatory reason comment, and confirms in a dialog that shows before → after on-hand. An adjustment that would go negative is rejected inline with the current on-hand shown. The new ledger row appears immediately in the transactions list.

### 3.5 Run a report
Reports home lists the four reports as cards. Opening one shows its filter bar (date range defaulting to last 3 months, plus group-by where relevant), a chart where the report has one, and always the numbers table underneath (docs/06 §0 chart+table pairing). Changing filters re-queries in place; an empty result shows the empty state, never a blank chart.

## 4. Common LOB interaction patterns (from docs/09-lob-ui-patterns.md)
- **Search:** every list toolbar has the per-list instant filter (300 ms debounce, key fields + related names); full-width above the list on mobile.
- **Sorting:** single-column header sort, asc/desc cycle, per-module defaults (orders/POs newest first, catalogs A–Z); sort dropdown on mobile cards.
- **Data tables:** 20/page pagination (Load more on mobile cards), right-aligned numbers, whole row clickable, dropdown filters combining with search + sort.
- **Master–detail & forms:** list → full detail page; parent + inline line editor on one page; single-page forms with explicit Save and unsaved-changes guard; searchable-select lookup pickers, "＋ New customer" modal in the order form.

## 5. Screen states

Every screen defines four states; components come from docs/06:
- **Loading:** skeleton rows (lists) or skeleton blocks (detail); no spinners longer than 300 ms without skeleton.
- **Empty:** icon + one-line explanation + primary action ("No orders yet — New order"); filtered-empty is distinct ("No results for 'chai' — clear filters").
- **Error:** inline banner with a retry button; never a blank screen; API error text mapped to the user's language.
- **Success/feedback:** toast for saves and status changes (auto-dismiss 4 s); destructive/irreversible actions (cancel order, receive PO) confirm first with consequences stated.

Form validation UX: validate on blur, re-validate on change after first error; errors inline under fields in red text with the field outlined; server-side hook rejections map to the same inline slots (field-level when the API names a field, form-level banner otherwise). Status-action preconditions surface *before* the click via disabled buttons with reason tooltips, and *after* (defense in depth) via the mapped server message.

## 6. Compliance mapping

**BRD rule → UX enforcement**

| BRD rule | UX enforcement |
|---|---|
| BR-O1/P1 status transitions | Only legal next-step buttons rendered per state and role; server rejection mapped to banner |
| BR-O2 invoice needs all-allocated | Invoice button disabled with tooltip listing blocking lines; line badges show why |
| BR-O3 ship needs shipper + fee | Ship action opens a mini-form requiring both before confirm |
| BR-O4 lines frozen after New | Line editor renders read-only rows + hidden add-row past New |
| BR-O5 delete only unshipped | Delete/Cancel hidden from Shipped/Closed orders |
| BR-O7 date ordering | Date pickers constrain ranges; server message maps to the date field |
| BR-O8 no discontinued products | Discontinued items excluded from product picker |
| BR-C1/C2 company guards | Type checkboxes disabled when in use (tooltip); delete replaced by explanatory dialog |
| BR-I1/I2 no negative stock | Adjustment preview shows before→after; no-stock lines get the PO prompt instead of an error dead-end |
| BR-I4 immutable ledger | Transactions list has no edit/delete affordances at all |
| BR-P2 approval privilege | Approve button visible only to manager/admin |
| BR-P3/P5 reorder suggestions | Reorder action prefills supplier + qty (target − available); dashboard low-stock panel links here |

**SRS NFR → UX decision**

| NFR | UX decision |
|---|---|
| NFR-1 responsive 360–1440 | Breakpoints 360/768/1024/1440; tables→cards <768; bottom nav on mobile; warehouse flows designed mobile-first |
| NFR-2 AA contrast, light theme | Tokens in docs/06 AA-checked incl. darkened badge text; focus rings on all interactive elements |
| NFR-3 pagination ≤20 | Lists request 20/page; Load more on mobile |
| NFR-4 perceived speed | Skeletons, debounced search, optimistic toast after server confirm only (no fake optimism on status actions) |
| NFR-6 HTTPS/auth | Session expiry redirects to login with a "signed out" note, returning to the same URL after re-auth |

## 7. i18n UX
- **Switcher placement:** globe control in the top bar (all screens incl. login) and in Settings; changing language applies instantly without reload.
- **Persistence:** localStorage for pre-login and guests of the device; the employee profile stores the choice authoritatively and syncs on login (localStorage updated to match).
- **Text expansion:** Thai and Japanese labels run longer/taller — buttons and nav items size to content with min-heights, never fixed widths; line-height 1.6 for th (stacked vowels/tone marks), 1.5 ja/en (docs/06 §2).
- **Locale formats:** dates stored ISO 8601, displayed via `Intl` per locale (7 ก.ค. 2569 is **not** used — see next point), numbers and currency via `Intl.NumberFormat`.
- **Calendar decision:** **no Buddhist calendar in v1** — all locales display Gregorian/ISO dates with locale formatting (Thai month names, but CE years). Rationale: mixed-era data entry is a major error source; revisit post-v1 if Thai users request display-only BE.

## 8. Accessibility
- Full keyboard operability: logical tab order, visible focus ring (docs/06 token), Enter submits forms, Esc closes modals/pickers.
- Every input has a programmatic label; status badges pair color with text (never color alone); icons carry aria-labels.
- Tables use proper `<th>` scope; card lists are lists semantically; toasts are `aria-live=polite`, blocking errors `role=alert`.
- Contrast per WCAG 2.1 AA using the darkened badge-text tokens from docs/06 §1; touch targets ≥ 44 px on mobile screens.
- Motion respects `prefers-reduced-motion` (fades only, no slides).

## สรุปภาษาไทย

เอกสาร UX นี้กำหนดโครงสร้างการนำทาง (sidebar บนเดสก์ท็อป / bottom nav บนมือถือ) แผนผังหน้าจอทั้งหมด และ 5 โฟลว์หลักโดยละเอียด ฉบับปรับปรุง 2026-07-08 เพิ่มส่วน Analytics บนแดชบอร์ด (กริด 2 คอลัมน์ที่ ≥1024px และเรียงซ้อนบนมือถือ กราฟเป็นแท่งแนวนอน CSS คู่กับตัวเลขเสมอ ไม่ใช้ไลบรารีกราฟ มองเห็นได้ทุกบทบาท) และคอลัมน์ "Total purchased" ในตารางบริษัท (ชิดขวา เรียงลำดับได้ ทศนิยม 2 ตำแหน่ง บนมือถือแสดงเป็นบรรทัดที่สามของการ์ด) ได้แก่ ล็อกอินเลือกภาษา สร้างใบสั่งขายรวมเส้นทางสต๊อกไม่พอ (มีแผนภาพ D2) อนุมัติ-รับของใบสั่งซื้อ ปรับปรุงสต๊อก และดูรายงาน ทุกหน้าจอต้องนิยามสถานะ loading/empty/error/success พร้อมแนวทาง validation แบบ inline มีตารางเชื่อมโยงกฎธุรกิจ (BRD) และข้อกำหนดระบบ (NFR) กับวิธีบังคับใช้ใน UI ด้าน i18n ใช้ตัวสลับภาษาที่ top bar และหน้า Settings บันทึกไว้ใน localStorage และโปรไฟล์ผู้ใช้ โดย v1 ไม่แสดงปีพุทธศักราช และมีข้อผูกพันด้าน accessibility ตาม WCAG AA
