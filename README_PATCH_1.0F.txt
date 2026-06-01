Patch 1.0F – doladění veřejné stránky

Použití:
1) Rozbal zip do kořene projektu tipovacka-ms-2026.
2) Spusť:
   node scripts/apply-1.0F-public-layout-polish.js
3) Ověř build:
   cd web
   npm run build

Úpravy:
- veřejná stránka používá stejnou šířku jako zbytek aplikace
- datum ve veřejných zápasech už neobsahuje čas, když je čas na dalším řádku
- řádky zápasů mají čistší rozložení
- vlajky jsou bez koleček/borderů
- tabulky skupin jsou sjednocené a kompaktnější
