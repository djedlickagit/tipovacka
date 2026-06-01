import { Router } from "express";
import { query } from "../db.js";
import { auth } from "../middleware/auth.js";
import { getTipLockInfo } from "../utils/match.js";
import { getScoringSettings } from "../services/scoring.service.js";

const router = Router();

router.use(auth);

function asInt(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

router.get("/", async (req, res) => {
  try {
    const params = [];
    let where = "";

    if (req.user.role === "player") {
      where = "WHERE tips.user_id = ?";
      params.push(req.user.id);
    } else if (req.query.user_id) {
      where = "WHERE tips.user_id = ?";
      params.push(Number(req.query.user_id));
    }

    const rows = await query(
      `SELECT tips.*,
              users.name AS user_name,
              users.login_name AS user_login_name,
              matches.home_team,
              matches.away_team,
              matches.start_time,
              matches.stage,
              matches.group_name,
              matches.status,
              matches.home_score,
              matches.away_score
       FROM tips
       JOIN users ON users.id = tips.user_id
       JOIN matches ON matches.id = tips.match_id
       ${where}
       ORDER BY matches.start_time IS NULL, matches.start_time ASC, matches.id ASC, users.name ASC`,
      params
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Nepodařilo se načíst tipy.", detail: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const userId = req.user.role === "admin" ? asInt(req.body.user_id) : asInt(req.user.id);
    const matchId = asInt(req.body.match_id);
    const homeTip = asInt(req.body.home_tip);
    const awayTip = asInt(req.body.away_tip);

    if (!userId || !matchId || homeTip === null || awayTip === null) {
      return res.status(400).json({ error: "Vyberte zápas a vyplňte tip." });
    }

    if (homeTip < 0 || awayTip < 0) {
      return res.status(400).json({ error: "Tip nemůže obsahovat záporné skóre." });
    }

    const users = await query("SELECT id, role, is_active FROM users WHERE id = ?", [userId]);
    if (!users.length) return res.status(404).json({ error: "Tipovač nebyl nalezen." });
    if (Number(users[0].is_active) === 0) return res.status(400).json({ error: "Neaktivní tipovač nemůže tipovat." });

    const matches = await query("SELECT * FROM matches WHERE id = ?", [matchId]);
    if (!matches.length) return res.status(404).json({ error: "Zápas nebyl nalezen." });

    const match = matches[0];
    const settings = await getScoringSettings();

    if (req.user.role !== "admin") {
      const lockInfo = getTipLockInfo(match, settings);
      if (lockInfo.locked) {
        return res.status(423).json({
          error: lockInfo.message || "Tipování tohoto zápasu je už uzamčeno.",
          code: lockInfo.code || "locked",
        });
      }
    }

    await query(
      `INSERT INTO tips (user_id, match_id, home_tip, away_tip)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         home_tip = VALUES(home_tip),
         away_tip = VALUES(away_tip),
         points = NULL,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, matchId, homeTip, awayTip]
    );

    const rows = await query("SELECT * FROM tips WHERE user_id = ? AND match_id = ?", [userId, matchId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Nepodařilo se uložit tip.", detail: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const tipId = asInt(req.params.id);
    if (!tipId) return res.status(400).json({ error: "Chybí ID tipu." });

    const rows = await query(
      `SELECT tips.*, matches.status, matches.start_time, matches.home_team, matches.away_team
       FROM tips
       JOIN matches ON matches.id = tips.match_id
       WHERE tips.id = ?
       LIMIT 1`,
      [tipId]
    );

    if (!rows.length) return res.status(404).json({ error: "Tip nebyl nalezen." });

    const tip = rows[0];
    const settings = await getScoringSettings();

    if (req.user.role !== "admin") {
      if (Number(tip.user_id) !== Number(req.user.id)) {
        return res.status(403).json({ error: "Tento tip nemůžeš smazat." });
      }

      const lockInfo = getTipLockInfo(tip, settings);
      if (lockInfo.locked) {
        return res.status(423).json({
          error: lockInfo.message || "Uzamčený tip už nejde smazat.",
          code: lockInfo.code || "locked",
        });
      }
    }

    await query("DELETE FROM tips WHERE id = ?", [tipId]);

    res.json({ ok: true, deletedCount: 1, id: tipId });
  } catch (err) {
    res.status(500).json({ error: "Nepodařilo se smazat tip.", detail: err.message });
  }
});

router.post("/bulk-delete", async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Hromadné mazání může provést pouze admin." });
    }

    const ids = Array.isArray(req.body.ids)
      ? req.body.ids.map(asInt).filter(Boolean)
      : [];

    const uniqueIds = [...new Set(ids)];

    if (!uniqueIds.length) {
      return res.status(400).json({ error: "Vyberte alespoň jeden tip ke smazání." });
    }

    const placeholders = uniqueIds.map(() => "?").join(",");
    const result = await query(`DELETE FROM tips WHERE id IN (${placeholders})`, uniqueIds);

    res.json({ ok: true, deletedCount: Number(result.affectedRows || 0) });
  } catch (err) {
    res.status(500).json({ error: "Nepodařilo se hromadně smazat tipy.", detail: err.message });
  }
});

export default router;
