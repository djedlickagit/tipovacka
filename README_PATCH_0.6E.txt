Patch 0.6E – Přehled pro tipovače + dynamický text uzavírání

Změněné soubory:
- web/src/App.jsx
- web/src/styles.css
- web/src/constants/tabs.js

Co patch řeší:
- Hero už nepíše natvrdo „tipy se zamykají po výkopu“.
- Text v hero se mění podle settings.tip_lock_mode:
  - match_start = tipy se zamykají při výkopu zápasu
  - fixed_datetime = tipování se uzavře konkrétním datem/časem
- Přehled/dashboard už není jen pro admina.
- Tipovač má novou záložku „Přehled“.
- Tipovač vidí stejné zápasy z /api/matches jako admin, tedy dnešní zápasy, nejbližší další zápasy a poslední výsledky.
- Přibyl informační box „Uzavírání tipů“ napojený na /api/settings/scoring.
- Přehled pro tipovače má vlastní statistiky: chybí natipovat, natipováno, zamčeno, aktuálně vede.
- Moje tipy jsou seřazené podle času zápasu, aby další zápasy byly logicky nahoře.

Build ověřen:
cd web
rm -rf node_modules
npm install
npm run build
