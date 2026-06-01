Patch 0.6A – Dashboard dnešních zápasů

Mění pouze frontend:
- web/src/App.jsx
- web/src/styles.css

Co přidává:
- admin dashboard má nově sekci „Dnešní zápasy / výsledky“
- u dnešních zápasů ukazuje čas, fázi/skupinu, týmy, počet tipů, výsledek a stav
- přidává sekci „Poslední výsledky“ s posledními 6 zápasy, které mají uložený výsledek
- nepřidává žádné nové API endpointy
- nemění login, tipování, mazání tipů ani databázi

Ověřeno:
- cd web
- rm -rf node_modules
- npm install
- npm run build
- build prošel OK

Instalace:
1) Zálohuj aktuální projekt.
2) Zkopíruj soubory z patch zipu přes stejné cesty do projektu.
3) Ve složce web spusť npm run build.
