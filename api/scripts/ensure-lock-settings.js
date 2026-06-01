import { query } from "../db.js";

async function ensureColumn(columnName, ddl) {
  const rows = await query(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'scoring_settings'
       AND COLUMN_NAME = ?`,
    [columnName]
  );

  const count = Number(rows?.[0]?.count || 0);
  if (count === 0) {
    await query(ddl);
    console.log(`Doplněn sloupec scoring_settings.${columnName}`);
  } else {
    console.log(`Sloupec scoring_settings.${columnName} už existuje`);
  }
}

await ensureColumn(
  "tip_lock_mode",
  "ALTER TABLE scoring_settings ADD COLUMN tip_lock_mode ENUM('match_start','fixed_datetime') NOT NULL DEFAULT 'match_start' AFTER rules_text"
);

await ensureColumn(
  "tip_lock_at",
  "ALTER TABLE scoring_settings ADD COLUMN tip_lock_at DATETIME NULL AFTER tip_lock_mode"
);

await query(`
  UPDATE scoring_settings
  SET tip_lock_mode = COALESCE(tip_lock_mode, 'match_start')
  WHERE id IS NOT NULL
`);

console.log("Nastavení uzavírání tipů je připravené.");
process.exit(0);
