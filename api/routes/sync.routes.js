import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { query } from "../db.js";
import { auth, requireAdmin } from "../middleware/auth.js";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "data");
const SAMPLE_PATH = path.join(DATA_DIR, "worldcup2026-sample.json");
const SEED_PATH = path.join(DATA_DIR, "worldcup2026-seed.json");

const STAGES = new Set(["group", "round_of_32", "round_of_16", "quarter_final", "semi_final", "third_place", "final"]);
const STATUSES = new Set(["scheduled", "locked", "finished", "evaluated"]);

function cleanString(value, fallback = null) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function cleanStage(value) {
  const stage = cleanString(value, "group");
  return STAGES.has(stage) ? stage : "group";
}

function cleanStatus(value, hasScore = false) {
  const status = cleanString(value, hasScore ? "finished" : "scheduled");
  return STATUSES.has(status) ? status : (hasScore ? "finished" : "scheduled");
}

function cleanGroup(value) {
  const group = cleanString(value, null);
  return group ? group.toUpperCase() : null;
}

function normalizeScore(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

function normalizeStartTime(value) {
  const raw = cleanString(value, null);
  if (!raw) return null;

  // MySQL DATETIME v aplikaci ukládáme lokálně bez časové zóny.
  // Přijmeme ISO i "YYYY-MM-DD HH:mm:ss" a sjednotíme na "YYYY-MM-DD HH:mm:ss".
  const normalized = raw.replace("T", " ").replace(/\.\d{3}Z$/, "").replace(/Z$/, "");
  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})\s(\d{2}:\d{2})(?::(\d{2}))?/);
  if (match) return `${match[1]} ${match[2]}:${match[3] || "00"}`;

  return raw;
}

function normalizeMatch(raw = {}, fallbackSource = "manual-json") {
  const homeScore = normalizeScore(raw.home_score ?? raw.homeScore);
  const awayScore = normalizeScore(raw.away_score ?? raw.awayScore);
  const hasScore = homeScore !== null && awayScore !== null;

  return {
    external_id: cleanString(raw.external_id ?? raw.externalId ?? raw.id, null),
    source: cleanString(raw.source, fallbackSource),
    stage: cleanStage(raw.stage),
    group_name: cleanGroup(raw.group_name ?? raw.groupName ?? raw.group),
    home_team: cleanString(raw.home_team ?? raw.homeTeam ?? raw.home?.name ?? raw.home, ""),
    away_team: cleanString(raw.away_team ?? raw.awayTeam ?? raw.away?.name ?? raw.away, ""),
    start_time: normalizeStartTime(raw.start_time ?? raw.startTime ?? raw.date ?? raw.kickoff),
    venue: cleanString(raw.venue ?? raw.stadium, null),
    status: cleanStatus(raw.status, hasScore),
    home_score: homeScore,
    away_score: awayScore,
  };
}

function getImportMode(payload = {}) {
  // Výchozí režim je záměrně bezpečný: jen doplňuje chybějící zápasy.
  // Existující zápasy nepřepisuje, aby se neztratily ruční úpravy nebo výsledky.
  if (payload.force_update === true || payload.forceUpdate === true) return "upsert_all";
  if (payload.mode === "upsert_all") return "upsert_all";
  return "insert_missing";
}

async function addSyncLog({ source, action, status = "ok", message = "", importedCount = 0, updatedCount = 0 }) {
  await query(
    `INSERT INTO sync_logs (source, action, status, message, imported_count, updated_count)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [source || "unknown", action, status, message, importedCount, updatedCount]
  );
}

async function findExistingMatch(match) {
  if (match.external_id) {
    const byExternal = await query(
      `SELECT * FROM matches WHERE source = ? AND external_id = ? LIMIT 1`,
      [match.source, match.external_id]
    );
    if (byExternal[0]) return byExternal[0];
  }

  if (match.start_time && match.home_team && match.away_team) {
    const byTeams = await query(
      `SELECT * FROM matches
       WHERE start_time = ? AND home_team = ? AND away_team = ?
       LIMIT 1`,
      [match.start_time, match.home_team, match.away_team]
    );
    if (byTeams[0]) return byTeams[0];
  }

  return null;
}

function buildPreview(payload = {}, existingMap = new Map()) {
  const source = cleanString(payload.source, "manual-json");
  const rawMatches = Array.isArray(payload.matches) ? payload.matches : [];
  const mode = getImportMode(payload);

  let validCount = 0;
  let insertCount = 0;
  let updateCount = 0;
  let keepCount = 0;
  const skipped = [];
  const conflicts = [];

  for (const raw of rawMatches) {
    const match = normalizeMatch(raw, source);
    if (!match.home_team || !match.away_team) {
      skipped.push({ reason: "missing_teams", raw });
      continue;
    }
    validCount++;

    const keyExternal = match.external_id ? `external:${match.source}:${match.external_id}` : null;
    const keyTeams = match.start_time ? `teams:${match.start_time}:${match.home_team}:${match.away_team}` : null;
    const existing = (keyExternal && existingMap.get(keyExternal)) || (keyTeams && existingMap.get(keyTeams));

    if (!existing) {
      insertCount++;
      continue;
    }

    if (mode === "upsert_all") {
      updateCount++;
      conflicts.push({ id: existing.id, external_id: match.external_id, home_team: match.home_team, away_team: match.away_team, action: "update" });
    } else {
      keepCount++;
      conflicts.push({ id: existing.id, external_id: match.external_id, home_team: match.home_team, away_team: match.away_team, action: "keep" });
    }
  }

  return {
    source,
    mode,
    totalCount: rawMatches.length,
    validCount,
    insertCount,
    updateCount,
    keepCount,
    skippedCount: skipped.length,
    skipped,
    conflicts: conflicts.slice(0, 30),
  };
}

async function loadExistingMap(source, matches = []) {
  const externalIds = matches.map((m) => m.external_id).filter(Boolean);
  const map = new Map();

  if (externalIds.length) {
    const placeholders = externalIds.map(() => "?").join(",");
    const rows = await query(
      `SELECT * FROM matches WHERE source = ? AND external_id IN (${placeholders})`,
      [source, ...externalIds]
    );
    for (const row of rows) {
      map.set(`external:${row.source}:${row.external_id}`, row);
    }
  }

  for (const match of matches) {
    if (!match.start_time || !match.home_team || !match.away_team) continue;
    const rows = await query(
      `SELECT * FROM matches WHERE start_time = ? AND home_team = ? AND away_team = ? LIMIT 1`,
      [match.start_time, match.home_team, match.away_team]
    );
    if (rows[0]) map.set(`teams:${match.start_time}:${match.home_team}:${match.away_team}`, rows[0]);
  }

  return map;
}

async function previewMatches(payload = {}) {
  const source = cleanString(payload.source, "manual-json");
  const normalized = (Array.isArray(payload.matches) ? payload.matches : []).map((raw) => normalizeMatch(raw, source));
  const existingMap = await loadExistingMap(source, normalized);
  return buildPreview(payload, existingMap);
}

async function importMatches(payload = {}, action = "import-json") {
  const source = cleanString(payload.source, "manual-json");
  const rawMatches = Array.isArray(payload.matches) ? payload.matches : [];
  const mode = getImportMode(payload);

  let importedCount = 0;
  let updatedCount = 0;
  let keptCount = 0;
  const skipped = [];

  for (const raw of rawMatches) {
    const match = normalizeMatch(raw, source);

    if (!match.home_team || !match.away_team) {
      skipped.push({ reason: "missing_teams", raw });
      continue;
    }

    const existing = await findExistingMatch(match);

    if (existing) {
      if (mode !== "upsert_all") {
        // Pouze doplníme identifikátory/sync metadata, pokud chybí. Obsah zápasu nepřepisujeme.
        await query(
          `UPDATE matches
           SET external_id = COALESCE(external_id, ?),
               source = COALESCE(source, ?),
               synced_at = COALESCE(synced_at, NOW())
           WHERE id = ?`,
          [match.external_id, match.source, existing.id]
        );
        keptCount++;
        continue;
      }

      await query(
        `UPDATE matches
         SET external_id = COALESCE(?, external_id),
             source = COALESCE(?, source),
             stage = ?,
             group_name = ?,
             home_team = ?,
             away_team = ?,
             start_time = ?,
             venue = ?,
             home_score = ?,
             away_score = ?,
             status = ?,
             synced_at = NOW()
         WHERE id = ?`,
        [
          match.external_id,
          match.source,
          match.stage,
          match.group_name,
          match.home_team,
          match.away_team,
          match.start_time,
          match.venue,
          match.home_score,
          match.away_score,
          match.status,
          existing.id,
        ]
      );
      updatedCount++;
    } else {
      await query(
        `INSERT INTO matches
          (external_id, source, stage, group_name, home_team, away_team, start_time, venue, home_score, away_score, status, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          match.external_id,
          match.source,
          match.stage,
          match.group_name,
          match.home_team,
          match.away_team,
          match.start_time,
          match.venue,
          match.home_score,
          match.away_score,
          match.status,
        ]
      );
      importedCount++;
    }
  }

  await addSyncLog({
    source,
    action,
    status: "ok",
    message: `Import dokončen. Nové: ${importedCount}, aktualizované: ${updatedCount}, ponechané: ${keptCount}, přeskočené: ${skipped.length}.`,
    importedCount,
    updatedCount,
  });

  return {
    ok: true,
    source,
    mode,
    importedCount,
    updatedCount,
    keptCount,
    skippedCount: skipped.length,
    skipped,
  };
}

async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function sendJsonFile(res, filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  res.type("application/json").send(raw);
}

router.get("/status", auth, requireAdmin, async (req, res) => {
  try {
    const rows = await query(
      `SELECT
         COUNT(*) AS total_matches,
         SUM(CASE WHEN source IS NOT NULL AND source <> '' THEN 1 ELSE 0 END) AS synced_matches,
         MAX(synced_at) AS last_synced_at
       FROM matches`
    );

    const logs = await query(
      `SELECT * FROM sync_logs ORDER BY created_at DESC, id DESC LIMIT 8`
    );

    res.json({
      ok: true,
      status: rows[0] || {},
      logs,
    });
  } catch (err) {
    res.status(500).json({ error: "Nepodařilo se načíst stav synchronizace.", detail: err.message });
  }
});

router.get("/logs", auth, requireAdmin, async (req, res) => {
  try {
    const logs = await query(`SELECT * FROM sync_logs ORDER BY created_at DESC, id DESC LIMIT 50`);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: "Nepodařilo se načíst log synchronizace.", detail: err.message });
  }
});

router.get("/sample-json", auth, requireAdmin, async (req, res) => {
  try {
    await sendJsonFile(res, SAMPLE_PATH);
  } catch (err) {
    res.status(500).json({ error: "Nepodařilo se načíst ukázkový JSON.", detail: err.message });
  }
});

router.get("/seed-json", auth, requireAdmin, async (req, res) => {
  try {
    await sendJsonFile(res, SEED_PATH);
  } catch (err) {
    res.status(500).json({ error: "Nepodařilo se načíst seed rozpis.", detail: err.message });
  }
});

router.post("/preview-json", auth, requireAdmin, async (req, res) => {
  try {
    const result = await previewMatches(req.body || {});
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: "Nepodařilo se připravit náhled importu.", detail: err.message });
  }
});

router.post("/preview-seed", auth, requireAdmin, async (req, res) => {
  try {
    const payload = await readJsonFile(SEED_PATH);
    payload.mode = req.body?.mode;
    payload.force_update = req.body?.force_update;
    const result = await previewMatches(payload);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: "Nepodařilo se připravit náhled seedu.", detail: err.message });
  }
});

router.post("/import-sample", auth, requireAdmin, async (req, res) => {
  try {
    const payload = await readJsonFile(SAMPLE_PATH);
    payload.mode = req.body?.mode;
    payload.force_update = req.body?.force_update;
    const result = await importMatches(payload, "import-sample");
    res.json(result);
  } catch (err) {
    await addSyncLog({ source: "sample-ms2026", action: "import-sample", status: "error", message: err.message });
    res.status(500).json({ error: "Nepodařilo se importovat ukázková data.", detail: err.message });
  }
});

router.post("/import-seed", auth, requireAdmin, async (req, res) => {
  try {
    const payload = await readJsonFile(SEED_PATH);
    payload.mode = req.body?.mode;
    payload.force_update = req.body?.force_update;
    const result = await importMatches(payload, "import-seed");
    res.json(result);
  } catch (err) {
    await addSyncLog({ source: "ms2026-seed", action: "import-seed", status: "error", message: err.message });
    res.status(500).json({ error: "Nepodařilo se importovat seed MS 2026.", detail: err.message });
  }
});

router.post("/import-json", auth, requireAdmin, async (req, res) => {
  try {
    const result = await importMatches(req.body || {}, "import-json");
    res.json(result);
  } catch (err) {
    await addSyncLog({ source: req.body?.source || "manual-json", action: "import-json", status: "error", message: err.message });
    res.status(500).json({ error: "Nepodařilo se importovat JSON.", detail: err.message });
  }
});

export default router;
