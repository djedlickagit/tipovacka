Patch 0.9D – předstartovní kontrola

Mění pouze frontend:
- web/src/App.jsx
- web/src/styles.css
- web/src/constants/tabs.js

Co přidává:
- admin záložku „Před spuštěním“
- kontrolu počtu zápasů, skupinových zápasů, tipovačů a tipů
- kontrolu zápasů bez data/času, bez týmů a bez skupiny
- kontrolu výsledků čekajících na přepočet
- stav „Připraveno ke spuštění“ / „Ještě zkontrolovat“

Použití:
1) Nahraj soubory do projektu podle cest v zipu.
2) Spusť:
   cd web
   npm run build

Build ověřen.
