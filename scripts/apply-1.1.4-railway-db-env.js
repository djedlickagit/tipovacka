import fs from 'fs';
import path from 'path';

const dbPath = path.resolve('api/db.js');
if (!fs.existsSync(dbPath)) {
  console.error('Nenalezeno api/db.js. Spusť skript z kořene projektu.');
  process.exit(1);
}

const next = `import * as mariadb from "mariadb";
import dotenv from "dotenv";

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || process.env.MYSQLHOST || process.env.MARIADB_HOST || "localhost",
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || process.env.MARIADB_PORT || 3306),
  user: process.env.DB_USER || process.env.MYSQLUSER || process.env.MARIADB_USER || "root",
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || process.env.MARIADB_PASSWORD || "",
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || process.env.MARIADB_DATABASE || "tipovacka_ms2026",
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  bigIntAsNumber: true,
  connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT || 15000),
  acquireTimeout: Number(process.env.DB_ACQUIRE_TIMEOUT || 15000),
};

export const pool = mariadb.createPool(dbConfig);

export async function query(sql, params = []) {
  let conn;
  try {
    conn = await pool.getConnection();
    return await conn.query(sql, params);
  } finally {
    if (conn) conn.release();
  }
}

export function getDbConfigSafe() {
  return {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    database: dbConfig.database,
    hasPassword: Boolean(dbConfig.password),
    connectionLimit: dbConfig.connectionLimit,
  };
}
`;

fs.writeFileSync(dbPath, next, 'utf8');
console.log('OK: api/db.js upraveno pro Railway MYSQL* proměnné.');
