# Northwind Design

Modernizing the Microsoft **Northwind 2.0 Developer Edition** database design into a responsive web app.

- Backend: PocketBase (SQLite)
- Frontend: React (Vite) + plain CSS, i18n: Thai / English / Japanese
- Design: calm, clean, light theme only
- Production: https://northwind.raawww.com (DigitalOcean VPS, Nginx reverse proxy)

## Start here

**[PLAN.md](PLAN.md)** — master plan: 2 phases × 2 cycles, deliverables, definitions of done.

## Repository layout

| Path | Contents |
|---|---|
| `PLAN.md` | Master plan (single source of truth for scope) |
| `asset.md` | Log of every external image/asset: name + original URL |
| `docs/` | Project articles (BRD, SRS, PRD, data dictionary, UX, design system, wireframes) |
| `reference/` | Northwind 2.0 study notes |
| `backend/` | PocketBase: migrations, hooks, seed data (Phase 2) |
| `frontend/` | React app (Phase 2) |
| `shared/` | Shared utility library (Phase 2) |
| `deploy/` | Nginx config, systemd unit, deploy scripts (Phase 2) |

## Documents

1. `docs/01-business-requirements.md` — for the Business Analyst
2. `docs/02-system-requirements.md` — for the System Analyst
3. `docs/03-prd.md` — PRD of the final web app
4. `docs/04-data-dictionary.md` — data dictionary + description guideline for the DBA
5. `docs/05-ux-design.md` — UX design document
6. `docs/06-design-system.md` — design system (light, calm, clean; th/en/ja)
7. `docs/07-wireframes/` — mobile + desktop wireframes (low-fi sketches)
8. `docs/08-workflows.md` — business-logic workflow sketches (Phase 2)
9. `docs/09-lob-ui-patterns.md` — LOB UI-pattern research (search, sort, tables, master–detail); prerequisite for 5–7

Every document ends with a Thai summary (สรุปภาษาไทย).
