#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const apiDir = path.join(root, 'api');
const target = path.join(apiDir, 'scripts', 'init-db.js');
const dbPath = path.join(apiDir, 'db.js');
const pkgPath = path.join(apiDir, 'package.json');

if (!fs.existsSync(apiDir) || !fs.existsSync(pkgPath)) {
  console.error('Spusť skript z kořene projektu, kde jsou složky api/ a web/.');
  process.exit(1);
}

fs.mkdirSync(path.dirname(target), { recursive: true });

const content = `import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as mariadb from "mariadb";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbConfig = {
  host: process.env.DB_HOST || process.env.MYSQLHOST || "localhost",
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
  user: process.env.DB_USER || process.env.MYSQLUSER || "root",
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || "",
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || "tipovacka_ms2026",
  connectionLimit: 1,
  multipleStatements: true,
};

function splitSqlStatements(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/;\s*(?:\r?\n|$)/)
    .map((part) => part.trim())
    .filter(Boolean);
}

async function main() {
  const schemaPath = path.join(__dirname, "..", "schema.sql");

  if (!fs.existsSync(schemaPath)) {
    throw new Error(\`Soubor schema.sql nenalezen: \${schemaPath}\`);
  }

  const pool = mariadb.createPool(dbConfig);
  let conn;

  try {
    conn = await pool.getConnection();
    const schema = fs.readFileSync(schemaPath, "utf8");
    const statements = splitSqlStatements(schema);

    for (const statement of statements) {
      await conn.query(statement);
    }

    console.log(\`DB init OK: schéma připraveno v databázi "\${dbConfig.database}".\`);
  } finally {
    if (conn) conn.release();
    await pool.end();
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("DB init selhal:", error?.message || error);
    console.error("Zkontroluj Railway Variables: DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME nebo MYSQLHOST/MYSQLPORT/MYSQLUSER/MYSQLPASSWORD/MYSQLDATABASE.");
    process.exit(1);
  });
`;

const backup = `${target}.backup-${Date.now()}`;
if (fs.existsSync(target)) {
  fs.copyFileSync(target, backup);
  console.log(`Záloha původního init-db.js: ${path.relative(root, backup)}`);
}
fs.writeFileSync(target, content, 'utf8');
console.log('Hotovo: api/scripts/init-db.js upraven tak, aby po inicializaci DB ukončil spojení a pustil server.js.');

// Ensure start script is present and correct without touching other scripts.
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.scripts = pkg.scripts || {};
pkg.scripts.start = 'node scripts/init-db.js && node server.js';
fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
console.log('Hotovo: api/package.json start script ověřen.');
