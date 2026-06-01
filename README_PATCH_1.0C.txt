Patch 1.0C – veřejný přehled: kompaktní statistiky

Použití:
1) Rozbal zip do kořene projektu.
2) Spusť:
   node scripts/apply-1.0C-public-ui-compact.js
3) Ověř build:
   cd web
   npm run build

Patch upravuje pouze CSS přes bezpečný skript:
- statistické karty na veřejné stránce jsou kompaktní a v gridu,
- vlajky na veřejné stránce nemají kolečka/border/pozadí,
- text názvů týmů se méně ořezává.
