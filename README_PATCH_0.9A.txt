Patch 0.9A – týmy, vlajky a lepší zobrazení zápasů

Mění pouze frontend:
- web/src/App.jsx
- web/src/styles.css
- web/src/constants/tabs.js

Co přidává:
- vizuální zobrazení týmů s vlajkou a zkratkou
- komponenty TeamBadge a MatchTeams
- lepší zobrazení zápasů v dashboardu, tipech, zápasech, kontrole, výsledcích a tabulkách
- novou záložku „Týmy“ pro admina i tipovače
- přehled týmů podle skupin z importovaných zápasů

Nemění:
- API
- databázi
- import
- bodování
- uzamykání tipů
- vyhodnocování

Po nahrání spusť:
cd web
npm run build
