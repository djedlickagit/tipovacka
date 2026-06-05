import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.resolve(__dirname, "../schema.sql");

async function initDb() {
  if (!fs.existsSync(schemaPath)) {
    throw new Error("Soubor schema.sql nebyl nalezen: " + schemaPath);
  }

  const schema = fs.readFileSync(schemaPath, "utf8");

  const statements = schema
    .split(/;\s*(?:\r?\n|$)/g)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0)
    .filter((statement) => !statement.startsWith("--"));

  const conn = await pool.getConnection();

  try {
    for (const statement of statements) {
      await conn.query(statement);
    }

    const dbName =
      process.env.DB_NAME ||
      process.env.MYSQLDATABASE ||
      "tipovacka_ms2026";

    console.log('DB init OK: schéma připraveno v databázi "' + dbName + '".');
  } finally {
    conn.release();
    await pool.end();
  }
}

initDb().catch(async (error) => {
  console.error("DB init selhal:", error.message);
  console.error(
    "Zkontroluj Railway Variables: DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME nebo MYSQLHOST/MYSQLPORT/MYSQLUSER/MYSQLPASSWORD/MYSQLDATABASE."
  );

  try {
    await pool.end();
  } catch {}

  process.exit(1);
});
