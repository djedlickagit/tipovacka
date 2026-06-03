import { Router } from "express";
import { query } from "../db.js";
import { hashSecret, publicUser, signToken, verifySecret, verifyToken } from "../services/auth.service.js";

const router = Router();

function cleanLogin(value, fallback = "") {
  return String(value || fallback || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

router.get("/health", (req, res) => {
  res.json({ ok: true, module: "auth" });
});


router.post("/register", async (req, res) => {
  try {
    const body = req.body || {};
    const name = String(body.name || "").trim();
    const loginName = cleanLogin(body.login_name || body.login, name);
    const email = String(body.email || "").trim() || null;
    const pin = String(body.pin || "").trim();
    const pinConfirm = String(body.pin_confirm || body.pinConfirm || "").trim();

    if (name.length < 2) return res.status(400).json({ error: "Zadej jméno tipovače." });
    if (loginName.length < 3) return res.status(400).json({ error: "Login musí mít alespoň 3 znaky." });
    if (pin.length < 4) return res.status(400).json({ error: "PIN musí mít alespoň 4 číslice nebo znaky." });
    if (pinConfirm && pin !== pinConfirm) return res.status(400).json({ error: "PINy se neshodují." });

    const existing = await query(
      `SELECT id FROM users WHERE LOWER(login_name) = LOWER(?) LIMIT 1`,
      [loginName]
    );

    if (existing.length) return res.status(409).json({ error: "Tento login už existuje." });

    const result = await query(
      `INSERT INTO users (name, login_name, email, role, pin_hash, password_hash, is_active)
       VALUES (?, ?, ?, 'player', ?, NULL, 1)`,
      [name, loginName, email, await hashSecret(pin)]
    );

    const rows = await query(
      `SELECT id, name, login_name, email, role, is_active, pin_hash, password_hash
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [result.insertId]
    );

    const user = rows[0];
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (error) {
    const message = error.code === "ER_DUP_ENTRY" ? "Tento login už existuje." : "Registraci se nepodařilo dokončit.";
    console.error("POST /api/auth/register", error);
    res.status(500).json({ error: message, detail: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const body = req.body || {};
    const login = String(body.login || body.login_name || body.name || "").trim();
    const password = String(body.password || "").trim();
    const pin = String(body.pin || "").trim();

    if (!login) return res.status(400).json({ error: "Zadej login." });

    const rows = await query(
      `SELECT *
       FROM users
       WHERE LOWER(login_name) = LOWER(?)
          OR LOWER(name) = LOWER(?)
       ORDER BY CASE WHEN LOWER(login_name) = LOWER(?) THEN 0 ELSE 1 END
       LIMIT 1`,
      [login, login, login]
    );

    if (!rows.length) return res.status(401).json({ error: "Uživatel nenalezen." });

    const user = rows[0];
    if (Number(user.is_active) === 0) return res.status(403).json({ error: "Uživatel není aktivní." });

    if (user.role === "admin") {
      if (!password) return res.status(401).json({ error: "Zadej heslo administrátora." });
      const ok = await verifySecret(password, user.password_hash);
      if (!ok) return res.status(401).json({ error: "Nesprávné heslo." });
    } else {
      if (!pin) return res.status(401).json({ error: "Zadej PIN tipovače." });
      const ok = await verifySecret(pin, user.pin_hash);
      if (!ok) return res.status(401).json({ error: "Nesprávný PIN." });
    }

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (error) {
    console.error("POST /api/auth/login", error);
    res.status(500).json({ error: "Nepodařilo se přihlásit.", detail: error.message });
  }
});

router.get("/me", async (req, res) => {
  try {
    const raw = req.headers.authorization || "";
    const token = raw.startsWith("Bearer ") ? raw.slice(7) : "";
    const payload = verifyToken(token);
    const userId = payload?.sub || payload?.id;

    if (!userId) return res.status(401).json({ error: "Chybí nebo neplatný token." });

    const rows = await query(
      `SELECT id, name, login_name, email, role, is_active, pin_hash, password_hash
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [userId]
    );

    if (!rows.length || Number(rows[0].is_active) !== 1) {
      return res.status(401).json({ error: "Uživatel neexistuje nebo není aktivní." });
    }

    res.json({ user: publicUser(rows[0]) });
  } catch (error) {
    res.status(401).json({ error: "Neplatný token." });
  }
});

export default router;
