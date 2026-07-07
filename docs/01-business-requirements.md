# Business Requirements Document (BRD)

> **Audience:** Business Analyst · **Status:** outline (Phase 1, Cycle 1.1) · **Owner:** —

## 1. Background
Northwind Traders is a specialty food trading company: it buys products from supplier companies, holds inventory, and sells to customer companies through sales orders processed by employees.

## 2. Business objectives
- [ ] Replace the Access-only Northwind 2.0 with a web app usable on any device
- [ ] Preserve the proven business model (companies, orders, inventory, purchasing)
- [ ] Support staff working in Thai, English, and Japanese

## 3. Stakeholders & roles
| Role | Interest |
|---|---|
| Sales staff | create/manage orders |
| Purchasing staff | create/approve purchase orders |
| Warehouse staff | receive stock, adjust inventory |
| Manager | approvals, reports |
| Administrator | users, master data |

## 4. Business processes (to be detailed per Northwind 2.0 articles)
- [ ] 4.1 Customer & supplier management (Companies)
- [ ] 4.2 Product catalog & categories
- [ ] 4.3 Sales order lifecycle (new → invoiced → shipped → closed; allocation of stock)
- [ ] 4.4 Purchasing lifecycle (draft → submitted → approved → received; auto-restock triggers)
- [ ] 4.5 Inventory transactions (purchase in, sale out, adjustment)
- [ ] 4.6 Reporting needs

## 5. Business rules (capture from reference/northwind-notes.md)
- [ ] Order status transitions and who may perform them
- [ ] Stock cannot go negative; ordering more than on-hand triggers restock flow
- [ ] PO approval thresholds
- [ ] Pricing: list price vs order-line price

## 6. Success criteria
- [ ] All current Northwind 2.0 workflows achievable in the web app
- [ ] Mobile-usable by warehouse staff

## สรุปภาษาไทย
*(เพิ่มบทสรุปเมื่อเนื้อหาเสร็จ)*
