import { Router } from "express";
import { auth, requireAdmin } from "../middleware/auth.js";
import { evaluateFinishedMatches, evaluateMatchTips } from "../services/scoring.service.js";

const router = Router();

router.post("/", auth, requireAdmin, async (req, res) => {
  try {
    const summary = await evaluateFinishedMatches();
    res.json({ ok: true, ...summary });
  } catch (err) {
    res.status(500).json({ error: "Nepodařilo se vyhodnotit tipy.", detail: err.message });
  }
});

router.post("/matches/:id", auth, requireAdmin, async (req, res) => {
  try {
    const matchId = Number(req.params.id);
    if (!matchId) return res.status(400).json({ error: "Chybí ID zápasu." });

    const summary = await evaluateMatchTips(matchId);
    res.json({ ok: true, ...summary });
  } catch (err) {
    res.status(500).json({ error: "Nepodařilo se vyhodnotit zápas.", detail: err.message });
  }
});

export default router;
