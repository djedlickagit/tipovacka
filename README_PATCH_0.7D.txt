Patch 0.7D – úklid dashboardu a popisku fáze

Co dělá:
- přejmenuje popisek „32-finále“ na srozumitelnější „1. kolo play-off“
- odstraní duplicitní dashboard box „Nastavení tipování / Uzavírání tipů“
- informace o uzavírání zůstává jen nahoře v hero štítku

Nemění:
- databázi
- backend
- import zápasů
- ukládání tipů
- vyhodnocování

Použití:
1) Rozbal zip do kořene projektu tipovacka-ms-2026.
2) Spusť:

   node scripts/apply-0.7D-clean-dashboard.js

3) Ověř build:

   cd web
   npm run build

Poznámka:
Patch je udělaný jako malý bezpečný skript, aby nepřepsal celý App.jsx a nesmazal změny z předchozích patchů.
