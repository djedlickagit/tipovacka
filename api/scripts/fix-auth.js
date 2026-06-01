import { query } from "../db.js";
import { sha256 } from "../services/auth.service.js";

async function columnExists(table, column) {
  const rows = await query(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [table, column]
  );

  return Number(rows?.[0]?.count || 0) > 0;
}

async function addColumnIfMissing(table, column, ddl) {
  if (await columnExists(table, column)) {
    console.log(`OK: ${table}.${column} už existuje`);
    return;
  }

  console.log(`Přidávám: ${table}.${column}`);
  await query(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

async function main() {
  await addColumnIfMissing("users", "login_name", "login_name VARCHAR(120) NULL AFTER name");
  await addColumnIfMissing("users", "password_hash", "password_hash VARCHAR(255) NULL AFTER email");
  await addColumnIfMissing("users", "pin_hash", "pin_hash VARCHAR(255) NULL AFTER password_hash");
  await addColumnIfMissing("users", "is_active", "is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER role");

  const adminHash = sha256("admin2026");
  const davidPinHash = sha256("1234");

  const admins = await query(
    `SELECT id FROM users
     WHERE login_name = 'admin' OR LOWER(name) = 'admin' OR role = 'admin'
     ORDER BY id ASC
     LIMIT 1`
  );

  if (admins.length) {
    await query(
      `UPDATE users
       SET login_name = 'admin',
           password_hash = ?,
           pin_hash = NULL,
           role = 'admin',
           is_active = 1
       WHERE id = ?`,
      [adminHash, admins[0].id]
    );
  } else {
    await query(
      `INSERT INTO users (name, login_name, email, role, password_hash, pin_hash, is_active)
       VALUES ('Admin', 'admin', 'admin@tipovacka.local', 'admin', ?, NULL, 1)`,
      [adminHash]
    );
  }

  const davids = await query(
    `SELECT id FROM users
     WHERE login_name = 'david' OR LOWER(name) = 'david'
     ORDER BY id ASC
     LIMIT 1`
  );

  if (davids.length) {
    await query(
      `UPDATE users
       SET login_name = 'david',
           pin_hash = ?,
           role = 'player',
           is_active = 1
       WHERE id = ?`,
      [davidPinHash, davids[0].id]
    );
  } else {
    await query(
      `INSERT INTO users (name, login_name, email, role, password_hash, pin_hash, is_active)
       VALUES ('David', 'david', NULL, 'player', NULL, ?, 1)`,
      [davidPinHash]
    );
  }

  console.log("");
  console.log("Hotovo: auth databáze je srovnaná.");
  console.log("Admin: login admin / heslo admin2026");
  console.log("Ukázkový tipovač: login david / PIN 1234");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("fix-auth selhal:", error.message);
    process.exit(1);
  });
