# Tipovačka MS 2026 — verze 0.1A

První funkční kostra webové aplikace/PWA pro tipování výsledků MS 2026.

## Obsahuje

- Node/Express API
- MariaDB databázi
- React/Vite frontend
- přidání tipovačů
- přidání zápasů
- zadání tipů
- zadání výsledků
- automatické vyhodnocení bodů
- žebříček
- editovatelná pravidla a bodování

## 1. Databáze

```bash
mysql -u root -p < api/schema.sql
```

## 2. API

```bash
cd api
cp .env.example .env
npm install
npm run dev
```

API poběží na:

```text
http://localhost:5050/api/health
```

## 3. Web

V novém terminálu:

```bash
cd web
npm install
npm run dev
```

Web poběží na:

```text
http://localhost:5173
```

## Poznámka

Toto je první výkop. Zatím bez ostrého přihlášení, bez notifikací a bez importu oficiálního rozpisu.
