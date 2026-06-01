Patch 0.8D – kontrola vyhodnocení + synchronizace poslední v menu

Mění pouze frontend:
- web/src/App.jsx
- web/src/styles.css
- web/src/constants/tabs.js

Co přidává:
- nová admin záložka „Kontrola“
- přehled zápasů bez výsledku
- přehled zápasů s výsledkem, které vyžadují přepočet
- počet tipů / vyhodnocených tipů u zápasu
- součet rozdaných bodů u zápasu
- tlačítko „Výsledek“ pro rychlé zadání výsledku
- tlačítko „Přepočítat“ pro konkrétní zápas
- tlačítko „Přepočítat vše dohrané“
- položka „Synchronizace“ je v admin menu přesunuta na poslední místo

Nemění:
- API
- databázi
- import
- login
- ukládání tipů
- samotný výpočet bodů

Po nahrání spusť:
cd web
npm run build
