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

function getBearerToken(req) {
  const raw = req.headers.authorization || "";
  return raw.startsWith("Bearer ") ? raw.slice(7) : "";
}

async function getUserById(id) {
  const rows = await query(
    `SELECT id, name, login_name, email, role, is_active, pin_hash, password_hash
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function getUserFromRequest(req) {
  const payload = verifyToken(getBearerToken(req));
  const userId = payload?.sub || payload?.id;
  if (!userId) return null;

  const user = await getUserById(userId);
  if (!user || Number(user.is_active) !== 1) return null;
  return user;
}

router.get("/health", (req, res) => {
  res.json({ ok: true, module: "auth" });
});

router.post("/register", async (req, res) => {
  try {
    const body = req.body || {};
    const name = String(body.name || "").trim();
    const loginName = cleanLogin(body.login_name || body.login, name);
    const email = String(body.email || "").trim().toLowerCase();
    const pin = String(body.pin || "").trim();
    const pinConfirm = String(body.pin_confirm || body.pinConfirm || "").trim();

    if (name.length < 2) return res.status(400).json({ error: "Zadej jméno tipovače." });
    if (loginName.length < 3) return res.status(400).json({ error: "Login musí mít alespoň 3 znaky." });
    if (!email || !email.includes("@")) return res.status(400).json({ error: "Zadej platný e-mail. Bude sloužit pro obnovu PINu." });
    if (pin.length < 4) return res.status(400).json({ error: "PIN musí mít alespoň 4 znaky." });
    if (pin !== pinConfirm) return res.status(400).json({ error: "PINy se neshodují." });

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

    const user = await getUserById(result.insertId);
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (error) {
    const message = error.code === "ER_DUP_ENTRY" ? "Tento login už existuje." : "Registraci se nepodařilo dokončit.";
    console.error("POST /api/auth/register", error);
    res.status(500).json({ error: message, detail: error.message });
  }
});

router.post("/forgot-pin", async (req, res) => {
  try {
    const body = req.body || {};
    const loginName = cleanLogin(body.login_name || body.login || "");
    const email = String(body.email || "").trim().toLowerCase();
    const newPin = String(body.new_pin || body.pin || "").trim();
    const newPinConfirm = String(body.new_pin_confirm || body.pin_confirm || "").trim();

    if (!loginName) return res.status(400).json({ error: "Zadej login." });
    if (!email || !email.includes("@")) return res.status(400).json({ error: "Zadej e-mail použitý při registraci." });
    if (newPin.length < 4) return res.status(400).json({ error: "Nový PIN musí mít alespoň 4 znaky." });
    if (newPin !== newPinConfirm) return res.status(400).json({ error: "Nové PINy se neshodují." });

    const rows = await query(
      `SELECT id, role, is_active
       FROM users
       WHERE LOWER(login_name) = LOWER(?)
         AND LOWER(COALESCE(email, '')) = LOWER(?)
       LIMIT 1`,
      [loginName, email]
    );

    if (!rows.length || rows[0].role !== "player" || Number(rows[0].is_active) !== 1) {
      return res.status(404).json({ error: "Účet s tímto loginem a e-mailem nebyl nalezen. Pokud e-mail chybí, požádej správce o nový PIN." });
    }

    await query("UPDATE users SET pin_hash = ? WHERE id = ?", [await hashSecret(newPin), rows[0].id]);
    res.json({ ok: true, message: "PIN byl změněn. Můžeš se přihlásit novým PINem." });
  } catch (error) {
    console.error("POST /api/auth/forgot-pin", error);
    res.status(500).json({ error: "PIN se nepodařilo obnovit.", detail: error.message });
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
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: "Chybí nebo neplatný token." });
    res.json({ user: publicUser(user) });
  } catch (error) {
    res.status(401).json({ error: "Neplatný token." });
  }
});

router.put("/me", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: "Nejste přihlášený." });

    const name = String(req.body?.name || "").trim();
    const loginName = cleanLogin(req.body?.login_name || req.body?.login || "");
    const email = String(req.body?.email || "").trim().toLowerCase() || null;

    if (name.length < 2) return res.status(400).json({ error: "Jméno musí mít alespoň 2 znaky." });
    if (loginName.length < 3) return res.status(400).json({ error: "Login musí mít alespoň 3 znaky." });
    if (email && !email.includes("@")) return res.status(400).json({ error: "Zadej platný e-mail." });

    const duplicate = await query(
      `SELECT id FROM users WHERE LOWER(login_name) = LOWER(?) AND id <> ? LIMIT 1`,
      [loginName, user.id]
    );
    if (duplicate.length) return res.status(409).json({ error: "Tento login už existuje." });

    await query(
      `UPDATE users
       SET name = ?, login_name = ?, email = ?
       WHERE id = ?`,
      [name, loginName, email, user.id]
    );

    const updated = await getUserById(user.id);
    res.json({ token: signToken(updated), user: publicUser(updated) });
  } catch (error) {
    const message = error.code === "ER_DUP_ENTRY" ? "Tento login už existuje." : "Profil se nepodařilo uložit.";
    console.error("PUT /api/auth/me", error);
    res.status(500).json({ error: message, detail: error.message });
  }
});

router.put("/me/access", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: "Nejste přihlášený." });
    if (user.role !== "player") return res.status(403).json({ error: "Tato změna je určena pro tipovače." });

    const currentPin = String(req.body?.current_pin || "").trim();
    const newPin = String(req.body?.new_pin || req.body?.pin || "").trim();
    const newPinConfirm = String(req.body?.new_pin_confirm || req.body?.pin_confirm || "").trim();

    if (!currentPin) return res.status(400).json({ error: "Zadej aktuální PIN." });
    if (newPin.length < 4) return res.status(400).json({ error: "Nový PIN musí mít alespoň 4 znaky." });
    if (newPin !== newPinConfirm) return res.status(400).json({ error: "Nové PINy se neshodují." });

    const ok = await verifySecret(currentPin, user.pin_hash);
    if (!ok) return res.status(401).json({ error: "Aktuální PIN není správný." });

    await query("UPDATE users SET pin_hash = ? WHERE id = ?", [await hashSecret(newPin), user.id]);
    const updated = await getUserById(user.id);
    res.json({ token: signToken(updated), user: publicUser(updated), message: "PIN byl změněn." });
  } catch (error) {
    console.error("PUT /api/auth/me/access", error);
    res.status(500).json({ error: "PIN se nepodařilo změnit.", detail: error.message });
  }
});

export default router;
