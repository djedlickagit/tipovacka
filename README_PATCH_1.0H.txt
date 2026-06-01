Patch 1.0H – vylepšené servisní menu + automatické stahování výsledků

Použití:
1) Rozbal patch do kořene projektu tipovacka-ms-2026.
2) Spusť:
   node scripts/apply-1.0H-service-menu-results-sync.js
3) API:
   cd api
   npm run dev
4) Web:
   cd web
   npm run build
   npm run dev

Co patch přidává:
- vylepšený vzhled ozubeného servisního menu
- novou API route /api/results-sync
- bezpečnou kontrolu výsledků před propsáním
- tlačítka v Synchronizaci:
  - Zkontrolovat výsledky
  - Propsat změny
- po propsání výsledku se zápas automaticky vyhodnotí stejně jako při ručním zadání výsledku

Důležité:
- Pokud není nastavený ostrý zdroj, použije se pouze lokální ukázkový soubor api/data/worldcup2026-results.sample.json.
- Pro ostré stahování nastav v api/.env:
  RESULTS_SYNC_URL=https://adresa-vysledkoveho-feedu.cz/results.json
  RESULTS_SYNC_TOKEN=volitelny-token

Očekávaný JSON formát feedu:
{
  "source": "ms2026-results-provider",
  "results": [
    {
      "external_id": "FIFA-WC2026-GROUP-001",
      "home_score": 3,
      "away_score": 1,
      "status": "finished"
    }
  ]
}

Patch nemění databázi. Používá existující sloupce matches.home_score, matches.away_score, matches.status a matches.synced_at.
