Patch 0.7A – Tabulky skupin

Změněné / nové soubory:
- api/server.js
- api/routes/standings.routes.js
- web/src/App.jsx
- web/src/styles.css
- web/src/constants/tabs.js

Co patch přidává:
- nový backend endpoint GET /api/standings
- výpočet tabulek skupin z uložených výsledků zápasů
- samostatnou záložku „Tabulky“ pro admina i tipovače
- náhled tabulek na dashboardu

Důležité:
- Nepřidává žádnou databázovou tabulku.
- Nemění ukládání tipů, login ani vyhodnocování.
- Tabulky se počítají pouze ze zápasů:
  - stage = 'group'
  - group_name je vyplněné
  - home_score a away_score jsou uložené

Postup:
1) Nahraj soubory z patch zipu do projektu.
2) Restartuj API.
3) Sestav frontend:
   cd web
   npm run build

Ověřeno:
- web: npm run build prošel
- api: node --check server.js a node --check routes/standings.routes.js prošlo
