Patch 0.7C – ostrý seed základních skupin MS 2026

Obsah:
- api/data/worldcup2026-seed.json
  - 72 zápasů základních skupin A–L
  - týmy, skupiny, stadion/město, external_id, status scheduled
  - source: ms2026-official-group-seed-v1
- web/src/pages/SyncPage.jsx
  - texty v administraci Synchronizace upravené z testovacího seedu na rozpis skupin

Důležité:
- Import používej ideálně v režimu „Jen doplnit chybějící“.
- Patch nemění databázi ani API logiku.
- Existující ručně upravené zápasy se v bezpečném režimu nepřepisují.
- Časy jsou ponechané v aplikačním lokálním formátu pro řazení a lze je později zpřesnit dalším importem/API.

Po nahrání:
cd web
npm run build

Volitelně:
cd api
npm run dev
