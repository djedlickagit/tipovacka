Patch 1.0B – oprava veřejné stránky / formatScore

Co opravuje:
- ReferenceError: formatScore is not defined ve komponentě PublicLanding
- veřejná stránka znovu renderuje dnešní zápasy a poslední výsledky

Mění pouze:
- web/src/App.jsx

Použití:
1) Nahraj soubor web/src/App.jsx z tohoto patch zipu do projektu.
2) Spusť:
   cd web
   npm run build
   npm run dev

Poznámka:
Backend, databáze, import, tipování ani vyhodnocování se nemění.
