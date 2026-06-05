import fs from "fs";
import path from "path";

const root = process.cwd();
const target = path.join(root, "api", "scripts", "init-db.js");

if (!fs.existsSync(target)) {
  console.error("Nenalezen soubor api/scripts/init-db.js. Spusť skript z kořene projektu.");
  process.exit(1);
}

const content = `import fs from "fs";
import path from "path";
import * as mariadb from "mariadb";
import dotenv from "dotenv";

// Na Railway se startuje z adresáře api/, lokálně také typicky z api/.
// dotenv necháváme kvůli lokálnímu .env souboru.
dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || process.env.MYSQLHOST || "localhost",
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
  user: process.env.DB_USER || process.env.MYSQLUSER || "root",
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || "",
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || "tipovacka_ms2026",
  connectionLimit: 1,
  bigIntAsNumber: true,
};

function splitSqlStatements(schemaSql) {
  return schemaSql
    .replace(/^\\s*--.*$/gm, "")
    .split(/;\\s*(?:\\r?\\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function main() {
  const schemaPath = path.join(process.cwd(), "schema.sql");

  if (!fs.existsSync(schemaPath)) {
    throw new Error(
      `Soubor schema.sql nebyl nalezen. Očekávám ho zde: ${schemaPath}`
    );
  }

  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  const statements = splitSqlStatements(schemaSql);
  const pool = mariadb.createPool(dbConfig);

  let conn;
  try {
    conn = await pool.getConnection();

    for (const statement of statements) {
      await conn.query(statement);
    }

    console.log(
      `DB init OK: schéma připraveno v databázi "${dbConfig.database}".`
    );
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
    console.error(
      "Zkontroluj Railway Variables: DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME nebo MYSQLHOST/MYSQLPORT/MYSQLUSER/MYSQLPASSWORD/MYSQLDATABASE."
    );
    process.exit(1);
  });
`;

fs.writeFileSync(target, content, "utf8");
console.log("OK: opraveno api/scripts/init-db.js");
console.log("Doporučeno ověřit: cd api && node --check scripts/init-db.js");
