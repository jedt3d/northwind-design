# Northwind Design — Master Plan

Modernize the Microsoft **Northwind 2.0 Developer Edition** (Access) database design into a responsive web application.

| Item | Decision |
|---|---|
| Backend | PocketBase (SQLite) — collections, auth, REST API, server-side hooks |
| Frontend | React (Vite) + plain CSS, PocketBase JS SDK |
| Auth | PocketBase built-in email/password (simple) |
| Languages (UI) | Thai, English, Japanese (i18n from day one) |
| Design | Stable, calm, clean; **light theme only**; responsive (mobile + desktop) |
| Docs language | English, with a Thai summary (สรุปภาษาไทย) per article |
| Repo | git@github.com:jedt3d/northwind-design.git |
| Deployment | DigitalOcean VPS (Ubuntu 24.04), Nginx reverse proxy → https://northwind.raawww.com |

## Reference material

- Overview: https://support.microsoft.com/en-US/Access/northwind-2-0-developer-edition
- Module articles: Template Tutorial, Things You Should Know, Companies, Employees, Orders, Product Categories, Products, Inventory, Purchase Orders, Reports
- Legacy SQL: https://github.com/microsoft/sql-server-samples/tree/master/samples/databases/northwind-pubs

## Business modules (scope)

1. **Companies** — unified customers + suppliers (shippers as company type)
2. **Employees** — staff records, roles, login identity
3. **Orders** — sales orders, order details, order status workflow
4. **Products & Product Categories** — catalog
5. **Inventory** — stock transactions (purchase, sale, adjustment), on-hand calculation
6. **Purchase Orders** — restocking from suppliers, approval workflow
7. **Reports** — sales, inventory, and operational reports

---

# Phase 1 — Analysis & Design (documentation first)

Goal: every deliverable a BA, SA, PM, DBA, and designer needs — before any code.

## Cycle 1.1 — Knowledge capture & requirements

| # | Deliverable | File | Audience |
|---|---|---|---|
| 1 | Northwind 2.0 study notes (per-module: entities, rules, workflows) | `reference/northwind-notes.md` | team |
| 2 | Business Requirements Document (BRD) | `docs/01-business-requirements.md` | Business Analyst |
| 3 | System Requirements Specification (SRS) | `docs/02-system-requirements.md` | System Analyst |
| 4 | Data Dictionary & DB description guideline | `docs/04-data-dictionary.md` | DBA |
| 5 | ERD (Mermaid) of the modernized schema | inside data dictionary | DBA / SA |

Definition of done: all business rules from the Microsoft articles captured per module; every entity, field, type, and relationship documented; ERD renders; Thai summary in each doc.

## Cycle 1.2 — Product & UX design

| # | Deliverable | File | Audience |
|---|---|---|---|
| 0 | **LOB UI-pattern research** (search, sorting, data tables, master–detail & forms) — prerequisite for items 2–4 | `docs/09-lob-ui-patterns.md` | designer / dev |
| 1 | PRD of the final web app (features, user stories, acceptance criteria) | `docs/03-prd.md` | PM / all |
| 2 | Wireframes — low-fi sketches, mobile + desktop, every screen | `docs/07-wireframes/` (SVG/HTML) | designer / dev |
| 3 | UX design document (flows, navigation, states, validation UX, i18n UX) | `docs/05-ux-design.md` | designer / dev |
| 4 | Design system (tokens, type scale for th/en/ja, components, light theme) | `docs/06-design-system.md` + `design/` | designer / dev |

Definition of done: UI-pattern research concluded with one documented convention per pattern, applied consistently in all wireframes and component specs; every PRD feature has at least one wireframe; wireframes stay minimum-graphic (sketch level); design system covers color, spacing, typography (Thai/Latin/Japanese font stacks), and core components; all three parties' requirements (BA/SA/UX) cross-referenced without conflicts.

**Phase 1 exit gate:** documents reviewed and approved → tag `v0.1-design`.

---

# Phase 2 — Build & Deploy

Goal: working app matching Phase 1 docs, deployed at https://northwind.raawww.com.

## Cycle 2.1 — Backend + foundations

| # | Work item | Location |
|---|---|---|
| 1 | PocketBase setup, collections per data dictionary (migrations as JS) | `backend/pb_migrations/` |
| 2 | Seed data (companies, products, categories, sample orders) | `backend/seed/` |
| 3 | Business-logic validation hooks (order status transitions, stock checks, PO approval) | `backend/pb_hooks/` |
| 4 | Shared utility library (calculations: order totals, on-hand stock, date/number/currency formatting per locale) | `shared/` |
| 5 | React scaffold: Vite, router, PocketBase client, auth pages, i18n (th/en/ja) setup | `frontend/` |
| 6 | Workflow sketches for business-logic validation (state diagrams) | `docs/08-workflows.md` |

Definition of done: all collections match data dictionary; hooks enforce documented rules with tests; login works end-to-end locally; language switch works.

## Cycle 2.2 — Frontend features + deployment

| # | Work item |
|---|---|
| 1 | Implement all module screens per wireframes + design system (Companies, Employees, Products, Categories, Orders, Inventory, Purchase Orders) |
| 2 | Reports screens (top-selling products, sales by period, stock on hand, POs outstanding) |
| 3 | Responsive pass (mobile breakpoints per wireframes) + i18n content complete |
| 4 | Deployment: PocketBase as systemd service on VPS, Nginx reverse proxy for `northwind.raawww.com`, TLS via Let's Encrypt |
| 5 | Deploy scripts + runbook (`deploy/`) |
| 6 | End-to-end verification on production URL |

Definition of done: app usable on mobile and desktop in all three languages; deployed and reachable at https://northwind.raawww.com; deploy is repeatable from `deploy/` scripts; tag `v1.0`.

---

# Working agreements

- **Git**: `main` is stable; work on `phase-1/*` and `phase-2/*` branches; conventional commits (`docs:`, `feat:`, `fix:`, `chore:`); one commit theme per commit; tag at each cycle end (`v0.1-design`, `v0.2-backend`, `v1.0`).
- **Secrets**: `env.*.txt` and any credentials are git-ignored. Never commit credentials.
- **Images/assets**: product, people, and other images come from public/free resources only. Every image used or considered is logged in `asset.md` — file name + original source URL. No unlisted assets in the repo.
- **Docs**: every article ends with a Thai summary section (สรุปภาษาไทย).
- **Tracking**: each cycle's checklist lives at the top of its primary deliverable; PLAN.md is the single source of truth for scope.

# สรุปภาษาไทย

โครงการนี้นำการออกแบบฐานข้อมูล Northwind 2.0 (Microsoft Access) มาปรับปรุงเป็นเว็บแอปสมัยใหม่ ใช้ PocketBase (SQLite) เป็น backend และ React + CSS ธรรมดาเป็น frontend รองรับ 3 ภาษา (ไทย อังกฤษ ญี่ปุ่น) ธีมสว่างเท่านั้น แบ่งงานเป็น 2 เฟส เฟสละ 2 รอบ: เฟส 1 คือการวิเคราะห์และจัดทำเอกสารทั้งหมด (BRD, SRS, PRD, Data Dictionary, Wireframe, UX, Design System) เฟส 2 คือการพัฒนา backend/frontend และ deploy ขึ้น VPS ที่ https://northwind.raawww.com ผ่าน Nginx ทุกอย่างติดตามด้วย Git บน GitHub
