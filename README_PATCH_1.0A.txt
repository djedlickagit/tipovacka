Patch 1.0A – veřejná stránka tipovačky

Přidává veřejný přehled bez přihlášení:
- nejbližší zápasy
- dnešní zápasy
- poslední výsledky
- průběžný žebříček
- tabulky skupin
- pravidla a info o uzavírání tipů

Nový endpoint:
GET /api/public/summary

Patch nemění databázi, bodování, tipování ani přihlášení.

Po nahrání:
cd api
npm run dev

cd web
npm run build
npm run dev
