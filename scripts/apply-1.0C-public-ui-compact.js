#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const cssPath = path.join(root, 'web', 'src', 'styles.css');

if (!fs.existsSync(cssPath)) {
  console.error('Nenalezen soubor web/src/styles.css. Spusť skript z kořene projektu tipovacka-ms-2026.');
  process.exit(1);
}

const start = '/* PATCH 1.0C START – public compact stats */';
const end = '/* PATCH 1.0C END – public compact stats */';

let css = fs.readFileSync(cssPath, 'utf8');
const blockRegex = new RegExp(`${start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n?`, 'g');
css = css.replace(blockRegex, '');

const patch = `
${start}
/* Veřejný přehled – kompaktní statistiky a čistší vlajky */
.public-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 0 0 18px;
}

.public-stats-grid .stat-card {
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  border-radius: 24px;
}

.public-stats-grid .stat-card::after {
  right: -24px;
  bottom: -34px;
  width: 86px;
  height: 86px;
  opacity: 0.10;
}

.public-stats-grid .stat-card span {
  margin: 0;
  font-size: 10px;
  letter-spacing: 0.09em;
  line-height: 1.2;
}

.public-stats-grid .stat-card strong {
  flex: 0 0 auto;
  font-size: clamp(24px, 2.1vw, 34px);
  line-height: 1;
}

.public-shell .flag-chip,
.public-shell .team-flag,
.public-shell .flag-circle,
.public-shell .team-badge-flag {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
}

.public-shell .standings-card {
  max-width: none;
}

.public-shell .standings-table .team-badge,
.public-shell .team-badge,
.public-shell .match-teams,
.public-shell .match-main {
  min-width: 0;
}

.public-shell .standings-table .team-badge-name,
.public-shell .team-badge-name {
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
}

@media (max-width: 980px) {
  .public-stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .public-stats-grid {
    grid-template-columns: 1fr;
  }

  .public-stats-grid .stat-card {
    padding: 14px 16px;
  }
}
${end}
`;

fs.writeFileSync(cssPath, `${css.trimEnd()}\n\n${patch}\n`);
console.log('Patch 1.0C aplikován: veřejné statistiky jsou kompaktní a vlajky bez koleček/borderu.');
