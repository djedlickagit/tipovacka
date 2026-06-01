# Release checklist – Tipovačka MS 2026

## 1. Čistá instalace

- [ ] API: `npm install`
- [ ] API: `npm run sync-schema`
- [ ] API: `npm run dev`
- [ ] Web: `npm install`
- [ ] Web: `npm run build`
- [ ] Web: `npm run dev`

## 2. Data

- [ ] Importovat rozpis MS 2026 v režimu „Jen doplnit chybějící“
- [ ] Zkontrolovat počet zápasů
- [ ] Zkontrolovat skupiny A–L
- [ ] Zkontrolovat veřejný přehled
- [ ] Zkontrolovat tabulky skupin

## 3. Uživatelé

- [ ] Vytvořit testovacího tipovače
- [ ] Přihlásit se jako tipovač
- [ ] Ověřit záložku Přehled
- [ ] Ověřit záložku Moje tipy

## 4. Tipování

- [ ] Zadání tipu před uzávěrkou
- [ ] Úprava tipu před uzávěrkou
- [ ] Uzamčení tipu při pevném termínu
- [ ] Uzamčení tipu při začátku zápasu
- [ ] Ověřit, že admin může tip upravit ručně

## 5. Výsledky a body

- [ ] Admin zadá výsledek zápasu
- [ ] Tipy se automaticky vyhodnotí
- [ ] Tipovač vidí body u tipu
- [ ] Žebříček sedí
- [ ] Kontrola vyhodnocení nehlásí chyby

## 6. Veřejná stránka

- [ ] Veřejný přehled funguje bez přihlášení
- [ ] Zobrazují se nejbližší zápasy
- [ ] Zobrazují se poslední výsledky
- [ ] Zobrazují se tabulky a žebříček

## 7. Před ostrým provozem

- [ ] Přepnout správný režim uzavírání tipů
- [ ] Smazat / neimportovat testovací zápasy
- [ ] Zálohovat databázi
- [ ] Změnit výchozí admin heslo
- [ ] Zkontrolovat `.env` a porty
