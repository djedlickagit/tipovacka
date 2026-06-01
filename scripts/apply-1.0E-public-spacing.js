#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const cssPath = path.join(root, 'web', 'src', 'styles.css');

if (!fs.existsSync(cssPath)) {
  console.error('Nenalezen soubor web/src/styles.css. Spusť skript z kořene projektu tipovacka-ms-2026.');
  process.exit(1);
}

const start = '/* PATCH 1.0E START – public spacing compact */';
const end = '/* PATCH 1.0E END – public spacing compact */';

function esc(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let css = fs.readFileSync(cssPath, 'utf8');
const blockRegex = new RegExp(`${esc(start)}[\\s\\S]*?${esc(end)}\\n?`, 'g');
css = css.replace(blockRegex, '');

const patch = `
${start}
/* Veřejný přehled – vyrovnanější mezery a menší hlavní boxy */
.public-shell main {
  display: block;
}

.public-shell .public-stats-grid {
  margin-top: 18px;
  margin-bottom: 18px;
  gap: 14px;
}

.public-shell .public-grid,
.public-shell .public-grid.two-columns {
  gap: 16px;
  margin-bottom: 16px;
}

.public-shell .card,
.public-shell .public-main-card,
.public-shell .public-side-card,
.public-shell .public-standings-card,
.public-shell .public-rules-card,
.public-shell .public-grid > .card {
  padding: 18px 20px;
  border-radius: 26px;
  min-height: 0;
}

.public-shell .card h2 {
  margin-bottom: 12px;
  font-size: clamp(21px, 1.7vw, 25px);
}

.public-shell .section-head,
.public-shell .compact-head,
.public-shell .standings-page-head {
  margin-bottom: 12px;
}

.public-shell .section-head p,
.public-shell .compact-head p,
.public-shell .card > .muted {
  margin-bottom: 12px;
}

.public-shell .public-match-list,
.public-shell .public-leaderboard-list {
  gap: 8px;
}

.public-shell .public-match-row,
.public-shell .compact-public-match-row {
  padding: 10px 12px;
  border-radius: 16px;
}

.public-shell .public-leader-row {
  padding: 9px 11px;
  border-radius: 14px;
}

.public-shell .empty-line {
  padding: 14px 12px;
}

.public-shell .public-standings-grid {
  gap: 14px;
}

.public-shell .standings-card {
  padding: 16px;
  border-radius: 22px;
}

.public-shell .public-rules-card {
  margin-top: 16px;
}

@media (max-width: 920px) {
  .public-shell .public-stats-grid {
    margin-top: 14px;
  }

  .public-shell .public-grid,
  .public-shell .public-grid.two-columns {
    gap: 14px;
    margin-bottom: 14px;
  }
}
${end}
`;

fs.writeFileSync(cssPath, `${css.trimEnd()}\n\n${patch}\n`);
console.log('Patch 1.0E aplikován: veřejný přehled má vyrovnanější mezery a kompaktnější boxy.');
