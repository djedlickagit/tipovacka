Patch 0.6B – oprava dashboardu dnešních zápasů

Mění pouze:
- web/src/App.jsx
- web/src/styles.css

Co opravuje:
- dashboard už neporovnává dnešní zápasy jen přes match.start_time jedním způsobem
- bere tolerantně více možných názvů data: start_time, startTime, kickoff_time, match_date, date
- porovnává jak datum převedené přes prohlížeč, tak surový YYYY-MM-DD z API
- pokud dnešní zápas stále není nalezen, zobrazí jako pojistku nejbližší další zápasy

Po nahrání spusť:
cd web
npm run build
