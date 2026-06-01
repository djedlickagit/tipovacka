import { query } from "../db.js";
import { hashSecret } from "../services/auth.service.js";

async function columnExists(name) {
  const rows = await query(
    `SELECT COUNT(*) AS total
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = ?`,
    [name]
  );
  return Number(rows?.[0]?.total || 0) > 0;
}

async function addColumnIfMissing(name, ddl) {
  if (!(await columnExists(name))) {
    await query(`ALTER TABLE users ADD COLUMN ${ddl}`);
    console.log(`Doplněn sloupec users.${name}`);
  }
}

await addColumnIfMissing("login_name", "login_name VARCHAR(120) NULL AFTER name");
await addColumnIfMissing("password_hash", "password_hash VARCHAR(255) NULL AFTER email");
await addColumnIfMissing("pin_hash", "pin_hash VARCHAR(255) NULL AFTER password_hash");
await addColumnIfMissing("is_active", "is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER role");

const adminHash = await hashSecret("admin2026");
const adminRows = await query("SELECT * FROM users WHERE login_name = 'admin' OR role = 'admin' OR LOWER(name) = 'admin' LIMIT 1");

if (!adminRows.length) {
  await query(
    `INSERT INTO users (name, login_name, email, role, password_hash, pin_hash, is_active)
     VALUES ('Admin', 'admin', 'admin@tipovacka.local', 'admin', ?, NULL, 1)`,
    [adminHash]
  );
  console.log("Vytvořen výchozí admin admin / admin2026");
} else {
  const admin = adminRows[0];
  if (!admin.login_name || !admin.password_hash || Number(admin.is_active) !== 1) {
    await query(
      `UPDATE users
       SET login_name = 'admin', password_hash = COALESCE(password_hash, ?), role = 'admin', is_active = 1
       WHERE id = ?`,
      [adminHash, admin.id]
    );
    console.log("Zkontrolován výchozí admin účet.");
  }
}

console.log("Správa tipovačů připravena.");
process.exit(0);
