#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const cssPath = path.join(root, 'web', 'src', 'styles.css');

if (!fs.existsSync(cssPath)) {
  console.error('Nenalezen soubor web/src/styles.css. Spusť skript z kořene projektu tipovacka-ms-2026.');
  process.exit(1);
}

const start = '/* PATCH 1.0D START – public match layout */';
const end = '/* PATCH 1.0D END – public match layout */';

function esc(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let css = fs.readFileSync(cssPath, 'utf8');
const blockRegex = new RegExp(`${esc(start)}[\\s\\S]*?${esc(end)}\\n?`, 'g');
css = css.replace(blockRegex, '');

const patch = `
${start}
/* Veřejný přehled – čitelnější řádky zápasů a datum/čas pod sebou */
.public-shell .match-date-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 4px;
  min-width: 0;
  line-height: 1.15;
}

.public-shell .match-date-block strong,
.public-shell .match-date-block span {
  display: block;
  white-space: nowrap;
}

.public-shell .match-date-block strong {
  font-size: 0.98rem;
  font-weight: 850;
  color: #0f172a;
}

.public-shell .match-date-block span {
  font-size: 0.82rem;
  font-weight: 750;
  color: rgba(15, 23, 42, 0.62);
}

.public-shell .public-match-row {
  grid-template-columns: minmax(116px, 150px) minmax(260px, 1fr) auto;
  gap: 18px;
}

.public-shell .compact-public-match-row {
  grid-template-columns: minmax(104px, 138px) minmax(280px, 1fr) auto;
}

.public-shell .match-main {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  min-width: 0;
}

.public-shell .match-main > .match-teams {
  width: 100%;
}

.public-shell .match-teams {
  flex-wrap: nowrap;
  gap: 0.55rem;
}

.public-shell .match-teams .vs-pill,
.public-shell .match-teams .versus,
.public-shell .match-teams .match-vs {
  flex: 0 0 auto;
}

.public-shell .team-badge {
  min-width: 0;
  max-width: none;
}

.public-shell .team-badge .team-name,
.public-shell .team-badge-name {
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
}

.public-shell .team-badge .team-flag,
.public-shell .team-badge-compact .team-flag,
.public-shell .flag-chip,
.public-shell .team-flag,
.public-shell .flag-circle,
.public-shell .team-badge-flag {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
}

.public-shell .public-score {
  white-space: nowrap;
}

@media (max-width: 820px) {
  .public-shell .public-match-row,
  .public-shell .compact-public-match-row {
    grid-template-columns: 1fr;
  }

  .public-shell .match-date-block {
    flex-direction: row;
    align-items: baseline;
    gap: 10px;
  }

  .public-shell .match-teams {
    flex-wrap: wrap;
  }
}
${end}
`;

fs.writeFileSync(cssPath, `${css.trimEnd()}\n\n${patch}\n`);
console.log('Patch 1.0D aplikován: veřejné zápasy mají čitelné datum/čas a vlajky bez koleček.');
