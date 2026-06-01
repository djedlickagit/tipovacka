Patch 1.0G – servisní menu + jasnější popisek zamčení

Co řeší:
- servisní položky v admin menu se schovají pod ozubené kolečko „Servis“
  - Synchronizace
  - Kontrola
  - Před spuštěním
- u tipovače se u uzamčených zápasů zobrazí konkrétnější krátký stav, např. „Uzavřeno termínem“
- backend, databáze, tipování ani bodování se nemění

Proč jsou zápasy u tipovače zamčené:
- podle screenshotu máte nastavené pevné uzavření všech tipů na 31. 05. 2026 21:03
- protože tento termín už uplynul, aplikace správně uzamkne i budoucí zápasy
- pokud chcete zamykat každý zápas zvlášť, přepněte v Pravidlech uzavírání na režim „při začátku zápasu“

Použití:
1) Rozbalit zip do kořene projektu tipovacka-ms-2026
2) Spustit:
   node scripts/apply-1.0G-service-menu-lock-label.js
   cd web
   npm run build
