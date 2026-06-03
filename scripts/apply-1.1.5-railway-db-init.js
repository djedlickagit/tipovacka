import fs from 'fs';
import path from 'path';

const root = process.cwd();
const apiDir = path.join(root, 'api');
const dbPath = path.join(apiDir, 'db.js');
const packagePath = path.join(apiDir, 'package.json');
const scriptsDir = path.join(apiDir, 'scripts');
const initPath = path.join(scriptsDir, 'init-db.js');

if (!fs.existsSync(apiDir)) {
  console.error('Nenalezena složka api. Spusť skript v kořeni projektu.');
  process.exit(1);
}

fs.mkdirSync(scriptsDir, { recursive: true });

const dbJs = `import * as mariadb from "mariadb";\nimport dotenv from "dotenv";\n\ndotenv.config();\n\nexport const dbConfig = {\n  host: process.env.DB_HOST || process.env.MYSQLHOST || "localhost",\n  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),\n  user: process.env.DB_USER || process.env.MYSQLUSER || "root",\n  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || "",\n  database: process.env.DB_NAME || process.env.MYSQLDATABASE || "tipovacka_ms2026",\n  connectionLimit: 10,\n  bigIntAsNumber: true,\n};\n\nexport const pool = mariadb.createPool(dbConfig);\n\nexport async function query(sql, params = []) {\n  let conn;\n  try {\n    conn = await pool.getConnection();\n    return await conn.query(sql, params);\n  } finally {\n    if (conn) conn.release();\n  }\n}\n`;
fs.writeFileSync(dbPath, dbJs, 'utf8');

const initDbJs = `import fs from "fs";\nimport path from "path";\nimport { fileURLToPath } from "url";\nimport * as mariadb from "mariadb";\nimport dotenv from "dotenv";\nimport { dbConfig } from "../db.js";\n\ndotenv.config();\n\nconst __filename = fileURLToPath(import.meta.url);\nconst __dirname = path.dirname(__filename);\nconst schemaPath = path.join(__dirname, "..", "schema.sql");\n\nfunction splitSqlStatements(sql) {\n  return sql\n    .replace(/\\r\\n/g, "\\n")\n    .split(";")\n    .map((statement) => statement.trim())\n    .filter(Boolean)\n    .filter((statement) => !/^CREATE\\s+DATABASE\\b/i.test(statement))\n    .filter((statement) => !/^USE\\s+/i.test(statement));\n}\n\nasync function main() {\n  if (!fs.existsSync(schemaPath)) {\n    console.log("DB init: schema.sql nenalezeno, přeskakuji.");\n    return;\n  }\n\n  const safeConfig = {\n    ...dbConfig,\n    connectionLimit: 1,\n  };\n\n  const pool = mariadb.createPool(safeConfig);\n  let conn;\n\n  try {\n    conn = await pool.getConnection();\n    await conn.query("SELECT 1");\n\n    const rawSql = fs.readFileSync(schemaPath, "utf8");\n    const statements = splitSqlStatements(rawSql);\n\n    for (const statement of statements) {\n      await conn.query(statement);\n    }\n\n    console.log(\`DB init OK: schéma připraveno v databázi \"\${safeConfig.database}\".\`);\n  } catch (error) {\n    console.error("DB init selhal:", error.message);\n    console.error("Zkontroluj Railway Variables: DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME nebo MYSQLHOST/MYSQLPORT/MYSQLUSER/MYSQLPASSWORD/MYSQLDATABASE.");\n    process.exit(1);\n  } finally {\n    if (conn) conn.release();\n    await pool.end();\n  }\n}\n\nawait main();\n`;
fs.writeFileSync(initPath, initDbJs, 'utf8');

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
pkg.scripts = pkg.scripts || {};
pkg.scripts['init-db'] = 'node scripts/init-db.js';
pkg.scripts.start = 'node scripts/init-db.js && node server.js';
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

console.log('OK: patch 1.1.5 aplikován.');
console.log('- api/db.js umí DB_* i Railway MYSQL* proměnné');
console.log('- api/scripts/init-db.js připraví prázdnou databázi podle schema.sql');
console.log('- npm start nejdřív připraví DB a potom spustí server');
