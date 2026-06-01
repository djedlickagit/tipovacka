import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db.js";
import { auth, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.use(auth, requireAdmin);

function cleanLogin(value, fallback = "") {
  return String(value || fallback || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    login_name: row.login_name,
    email: row.email,
    role: row.role,
    is_active: Number(row.is_active) === 1,
    has_pin: Boolean(row.pin_hash),
    has_password: Boolean(row.password_hash),
    tips_count: Number(row.tips_count || 0),
    points: Number(row.points || 0),
    exact_count: Number(row.exact_count || 0),
    result_count: Number(row.result_count || row.correct_result_count || 0),
  };
}

async function hashSecret(value) {
  return bcrypt.hash(String(value || ""), 10);
}

async function getUserById(id) {
  const rows = await query(
    `SELECT
       users.*,
       COUNT(tips.id) AS tips_count,
       COALESCE(SUM(tips.points), 0) AS points,
       SUM(CASE WHEN tips.points = settings.exact_score_points THEN 1 ELSE 0 END) AS exact_count,
       SUM(CASE WHEN tips.points = settings.correct_result_points THEN 1 ELSE 0 END) AS result_count
     FROM users
     LEFT JOIN tips ON tips.user_id = users.id
     CROSS JOIN (SELECT * FROM scoring_settings ORDER BY id ASC LIMIT 1) settings
     WHERE users.id = ?
     GROUP BY users.id`,
    [id]
  );

  return rows[0] || null;
}

router.get("/", async (req, res) => {
  try {
    const rows = await query(
      `SELECT
         users.*,
         COUNT(tips.id) AS tips_count,
         COALESCE(SUM(tips.points), 0) AS points,
         SUM(CASE WHEN tips.points = settings.exact_score_points THEN 1 ELSE 0 END) AS exact_count,
         SUM(CASE WHEN tips.points = settings.correct_result_points THEN 1 ELSE 0 END) AS result_count
       FROM users
       LEFT JOIN tips ON tips.user_id = users.id
       CROSS JOIN (SELECT * FROM scoring_settings ORDER BY id ASC LIMIT 1) settings
       GROUP BY users.id
       ORDER BY users.role ASC, users.name ASC`
    );

    res.json(rows.map(publicUser));
  } catch (err) {
    res.status(500).json({ error: "Nepodařilo se načíst tipovače.", detail: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const loginName = cleanLogin(req.body.login_name, name);
    const email = String(req.body.email || "").trim() || null;
    const role = req.body.role === "admin" ? "admin" : "player";
    const pin = String(req.body.pin || "").trim();
    const password = String(req.body.password || "").trim();

    if (!name) return res.status(400).json({ error: "Vyplňte jméno." });
    if (!loginName) return res.status(400).json({ error: "Vyplňte login." });
    if (role === "player" && !pin) return res.status(400).json({ error: "Tipovač musí mít PIN." });
    if (role === "admin" && !password) return res.status(400).json({ error: "Admin musí mít heslo." });

    const result = await query(
      `INSERT INTO users (name, login_name, email, role, pin_hash, password_hash, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [
        name,
        loginName,
        email,
        role,
        role === "player" ? await hashSecret(pin) : null,
        role === "admin" ? await hashSecret(password) : null,
      ]
    );

    const created = await getUserById(result.insertId);
    res.status(201).json(publicUser(created));
  } catch (err) {
    const message = err.code === "ER_DUP_ENTRY" ? "Tento login už existuje." : "Nepodařilo se uložit uživatele.";
    res.status(500).json({ error: message, detail: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const name = String(req.body.name || "").trim();
    const loginName = cleanLogin(req.body.login_name);
    const email = String(req.body.email || "").trim() || null;

    if (!id) return res.status(400).json({ error: "Chybí ID uživatele." });
    if (!name) return res.status(400).json({ error: "Vyplňte jméno." });
    if (!loginName) return res.status(400).json({ error: "Vyplňte login." });

    await query(
      `UPDATE users
       SET name = ?, login_name = ?, email = ?
       WHERE id = ?`,
      [name, loginName, email, id]
    );

    const updated = await getUserById(id);
    if (!updated) return res.status(404).json({ error: "Uživatel nebyl nalezen." });

    res.json(publicUser(updated));
  } catch (err) {
    const message = err.code === "ER_DUP_ENTRY" ? "Tento login už existuje." : "Nepodařilo se upravit uživatele.";
    res.status(500).json({ error: message, detail: err.message });
  }
});

router.put("/:id/access", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const pin = String(req.body.pin || "").trim();
    const password = String(req.body.password || "").trim();
    const hasActiveChange = Object.prototype.hasOwnProperty.call(req.body, "is_active");

    const current = await getUserById(id);
    if (!current) return res.status(404).json({ error: "Uživatel nebyl nalezen." });

    if (pin && current.role === "player") {
      await query("UPDATE users SET pin_hash = ? WHERE id = ?", [await hashSecret(pin), id]);
    }

    if (password && current.role === "admin") {
      await query("UPDATE users SET password_hash = ? WHERE id = ?", [await hashSecret(password), id]);
    }

    if (hasActiveChange) {
      if (Number(req.user.id) === id && !req.body.is_active) {
        return res.status(400).json({ error: "Nemůžete deaktivovat vlastní účet." });
      }
      await query("UPDATE users SET is_active = ? WHERE id = ?", [req.body.is_active ? 1 : 0, id]);
    }

    const updated = await getUserById(id);
    res.json(publicUser(updated));
  } catch (err) {
    res.status(500).json({ error: "Nepodařilo se upravit přístup.", detail: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!id) return res.status(400).json({ error: "Chybí ID uživatele." });
    if (Number(req.user.id) === id) return res.status(400).json({ error: "Nemůžete smazat vlastní účet." });

    const current = await getUserById(id);
    if (!current) return res.status(404).json({ error: "Uživatel nebyl nalezen." });

    if (Number(current.tips_count || 0) > 0) {
      return res.status(400).json({ error: "Uživatele nelze smazat, protože už má uložené tipy. Použijte deaktivaci." });
    }

    await query("DELETE FROM users WHERE id = ?", [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Nepodařilo se smazat uživatele.", detail: err.message });
  }
});

export default router;
