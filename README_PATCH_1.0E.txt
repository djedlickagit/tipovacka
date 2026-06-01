Patch 1.0E – kompaktnější veřejný přehled

Použití:
1) Rozbal zip do kořene projektu tipovacka-ms-2026.
2) Spusť:
   node scripts/apply-1.0E-public-spacing.js
3) Ověř build:
   cd web
   npm run build

Změny:
- přidá mezeru mezi hero a 4 statistické boxy,
- sjednotí rozestupy mezi hlavními boxy,
- zmenší padding a výšku veřejných karet,
- zmenší prázdné stavy a řádky zápasů.

Mění pouze web/src/styles.css přes bezpečný skript.
