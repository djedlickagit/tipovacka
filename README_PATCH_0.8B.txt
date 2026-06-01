Patch 0.8B – vysvětlení bodů u jednotlivých tipů

Co patch přidává:
- u tipovače v záložce Moje tipy se zobrazí vysvětlení bodů
- rozlišuje:
  - Přesný výsledek
  - Správný vítěz/remíza
  - Bez bodu
  - Čeká na výsledek
  - Čeká na vyhodnocení
- používá aktuální nastavení bodování ze /api/settings/scoring

Mění pouze:
- web/src/App.jsx
- web/src/styles.css

Nemění:
- backend
- databázi
- import zápasů
- ukládání tipů
- vyhodnocování bodů

Použití:
1) Nahraj soubory z patch zipu do projektu.
2) Spusť:
   cd web
   npm run build
   npm run dev
