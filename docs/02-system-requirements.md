# System Requirements Specification (SRS)

> **Audience:** System Analyst · **Status:** outline (Phase 1, Cycle 1.1) · **Owner:** —

## 1. System overview
Single-server web application: PocketBase (SQLite) backend exposing REST API + server-side hooks; React SPA frontend; Nginx reverse proxy with TLS.

## 2. Architecture
- [ ] Component diagram (Mermaid): browser → Nginx → PocketBase; static SPA served by Nginx
- [ ] Data flow for auth, CRUD, file/image serving

## 3. Functional requirements (per module)
- [ ] FR-COM Companies (CRUD, type = customer/supplier/shipper, contacts)
- [ ] FR-EMP Employees (CRUD, roles, link to auth user)
- [ ] FR-PRD Products & Categories (CRUD, pricing, images)
- [ ] FR-ORD Orders (create, line items, status workflow, stock allocation)
- [ ] FR-PO Purchase Orders (create, approve, receive into inventory)
- [ ] FR-INV Inventory (transaction ledger, on-hand view, adjustments)
- [ ] FR-RPT Reports (defined set from BRD §4.6)
- [ ] FR-AUTH Authentication & roles (PocketBase email/password, role-based access rules)
- [ ] FR-I18N Language switch th/en/ja, locale-aware dates/numbers/currency

## 4. Non-functional requirements
- [ ] Responsive: 360px – 1440px breakpoints
- [ ] Light theme only; WCAG AA contrast
- [ ] Runs on 2 vCPU / 4 GB VPS; SQLite single-node
- [ ] Backup: nightly copy of pb_data
- [ ] HTTPS only (Let's Encrypt)

## 5. Integration & constraints
- [ ] PocketBase collection API rules as first authorization layer; hooks for business rules
- [ ] No external services required

## 6. Traceability
- [ ] Map each FR → BRD process → PRD feature → collection(s)

## สรุปภาษาไทย
*(เพิ่มบทสรุปเมื่อเนื้อหาเสร็จ)*
