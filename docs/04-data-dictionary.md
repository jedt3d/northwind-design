# Data Dictionary & Database Description Guideline

> **Audience:** Database Administrator · **Status:** outline (Phase 1, Cycle 1.1) · **Owner:** —

## 1. Conventions (guideline for describing the DB)
- Collection names: `snake_case`, plural (`companies`, `order_details`)
- Every field documented as: name · type · required · default · relation · description · example
- PocketBase system fields (`id`, `created`, `updated`) assumed on every collection
- Enum values listed with meaning and allowed transitions where applicable

## 2. ERD (modernized from Northwind 2.0)
- [ ] Mermaid `erDiagram` covering all collections below

## 3. Collections (to be fully specified)
| Collection | Source (Northwind 2.0) | Notes |
|---|---|---|
| `companies` | Companies | unified customers/suppliers/shippers via `company_type` |
| `contacts` | Companies | optional: contact persons per company |
| `employees` | Employees | linked to PocketBase auth users |
| `product_categories` | Product Categories | |
| `products` | Products | category relation, list price, reorder level, image |
| `orders` | Orders | customer, employee, shipper, status, dates |
| `order_details` | Orders | product, qty, unit price, line status |
| `order_status` / enums | Orders | prefer enum fields over lookup tables where stable |
| `purchase_orders` | Purchase Orders | supplier, status, approver, dates |
| `purchase_order_details` | Purchase Orders | product, qty, unit cost |
| `inventory_transactions` | Inventory | type: purchase/sale/adjustment; qty; refs to order/PO |

## 4. Business-rule constraints at data level
- [ ] Stock on hand = derived from `inventory_transactions` (document the query)
- [ ] Status enums + legal transitions per collection
- [ ] PocketBase API rules per collection (who can list/view/create/update/delete)

## 5. Seed & sample data policy
- [ ] Adapted from legacy Northwind data (northwind-pubs GitHub)

## สรุปภาษาไทย
*(เพิ่มบทสรุปเมื่อเนื้อหาเสร็จ)*
