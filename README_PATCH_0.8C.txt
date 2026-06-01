Patch 0.8C – ochrana uzamčených tipů

Co patch řeší:
- hráč už nedostane jen obecnou hlášku, ale konkrétní důvod uzamčení tipu
- backend vrací u zamčeného tipu stav 423 a kód důvodu
- /api/matches nově vrací lock_reason a lock_message pro UI
- hráčovský formulář si před uložením ještě lokálně ověří, zda zápas není uzamčený
- admin může i nadále upravovat tipy ručně, aby šly řešit reklamace / opravy

Mění pouze:
- api/utils/match.js
- api/routes/tips.routes.js
- api/routes/matches.routes.js
- web/src/App.jsx

Použití:
1) Nahraj soubory z patch zipu přes existující projekt.
2) API restart:
   cd api
   npm run dev
3) Web build:
   cd web
   npm run build
   npm run dev

Kontrola:
- node --check api/utils/match.js
- node --check api/routes/tips.routes.js
- node --check api/routes/matches.routes.js
- cd web && npm run build
