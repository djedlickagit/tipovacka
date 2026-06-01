import { query } from "../db.js";

async function columnExists(tableName, columnName) {
  const rows = await query(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return Number(rows?.[0]?.count || 0) > 0;
}

async function addColumnIfMissing(tableName, columnName, definition) {
  if (await columnExists(tableName, columnName)) {
    console.log(`OK: ${tableName}.${columnName} už existuje`);
    return;
  }

  console.log(`Přidávám ${tableName}.${columnName}...`);
  await query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

async function indexExists(tableName, indexName) {
  const rows = await query(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?`,
    [tableName, indexName]
  );
  return Number(rows?.[0]?.count || 0) > 0;
}

async function addIndexIfMissing(tableName, indexName, sql) {
  if (await indexExists(tableName, indexName)) {
    console.log(`OK: index ${indexName} už existuje`);
    return;
  }

  console.log(`Přidávám index ${indexName}...`);
  await query(sql);
}

await addColumnIfMissing("matches", "external_id", "VARCHAR(120) NULL AFTER id");
await addColumnIfMissing("matches", "source", "VARCHAR(60) NULL AFTER external_id");
await addColumnIfMissing("matches", "venue", "VARCHAR(190) NULL AFTER start_time");
await addColumnIfMissing("matches", "synced_at", "DATETIME NULL AFTER status");

await addIndexIfMissing(
  "matches",
  "idx_matches_source_external",
  "ALTER TABLE matches ADD INDEX idx_matches_source_external (source, external_id)"
);

await query(`
  CREATE TABLE IF NOT EXISTS sync_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source VARCHAR(60) NOT NULL DEFAULT 'sample',
    action VARCHAR(80) NOT NULL,
    status ENUM('ok','error') NOT NULL DEFAULT 'ok',
    message TEXT NULL,
    imported_count INT NOT NULL DEFAULT 0,
    updated_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
`);

console.log("✅ Sync schéma je připravené.");
process.exit(0);
