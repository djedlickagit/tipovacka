import * as mariadb from "mariadb";
import dotenv from "dotenv";

dotenv.config();

export const pool = mariadb.createPool({
  host: process.env.DB_HOST || process.env.MYSQLHOST || "localhost",
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
  user: process.env.DB_USER || process.env.MYSQLUSER || "root",
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || "",
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || "tipovacka_ms2026",
  connectionLimit: 10,
  bigIntAsNumber: true,
});

export async function query(sql, params = []) {
  let conn;
  try {
    conn = await pool.getConnection();
    return await conn.query(sql, params);
  } finally {
    if (conn) conn.release();
  }
}
