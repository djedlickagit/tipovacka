# Tipovačka MS 2026 – Release candidate 1.1.0

Tento balík sjednocuje aktuální stav aplikace po patchích 0.6A–1.0H.

## Co je hotové

- přihlášení admin / tipovač
- správa zápasů
- import rozpisu základních skupin MS 2026
- tipování
- uzamykání tipů podle začátku zápasu nebo pevným termínem
- zadávání výsledků
- automatické vyhodnocení tipů
- body a vysvětlení bodů u tipů
- žebříček
- tabulky skupin
- kontrola vyhodnocení
- předstartovní kontrola
- veřejný přehled bez přihlášení
- servisní menu pod ozubeným kolečkem / Správa
- připravená synchronizace výsledků přes externí JSON feed

## Instalace / spuštění

### API

```bash
cd api
npm install
npm run sync-schema
npm run dev
```

Produkční start:

```bash
cd api
npm install
npm run sync-schema
npm start
```

### Web

```bash
cd web
npm install
npm run build
npm run dev
```

## Externí výsledkový feed

Synchronizace výsledků je připravená, ale ostrý feed není součástí balíčku.
Pokud není nastavený feed, používá se lokální ukázka:

```text
api/data/worldcup2026-results.sample.json
```

Pro ostrý feed nastav v `api/.env`:

```env
RESULTS_SYNC_URL=https://adresa-vysledkoveho-feedu.cz/results.json
RESULTS_SYNC_TOKEN=volitelny-token
```

Očekávaný formát feedu:

```json
{
  "source": "provider-name",
  "results": [
    {
      "external_id": "FIFA-WC2026-GROUP-001",
      "home_score": 2,
      "away_score": 1,
      "status": "finished"
    }
  ]
}
```

## Poznámky

- Ruční zadávání výsledků zůstává hlavní jistota.
- Externí synchronizace nejdřív zobrazí náhled změn a teprve potom umožní propsání.
- Před ostrým spuštěním projdi `RELEASE_CHECKLIST.md`.
