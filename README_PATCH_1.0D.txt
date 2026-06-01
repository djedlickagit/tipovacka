Patch 1.0D – veřejný přehled: oprava řádků zápasů

Použití:
1) Rozbal zip do kořene projektu tipovacka-ms-2026.
2) Spusť:
   node scripts/apply-1.0D-public-match-layout.js
3) Potom:
   cd web
   npm run build

Opravy:
- datum a čas ve veřejném přehledu jsou čitelně pod sebou,
- nelepí se čas/fáze k dalšímu textu,
- řádky zápasů mají stabilnější rozložení,
- vlajky jsou bez kolečka/borderu/pozadí.

Patch mění pouze web/src/styles.css přes bezpečný idempotentní skript.
