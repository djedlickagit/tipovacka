Patch 0.6C – jemnější dashboard + pohár v hero

Mění pouze frontend:
- web/src/App.jsx
- web/src/styles.css

Úpravy:
- v hero boxu je nově pohár + rok 26
- datum/čas v dashboard kartách je menší a méně agresivní
- u kompaktního seznamu nejbližších zápasů se datum nezobrazuje tak obrovsky

Nemění:
- API
- databázi
- login
- ukládání tipů
- mazání tipů
- vyhodnocování

Po nakopírování spusť:
cd web
npm run build
