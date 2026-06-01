#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const appPath = path.join(root, 'web', 'src', 'App.jsx');
const cssPath = path.join(root, 'web', 'src', 'styles.css');

if (!fs.existsSync(appPath) || !fs.existsSync(cssPath)) {
  console.error('Nenalezen web/src/App.jsx nebo web/src/styles.css. Spusť skript z kořene projektu tipovacka-ms-2026.');
  process.exit(1);
}

function esc(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let app = fs.readFileSync(appPath, 'utf8');

if (!app.includes('function formatPublicDateOnly(')) {
  const marker = `function formatScore(match) {\n  return scoreText(match);\n}\n`;
  const helper = `function formatScore(match) {\n  return scoreText(match);\n}\n\nfunction formatPublicDateOnly(value) {\n  if (!value) return \"bez data\";\n  const normalized = String(value).replace(\" \", \"T\");\n  const date = new Date(normalized);\n  if (Number.isNaN(date.getTime())) return \"bez data\";\n  return date.toLocaleDateString(\"cs-CZ\", {\n    day: \"2-digit\",\n    month: \"2-digit\",\n    year: \"numeric\",\n  });\n}\n`;
  if (app.includes(marker)) {
    app = app.replace(marker, helper);
  } else {
    console.warn('Varování: helper formatPublicDateOnly se nepodařilo vložit automaticky. Kontroluj App.jsx ručně.');
  }
}

// Ve veřejném přehledu necháme v hlavním řádku jen datum; čas zůstane v samostatném řádku.
app = app.replace(
  /<strong>\{formatDate\(match\.start_time\)\}<\/strong>\n\s*<span>\{formatMatchTime\(match\.start_time\)\}<\/span>/g,
  '<strong>{formatPublicDateOnly(match.start_time)}</strong>\n                    <span>{formatMatchTime(match.start_time)}</span>'
);

// U posledních výsledků necháme jen datum, aby se datum/čas/fáze nelepily k týmům.
app = app.replace(
  /<strong>\{formatDate\(match\.start_time\)\}<\/strong>\n\s*<span>\{stageLabel\(match\.stage\)\}<\/span>/g,
  '<strong>{formatPublicDateOnly(match.start_time)}</strong>\n                    <span>{stageLabel(match.stage)}</span>'
);

fs.writeFileSync(appPath, app);

let css = fs.readFileSync(cssPath, 'utf8');
const start = '/* PATCH 1.0F START – public layout polish */';
const end = '/* PATCH 1.0F END – public layout polish */';
css = css.replace(new RegExp(`${esc(start)}[\\s\\S]*?${esc(end)}\\n?`, 'g'), '');

const patch = `
${start}
/* Veřejný přehled – širší layout jako administrace, bez duplicitních časů a sjednocené tabulky */
.public-shell.app-shell,
.app-shell.public-shell {
  width: min(1460px, calc(100% - 34px)) !important;
  max-width: none !important;
}

.public-shell main {
  display: grid;
  gap: 18px;
}

.public-shell .public-stats-grid {
  margin-top: 20px !important;
  margin-bottom: 0 !important;
  gap: 16px !important;
}

.public-shell .public-grid,
.public-shell .public-grid.two-columns {
  gap: 18px !important;
  margin-bottom: 0 !important;
}

.public-shell .public-grid {
  grid-template-columns: minmax(0, 1.85fr) minmax(320px, 0.82fr) !important;
}

.public-shell .public-grid.two-columns {
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
}

.public-shell .card,
.public-shell .public-main-card,
.public-shell .public-side-card,
.public-shell .public-standings-card,
.public-shell .public-rules-card {
  padding: 20px 22px !important;
  border-radius: 28px !important;
  min-height: 0 !important;
}

.public-shell .public-main-card,
.public-shell .public-side-card {
  align-self: stretch;
}

.public-shell .public-main-card .empty-line {
  min-height: 76px;
  display: grid;
  place-items: center;
}

.public-shell .public-match-row,
.public-shell .compact-public-match-row {
  grid-template-columns: minmax(118px, 150px) minmax(0, 1fr) auto !important;
  gap: 16px !important;
  align-items: center !important;
  padding: 12px 14px !important;
}

.public-shell .match-date-block {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.public-shell .match-date-block strong {
  white-space: nowrap;
  line-height: 1.05;
}

.public-shell .match-date-block span {
  display: block;
  color: var(--muted);
  font-size: 0.88rem;
  font-weight: 800;
  line-height: 1.05;
}

.public-shell .match-main {
  min-width: 0;
}

.public-shell .match-main .match-teams {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 9px;
  align-items: center;
  width: 100%;
}

.public-shell .match-main .team-badge {
  display: inline-grid;
  grid-template-columns: auto minmax(0, auto) auto;
  justify-content: start;
  align-items: center;
  gap: 7px;
  min-width: 0;
  max-width: 100%;
}

.public-shell .match-main .team-name {
  overflow: visible !important;
  text-overflow: clip !important;
  white-space: normal !important;
  line-height: 1.12;
}

.public-shell .match-main .team-code {
  margin-left: 2px;
}

.public-shell .match-versus {
  justify-self: center;
  color: rgba(15, 23, 42, .52);
  font-size: .78rem;
  font-weight: 950;
  letter-spacing: .04em;
  text-transform: uppercase;
}

.public-shell .team-flag,
.public-shell .team-badge .team-flag,
.public-shell .team-badge-compact .team-flag {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  border-radius: 0 !important;
  width: auto !important;
  height: auto !important;
  min-width: 1.25rem;
}

.public-shell .public-standings-card {
  padding: 22px !important;
}

.public-shell .public-standings-grid,
.public-shell .standings-grid.public-standings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(390px, 1fr)) !important;
  gap: 16px !important;
  align-items: start;
}

.public-shell .standings-card {
  padding: 0 !important;
  border-radius: 24px !important;
  background: rgba(255,255,255,.78);
  border: 1px solid rgba(15,23,42,.08);
  overflow: hidden;
  box-shadow: 0 18px 45px rgba(15, 23, 42, .07);
}

.public-shell .standings-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  background: rgba(245, 247, 252, .86);
  border-bottom: 1px solid rgba(15,23,42,.08);
}

.public-shell .standings-card-head .eyebrow,
.public-shell .standings-card-head .eyebrow.dark {
  margin: 0 0 3px;
  font-size: .68rem;
  letter-spacing: .14em;
}

.public-shell .standings-card-head h3 {
  margin: 0;
  font-size: 1.35rem;
  line-height: 1;
  letter-spacing: -.04em;
}

.public-shell .standings-card-head > span {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 7px 10px;
  background: rgba(36,87,245,.08);
  color: #1e3a8a;
  font-size: .78rem;
  font-weight: 900;
}

.public-shell .standings-table-wrap {
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.public-shell .standings-table {
  width: 100%;
  table-layout: auto;
}

.public-shell .standings-table th,
.public-shell .standings-table td {
  padding: 11px 12px;
  vertical-align: middle;
}

.public-shell .standings-table .team-badge {
  display: inline-grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px;
  align-items: center;
}

.public-shell .standings-table .team-code {
  display: none;
}

.public-shell .public-rules-card {
  margin-top: 0 !important;
}

@media (max-width: 1100px) {
  .public-shell .public-grid,
  .public-shell .public-grid.two-columns {
    grid-template-columns: 1fr !important;
  }
}

@media (max-width: 760px) {
  .public-shell.app-shell,
  .app-shell.public-shell {
    width: min(100% - 20px, 1460px) !important;
  }

  .public-shell .public-match-row,
  .public-shell .compact-public-match-row {
    grid-template-columns: 1fr !important;
  }

  .public-shell .match-main .match-teams {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .public-shell .match-versus {
    justify-self: start;
  }

  .public-shell .public-standings-grid,
  .public-shell .standings-grid.public-standings-grid {
    grid-template-columns: 1fr !important;
  }
}
${end}
`;

fs.writeFileSync(cssPath, `${css.trimEnd()}\n\n${patch}\n`);
console.log('Patch 1.0F aplikován: veřejná stránka má širší layout, datum bez duplicitního času a sjednocené tabulky.');
