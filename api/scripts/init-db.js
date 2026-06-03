import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as mariadb from "mariadb";
import dotenv from "dotenv";
import { dbConfig } from "../db.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.join(__dirname, "..", "schema.sql");

function splitSqlStatements(sql) {
  return sql
    .replace(/\r\n/g, "\n")
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean)
    .filter((statement) => !/^CREATE\s+DATABASE\b/i.test(statement))
    .filter((statement) => !/^USE\s+/i.test(statement));
}

async function main() {
  if (!fs.existsSync(schemaPath)) {
    console.log("DB init: schema.sql nenalezeno, přeskakuji.");
    return;
  }

  const safeConfig = {
    ...dbConfig,
    connectionLimit: 1,
  };

  const pool = mariadb.createPool(safeConfig);
  let conn;

  try {
    conn = await pool.getConnection();
    await conn.query("SELECT 1");

    const rawSql = fs.readFileSync(schemaPath, "utf8");
    const statements = splitSqlStatements(rawSql);

    for (const statement of statements) {
      await conn.query(statement);
    }

    console.log(`DB init OK: schéma připraveno v databázi "${safeConfig.database}".`);
  } catch (error) {
    console.error("DB init selhal:", error.message);
    console.error("Zkontroluj Railway Variables: DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME nebo MYSQLHOST/MYSQLPORT/MYSQLUSER/MYSQLPASSWORD/MYSQLDATABASE.");
    process.exit(1);
  } finally {
    if (conn) conn.release();
    await pool.end();
  }
}

await main();
