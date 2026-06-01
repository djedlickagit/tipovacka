import { Router } from "express";
import { query } from "../db.js";
import { auth, requireAdmin } from "../middleware/auth.js";
import { getScoringSettings } from "../services/scoring.service.js";

const router = Router();

function normalizeLockMode(value) {
  return value === "fixed_datetime" ? "fixed_datetime" : "match_start";
}

function normalizeLockAt(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  return raw.replace("T", " ");
}

router.get("/scoring", auth, async (req, res) => {
  try {
    const settings = await getScoringSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: "Nepodařilo se načíst nastavení.", detail: err.message });
  }
});

router.put("/scoring", auth, requireAdmin, async (req, res) => {
  try {
    const settings = await getScoringSettings();
    const exact = Number(req.body.exact_score_points);
    const correct = Number(req.body.correct_result_points);
    const wrong = Number(req.body.wrong_tip_points);
    const rulesText = String(req.body.rules_text || "");
    const lockMode = normalizeLockMode(req.body.tip_lock_mode);
    const lockAt = normalizeLockAt(req.body.tip_lock_at);

    if (![exact, correct, wrong].every(Number.isInteger)) {
      return res.status(400).json({ error: "Body musí být celá čísla." });
    }

    if (lockMode === "fixed_datetime" && !lockAt) {
      return res.status(400).json({ error: "Pro pevné uzavření tipování zadej datum a čas." });
    }

    await query(
      `UPDATE scoring_settings
       SET exact_score_points = ?,
           correct_result_points = ?,
           wrong_tip_points = ?,
           rules_text = ?,
           tip_lock_mode = ?,
           tip_lock_at = ?
       WHERE id = ?`,
      [exact, correct, wrong, rulesText, lockMode, lockMode === "fixed_datetime" ? lockAt : null, settings.id]
    );

    const updated = await getScoringSettings();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Nepodařilo se uložit nastavení.", detail: err.message });
  }
});

export default router;
