import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { query } from "../db.js";
import { auth, requireAdmin } from "../middleware/auth.js";
import { evaluateMatchTips } from "../services/scoring.service.js";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "data");
const SAMPLE_RESULTS_PATH = path.join(DATA_DIR, "worldcup2026-results.sample.json");

function cleanString(value, fallback = null) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalizeScore(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

function normalizeStartTime(value) {
  const raw = cleanString(value, null);
  if (!raw) return null;
  const normalized = raw.replace("T", " ").replace(/\.\d{3}Z$/, "").replace(/Z$/, "");
  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})\s(\d{2}:\d{2})(?::(\d{2}))?/);
  if (match) return `${match[1]} ${match[2]}:${match[3] || "00"}`;
  return raw;
}

function normalizeResult(raw = {}, fallbackSource = "results-sync") {
  return {
    external_id: cleanString(raw.external_id ?? raw.externalId ?? raw.id, null),
    source: cleanString(raw.source, fallbackSource),
    home_team: cleanString(raw.home_team ?? raw.homeTeam ?? raw.home?.name ?? raw.home, null),
    away_team: cleanString(raw.away_team ?? raw.awayTeam ?? raw.away?.name ?? raw.away, null),
    start_time: normalizeStartTime(raw.start_time ?? raw.startTime ?? raw.date ?? raw.kickoff),
    home_score: normalizeScore(raw.home_score ?? raw.homeScore ?? raw.home?.score),
    away_score: normalizeScore(raw.away_score ?? raw.awayScore ?? raw.away?.score),
    status: cleanString(raw.status, "finished"),
  };
}

async function addSyncLog({ action, status = "ok", message = "", importedCount = 0, updatedCount = 0 }) {
  try {
    await query(
      `INSERT INTO sync_logs (source, action, status, message, imported_count, updated_count)
       VALUES ('results-sync', ?, ?, ?, ?, ?)`,
      [action, status, message, importedCount, updatedCount]
    );
  } catch {
    // Starší instalace nemusí mít sync_logs. Synchronizace výsledků kvůli tomu nesmí spadnout.
  }
}

async function loadPayload(body = {}) {
  if (Array.isArray(body.results)) {
    return { source: cleanString(body.source, "manual-results-json"), results: body.results };
  }

  const configuredUrl = cleanString(process.env.RESULTS_SYNC_URL, null);
  if (configuredUrl) {
    const response = await fetch(configuredUrl, {
      headers: process.env.RESULTS_SYNC_TOKEN
        ? { Authorization: `Bearer ${process.env.RESULTS_SYNC_TOKEN}` }
        : {},
    });

    if (!response.ok) {
      throw new Error(`Zdroj výsledků vrátil HTTP ${response.status}.`);
    }

    const json = await response.json();
    return { source: cleanString(json.source, "external-results-api"), results: Array.isArray(json.results) ? json.results : [] };
  }

  const text = await fs.readFile(SAMPLE_RESULTS_PATH, "utf8");
  const json = JSON.parse(text);
  return { source: cleanString(json.source, "sample-results"), results: Array.isArray(json.results) ? json.results : [] };
}

async function findMatchForResult(result) {
  if (result.external_id) {
    const rows = await query(`SELECT * FROM matches WHERE external_id = ? ORDER BY id ASC LIMIT 1`, [result.external_id]);
    if (rows[0]) return rows[0];
  }

  if (result.start_time && result.home_team && result.away_team) {
    const rows = await query(
      `SELECT * FROM matches
       WHERE start_time = ? AND home_team = ? AND away_team = ?
       ORDER BY id ASC LIMIT 1`,
      [result.start_time, result.home_team, result.away_team]
    );
    if (rows[0]) return rows[0];
  }

  if (result.home_team && result.away_team) {
    const rows = await query(
      `SELECT * FROM matches
       WHERE home_team = ? AND away_team = ?
       ORDER BY CASE WHEN start_time IS NULL THEN 1 ELSE 0 END, start_time ASC, id ASC
       LIMIT 1`,
      [result.home_team, result.away_team]
    );
    if (rows[0]) return rows[0];
  }

  return null;
}

function hasScore(result) {
  return result.home_score !== null && result.away_score !== null;
}

function scoreChanged(match, result) {
  return Number(match.home_score) !== Number(result.home_score) || Number(match.away_score) !== Number(result.away_score);
}

async function buildPreview(payload) {
  const normalized = payload.results.map((raw) => normalizeResult(raw, payload.source));
  const items = [];
  let matchedCount = 0;
  let changeCount = 0;
  let sameCount = 0;
  let skippedCount = 0;

  for (const result of normalized) {
    if (!hasScore(result)) {
      skippedCount++;
      items.push({ action: "skip", reason: "missing_score", result });
      continue;
    }

    const match = await findMatchForResult(result);
    if (!match) {
      skippedCount++;
      items.push({ action: "skip", reason: "match_not_found", result });
      continue;
    }

    matchedCount++;
    const changed = scoreChanged(match, result) || !["finished", "evaluated"].includes(match.status);
    if (changed) changeCount += 1;
    else sameCount += 1;

    items.push({
      action: changed ? "update" : "same",
      match_id: match.id,
      external_id: match.external_id,
      home_team: match.home_team,
      away_team: match.away_team,
      start_time: match.start_time,
      current_score: match.home_score === null || match.away_score === null ? null : `${match.home_score}:${match.away_score}`,
      new_score: `${result.home_score}:${result.away_score}`,
      status: match.status,
    });
  }

  return {
    source: payload.source,
    totalCount: normalized.length,
    matchedCount,
    changeCount,
    sameCount,
    skippedCount,
    items: items.slice(0, 80),
  };
}

router.get("/status", auth, requireAdmin, async (req, res) => {
  try {
    const configured = Boolean(cleanString(process.env.RESULTS_SYNC_URL, null));
    const lastRows = await query(
      `SELECT * FROM sync_logs WHERE source = 'results-sync' ORDER BY created_at DESC, id DESC LIMIT 5`
    ).catch(() => []);

    res.json({
      configured,
      source: configured ? "RESULTS_SYNC_URL" : "lokální ukázkový soubor",
      autoHint: configured
        ? "Zdroj výsledků je nastavený v .env. Kontrola stáhne data z externí adresy."
        : "RESULTS_SYNC_URL není nastavený, proto se použije pouze ukázkový soubor.",
      logs: lastRows,
    });
  } catch (err) {
    res.status(500).json({ error: "Nepodařilo se načíst stav výsledkové synchronizace.", detail: err.message });
  }
});

router.post("/preview", auth, requireAdmin, async (req, res) => {
  try {
    const payload = await loadPayload(req.body || {});
    const preview = await buildPreview(payload);
    await addSyncLog({ action: "results-preview", message: `Náhled: změny ${preview.changeCount}, beze změny ${preview.sameCount}, přeskočeno ${preview.skippedCount}.` });
    res.json(preview);
  } catch (err) {
    await addSyncLog({ action: "results-preview", status: "error", message: err.message });
    res.status(500).json({ error: "Nepodařilo se zkontrolovat výsledky.", detail: err.message });
  }
});

router.post("/apply", auth, requireAdmin, async (req, res) => {
  try {
    const payload = await loadPayload(req.body || {});
    const preview = await buildPreview(payload);
    const toUpdate = preview.items.filter((item) => item.action === "update");
    let updatedCount = 0;
    let evaluatedTips = 0;

    for (const item of toUpdate) {
      const [home, away] = item.new_score.split(":").map(Number);
      await query(
        `UPDATE matches
         SET home_score = ?, away_score = ?, status = 'finished', synced_at = NOW()
         WHERE id = ?`,
        [home, away, item.match_id]
      );
      const evaluation = await evaluateMatchTips(item.match_id);
      evaluatedTips += Number(evaluation.evaluated_tips || 0);
      updatedCount += 1;
    }

    await addSyncLog({
      action: "results-apply",
      message: `Zapsáno ${updatedCount} výsledků, vyhodnoceno ${evaluatedTips} tipů.`,
      updatedCount,
    });

    res.json({ ...preview, updatedCount, evaluatedTips });
  } catch (err) {
    await addSyncLog({ action: "results-apply", status: "error", message: err.message });
    res.status(500).json({ error: "Nepodařilo se propsat výsledky.", detail: err.message });
  }
});

export default router;
