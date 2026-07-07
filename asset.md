# Asset Log

Every external image (products, people, illustrations, icons, fonts) fetched from public/free resources **must** be listed here before use: file name in repo + original source URL + license note.

| # | File in repo | Description | Original URL | Source / License |
|---|---|---|---|---|
| 1 | `design/screenshots/frame_01.jpg` … `frame_12.jpg` (12 files) | UI style reference — frames extracted from user-provided UI-preview video (ChartMogul-style report screen) | — (user-provided MP4, 2026-07-08) | Internal reference only; not for redistribution |
| 2 | *(loaded via Google Fonts in Phase 2; referenced in `design/tokens.css`)* | Font family **Inter** — Latin UI typeface (closest match to the grotesque sans in the style reference) | https://fonts.google.com/specimen/Inter | Google Fonts / SIL Open Font License 1.1 |
| 3 | *(loaded via Google Fonts in Phase 2; referenced in `design/tokens.css`)* | Font family **Noto Sans Thai** — Thai script coverage | https://fonts.google.com/noto/specimen/Noto+Sans+Thai | Google Fonts / SIL Open Font License 1.1 |
| 4 | *(loaded via Google Fonts in Phase 2; referenced in `design/tokens.css`)* | Font family **Noto Sans JP** — Japanese script coverage | https://fonts.google.com/noto/specimen/Noto+Sans+JP | Google Fonts / SIL Open Font License 1.1 |

Rules:

1. Free/public sources only (e.g., Unsplash, Pexels, Openverse, Wikimedia Commons, unDraw, Google Fonts).
   - **Fonts: Google Fonts only.** When matching a typeface seen in reference material, use the closest Google Fonts equivalent and log the family + Google Fonts URL here.
2. Log the asset here in the same commit that adds it.
3. Assets searched but not used may be listed in the "Considered" section below for traceability.

## Data / SQL sources

SQL scripts or data files taken from external repositories are logged here the same way.

| # | File in repo | Description | Original URL | Source / License |
|---|---|---|---|---|
| 1 | `backend/seed/seed.mjs` | Product/category/company names and price points adapted from the classic Northwind sample data | https://github.com/microsoft/sql-server-samples/tree/master/samples/databases/northwind-pubs | Microsoft sql-server-samples (MIT) |
| 2 | *(binary, not committed)* PocketBase v0.39.5 | Backend runtime downloaded at deploy time | https://github.com/pocketbase/pocketbase/releases/tag/v0.39.5 | PocketBase (MIT) |
| 3 | product images (20 files, uploaded to PocketBase `products.image`) | Self-generated flat-style 1024×1024 illustrations (PIL script `backend/seed/gen-images.py`), Greenish palette | — (generated in-project, 2026-07-08) | Own work — no external source |

## Considered (searched, not used)

| Description | URL | Reason not used |
|---|---|---|
| — | | |
