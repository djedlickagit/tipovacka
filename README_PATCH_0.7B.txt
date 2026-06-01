Patch 0.7B – bezpečný import / seed MS 2026

Mění/přidává:
- api/routes/sync.routes.js
- api/scripts/ensure-sync-schema.js
- api/package.json
- api/schema.sql
- api/data/worldcup2026-seed.json
- web/src/pages/SyncPage.jsx
- web/src/styles.css

Co přidává:
- bezpečný import seedu přes /api/sync/import-seed
- náhled importu bez zápisu přes /api/sync/preview-seed a /api/sync/preview-json
- režim importu:
  1) insert_missing = jen doplnit chybějící zápasy, nic nepřepisovat
  2) upsert_all = aktualizovat i existující zápasy
- Sync stránka v administraci má nový náhled a přehlednější ovládání
- import nepřepisuje ruční úpravy ve výchozím režimu

Po nahrání patch souborů spusť v API:
cd api
npm install
npm run sync-schema
npm run dev

A ve webu:
cd web
npm install
npm run build
npm run dev
