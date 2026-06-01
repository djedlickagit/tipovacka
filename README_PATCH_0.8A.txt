Patch 0.8A – automatické vyhodnocení tipů

Co přidává:
- Po zadání výsledku zápasu se automaticky přepočítají body všech tipů k danému zápasu.
- Zápas se po přepočtu označí jako evaluated.
- Admin může ručně přepočítat jeden konkrétní zápas přes POST /api/evaluate/matches/:id.
- Tlačítko „Vyhodnotit tipy“ dál přepočítá všechny dohrané/vyhodnocené zápasy.
- Pokud admin opraví tip u již dohraného/vyhodnoceného zápasu, daný zápas se automaticky přepočítá znovu.
- Tipovač v řádku tipu vidí svůj tip, skutečný výsledek a body.

Mění pouze:
api/services/scoring.service.js
api/routes/evaluate.routes.js
api/routes/matches.routes.js
api/routes/users.routes.js
web/src/App.jsx

Nemění:
- databázi
- import/seed zápasů
- přihlášení
- nastavení bodování
- tabulky skupin

Použití:
1) Nahrajte soubory z patch zipu do projektu.
2) Restartujte API.
3) Přestavte web:
   cd web
   npm run build

Ověřeno:
- node --check API souborů prošel.
- web build prošel.
