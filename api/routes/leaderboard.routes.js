import { Router } from "express";
import { query } from "../db.js";
import { auth } from "../middleware/auth.js";

const router = Router();

router.get("/", auth, async (req, res) => {
  try {
    const rows = await query(
      `SELECT
         users.id,
         users.name,
         COALESCE(SUM(tips.points), 0) AS points,
         COUNT(tips.id) AS tips_count,
         SUM(CASE WHEN tips.points = settings.exact_score_points THEN 1 ELSE 0 END) AS exact_count,
         SUM(CASE WHEN tips.points = settings.correct_result_points THEN 1 ELSE 0 END) AS result_count
       FROM users
       LEFT JOIN tips ON tips.user_id = users.id
       CROSS JOIN (SELECT * FROM scoring_settings ORDER BY id ASC LIMIT 1) settings
       WHERE users.role = 'player' AND users.is_active = 1
       GROUP BY users.id, users.name
       ORDER BY points DESC, exact_count DESC, result_count DESC, users.name ASC`
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Nepodařilo se načíst žebříček.", detail: err.message });
  }
});

export default router;
