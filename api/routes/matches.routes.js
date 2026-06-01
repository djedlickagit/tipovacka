import { Router } from "express";
import { query } from "../db.js";
import { auth, requireAdmin } from "../middleware/auth.js";
import { getTipLockInfo } from "../utils/match.js";
import { getScoringSettings, evaluateMatchTips } from "../services/scoring.service.js";

const router = Router();

function cleanStage(value) {
  return String(value || "group").trim() || "group";
}

function cleanGroup(value) {
  const raw = String(value || "").trim().toUpperCase();
  return raw || null;
}

function publicMatch(row, settings = {}) {
  const lockInfo = getTipLockInfo(row, settings);
  return {
    ...row,
    tips_count: Number(row.tips_count || 0),
    tipped_players_count: Number(row.tipped_players_count || 0),
    locked_by_time: lockInfo.locked,
    lock_reason: lockInfo.code,
    lock_message: lockInfo.message,
    tip_lock_mode: settings.tip_lock_mode || "match_start",
    tip_lock_at: settings.tip_lock_at || null,
  };
}

async function getMatchById(id) {
  const rows = await query(
    `SELECT
       matches.*,
       COUNT(tips.id) AS tips_count,
       COUNT(DISTINCT tips.user_id) AS tipped_players_count
     FROM matches
     LEFT JOIN tips ON tips.match_id = matches.id
     WHERE matches.id = ?
     GROUP BY matches.id`,
    [id]
  );
  return rows[0] || null;
}

router.get("/", auth, async (req, res) => {
  try {
    const rows = await query(
      `SELECT
         matches.*,
         COUNT(tips.id) AS tips_count,
         COUNT(DISTINCT tips.user_id) AS tipped_players_count
       FROM matches
       LEFT JOIN tips ON tips.match_id = matches.id
       GROUP BY matches.id
       ORDER BY
         CASE WHEN matches.start_time IS NULL THEN 1 ELSE 0 END,
         matches.start_time ASC,
         matches.id ASC`
    );

    const settings = await getScoringSettings();
    res.json(rows.map((row) => publicMatch(row, settings)));
  } catch (err) {
    res.status(500).json({ error: "Nepodařilo se načíst zápasy.", detail: err.message });
  }
});

router.post("/", auth, requireAdmin, async (req, res) => {
  try {
    const stage = cleanStage(req.body.stage);
    const groupName = cleanGroup(req.body.group_name);
    const homeTeam = String(req.body.home_team || "").trim();
    const awayTeam = String(req.body.away_team || "").trim();
    const startTime = String(req.body.start_time || "").trim() || null;

    if (!homeTeam || !awayTeam) {
      return res.status(400).json({ error: "Vyplňte domácí i hostující tým." });
    }

    const result = await query(
      `INSERT INTO matches (stage, group_name, home_team, away_team, start_time, status)
       VALUES (?, ?, ?, ?, ?, 'scheduled')`,
      [stage, groupName, homeTeam, awayTeam, startTime]
    );

    const created = await getMatchById(result.insertId);
    const settings = await getScoringSettings();
    res.status(201).json(publicMatch(created, settings));
  } catch (err) {
    res.status(500).json({ error: "Nepodařilo se uložit zápas.", detail: err.message });
  }
});

router.put("/:id", auth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const stage = cleanStage(req.body.stage);
    const groupName = cleanGroup(req.body.group_name);
    const homeTeam = String(req.body.home_team || "").trim();
    const awayTeam = String(req.body.away_team || "").trim();
    const startTime = String(req.body.start_time || "").trim() || null;
    const status = String(req.body.status || "scheduled").trim() || "scheduled";

    if (!id) return res.status(400).json({ error: "Chybí ID zápasu." });
    if (!homeTeam || !awayTeam) {
      return res.status(400).json({ error: "Vyplňte domácí i hostující tým." });
    }

    await query(
      `UPDATE matches
       SET stage = ?, group_name = ?, home_team = ?, away_team = ?, start_time = ?, status = ?
       WHERE id = ?`,
      [stage, groupName, homeTeam, awayTeam, startTime, status, id]
    );

    const updated = await getMatchById(id);
    if (!updated) return res.status(404).json({ error: "Zápas nebyl nalezen." });

    const settings = await getScoringSettings();
    res.json(publicMatch(updated, settings));
  } catch (err) {
    res.status(500).json({ error: "Nepodařilo se upravit zápas.", detail: err.message });
  }
});

router.put("/:id/result", auth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const homeScore = req.body.home_score;
    const awayScore = req.body.away_score;

    if (!id) return res.status(400).json({ error: "Chybí ID zápasu." });
    if (!Number.isInteger(Number(homeScore)) || !Number.isInteger(Number(awayScore))) {
      return res.status(400).json({ error: "Skóre musí být celé číslo." });
    }

    await query(
      `UPDATE matches
       SET home_score = ?, away_score = ?, status = 'finished'
       WHERE id = ?`,
      [Number(homeScore), Number(awayScore), id]
    );

    const evaluation = await evaluateMatchTips(id);

    const updated = await getMatchById(id);
    if (!updated) return res.status(404).json({ error: "Zápas nebyl nalezen." });

    const settings = await getScoringSettings();
    res.json({ ...publicMatch(updated, settings), evaluation });
  } catch (err) {
    res.status(500).json({ error: "Nepodařilo se uložit výsledek.", detail: err.message });
  }
});

router.delete("/:id", auth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Chybí ID zápasu." });

    const match = await getMatchById(id);
    if (!match) return res.status(404).json({ error: "Zápas nebyl nalezen." });

    if (Number(match.tips_count || 0) > 0) {
      return res.status(400).json({ error: "Zápas nelze smazat, protože už k němu existují tipy. Uprav ho nebo ponech v archivu." });
    }

    await query("DELETE FROM matches WHERE id = ?", [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Nepodařilo se smazat zápas.", detail: err.message });
  }
});

export default router;
