import * as mariadb from "mariadb";
import dotenv from "dotenv";

dotenv.config();

export const pool = mariadb.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "tipovacka_ms2026",
  connectionLimit: 10,
  bigIntAsNumber: true,
});

export async function query(sql, params = []) {
  let conn;

  try {
    conn = await pool.getConnection();
    const result = await conn.query(sql, params);

    return JSON.parse(
      JSON.stringify(result, (_, value) =>
        typeof value === "bigint" ? Number(value) : value
      )
    );
  } catch (error) {
    console.error("DB chyba:", error);
    throw error;
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

export async function testConnection() {
  const rows = await query("SELECT 1 AS ok");
  return rows?.[0]?.ok === 1;
}
