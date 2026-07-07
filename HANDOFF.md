# Handoff & Readiness Report

**Production:** https://northwind.raawww.com · deployed 2026-07-08 · tag `v1.0`

## Access

| What | Credential |
|---|---|
| **App login (full admin)** | username `admin` · password `password` |
| Demo users (sales/purchasing/warehouse/manager) | `nok` / `ken` / `ploy` / `suda` — password `password` |
| PocketBase dashboard | https://northwind.raawww.com/_/ — `admin@northwind.local` / `northwind-admin-2026` |
| VPS | root@146.190.200.199 (your SSH key) · app at `/opt/northwind` |

The `admin` account has the admin role: every module, action, and screen is available to it. ⚠ These are published demo credentials — rotate them if this instance ever holds real data.

## Readiness evaluation

| Gate | Result |
|---|---|
| Unit tests (calc, state machines, formatting, action gating) | ✅ 62/62 (vitest) |
| Functional tests (Login, DataTable, StatusBadge, i18n components) | ✅ included in the 62 (RTL + jsdom) |
| Integration tests (real PocketBase + hooks + API rules, 16 scenarios) | ✅ 16/16 (`node --test tests/integration/`) |
| E2E Playwright — local full stack | ✅ 8/8 (desktop 1280px + mobile 360px) |
| E2E Playwright — **against production** | ✅ 8/8 (`E2E_BASE_URL=https://northwind.raawww.com`) |
| Business rules enforced at raw-API level (not just UI) | ✅ verified by integration suite (illegal transitions, negative stock, role gates, referential guards all rejected server-side) |
| Three languages complete (en/th/ja) | ✅ ~230 keys × 3, verified in E2E |
| HTTPS + valid certificate | ✅ (auto-managed) |
| Seeded demo data | ✅ 12 companies, 8 categories, 20 products, 6 orders across all statuses, 5 POs, live stock ledger |

Test commands: `cd frontend && npx vitest run` · `node --test tests/integration/` · `cd tests/e2e && npx playwright test`.

## Production architecture

Browser → **Caddy** (:443, TLS termination — pre-existing on this VPS, also serves raawww.com and other sites, so it keeps ports 80/443) → **Nginx** vhost `northwind.raawww.com` on 127.0.0.1:8088 (reverse proxy per project requirement; `deploy/nginx-northwind.conf`) → **PocketBase** 0.39.5 on 127.0.0.1:8090 (systemd unit `northwind`, serves both the API and the built React SPA from `pb_public`). SQLite data in `/opt/northwind/pb_data`.

Note: the original plan had Nginx binding :80/:443 directly with Let's Encrypt. Your VPS already runs Caddy on those ports for other production sites, which I did not touch. Nginx remains the app's reverse proxy; Caddy handles edge TLS automatically. To give Nginx the edge later: remove the northwind block from `/etc/caddy/Caddyfile`, rebind Nginx to :80/:443, run certbot.

## Operations

- Redeploy: `./deploy/deploy.sh root@146.190.200.199` (builds frontend, rsyncs, restarts)
- Logs: `journalctl -u northwind -f` · restart: `systemctl restart northwind`
- Backup: copy `/opt/northwind/pb_data` (SQLite; stop service or use PB backup API)
- Reseed from scratch: stop service, delete `pb_data`, start, `node /opt/northwind/seed/seed.mjs https://northwind.raawww.com`

## Known limitations (v1)

Category/product image upload UI omitted (schema supports it); no unsaved-changes navigation guard; stock/report queries fetch up to 500 transactions per product (fine at demo scale, needs paging loops for production volume); E2E runs create test orders/POs in the production demo data; ~~Buddhist calendar~~ dates are ISO with locale formatting per UX decision.

## สรุปภาษาไทย

ระบบขึ้น production แล้วที่ https://northwind.raawww.com — เข้าสู่ระบบด้วย `admin` / `password` ได้สิทธิ์ทุกอย่าง ผ่านการทดสอบครบ 4 ระดับ: unit 62 รายการ, integration 16 รายการ (ตรวจ business rules ที่ API จริง), E2E 8 รายการทั้งบน desktop และมือถือ ทดสอบซ้ำกับ production แล้วผ่านทั้งหมด สถาปัตยกรรม: Caddy (TLS เดิมของเซิร์ฟเวอร์) → Nginx (reverse proxy ตามข้อกำหนด) → PocketBase + SQLite ที่ให้บริการทั้ง API และหน้าเว็บ React มีข้อมูลตัวอย่างครบทุกโมดูล และมีสคริปต์ deploy ซ้ำได้ที่ `deploy/deploy.sh`
