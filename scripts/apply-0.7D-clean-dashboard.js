#!/usr/bin/env node
import fs from "fs";
import path from "path";

const root = process.cwd();
const appPath = path.join(root, "web", "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("Nenalezen soubor web/src/App.jsx. Spusť skript z kořene projektu tipovacka-ms-2026.");
  process.exit(1);
}

let source = fs.readFileSync(appPath, "utf8");
const before = source;

// 1) Uživatelský popisek fáze: technická hodnota v DB zůstává beze změny.
source = source.replaceAll('label: "32-finále"', 'label: "1. kolo play-off"');
source = source.replaceAll("label: '32-finále'", "label: '1. kolo play-off'");
source = source.replaceAll(">32-finále<", ">1. kolo play-off<");

// 2) Odstranění duplicitního boxu „Nastavení tipování / Uzavírání tipů" z dashboardu.
// Informace o uzavírání zůstává v horním hero štítku, který už používá lockInfo podle nastavení.
const lockCardPatterns = [
  /\n\s*<section className="card lock-info-card">[\s\S]*?<\/section>\n\s*(?=<section className="card dashboard-today-card">)/,
  /\n\s*<section className=\{`card lock-info-card[^`]*`\}>[\s\S]*?<\/section>\n\s*(?=<section className="card dashboard-today-card">)/,
];

let removedLockCard = false;
for (const pattern of lockCardPatterns) {
  if (pattern.test(source)) {
    source = source.replace(pattern, "\n");
    removedLockCard = true;
    break;
  }
}

if (source === before) {
  console.log("Žádná změna nebyla potřeba. Soubor už pravděpodobně obsahuje úpravu 0.7D.");
  process.exit(0);
}

fs.writeFileSync(appPath, source, "utf8");

console.log("Patch 0.7D hotov.");
console.log("- 32-finále přejmenováno na 1. kolo play-off.");
console.log(removedLockCard
  ? "- Duplicitní box Uzavírání tipů byl odstraněn z dashboardu."
  : "- Box Uzavírání tipů nebyl nalezen, takže nebylo co odstraňovat.");
