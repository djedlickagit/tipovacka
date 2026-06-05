#!/usr/bin/env node
import fs from "fs";
import path from "path";

const root = process.cwd();
const files = {
  auth: path.join(root, "api", "routes", "auth.routes.js"),
  login: path.join(root, "web", "src", "auth", "LoginScreen.jsx"),
  api: path.join(root, "web", "src", "api.js"),
  tabs: path.join(root, "web", "src", "constants", "tabs.js"),
  app: path.join(root, "web", "src", "App.jsx"),
  styles: path.join(root, "web", "src", "styles.css"),
};

function ensure(file) {
  if (!fs.existsSync(file)) {
    console.error(`Soubor nenalezen: ${path.relative(root, file)}`);
    process.exit(1);
  }
}

function write(file, content) {
  fs.writeFileSync(file, content, "utf8");
  console.log(`OK: ${path.relative(root, file)}`);
}

Object.values(files).forEach(ensure);

const authRoutes = `import { Router } from "express";
import { query } from "../db.js";
import { hashSecret, publicUser, signToken, verifySecret, verifyToken } from "../services/auth.service.js";

const router = Router();

function cleanLogin(value, fallback = "") {
  return String(value || fallback || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function getUserById(id) {
  const rows = await query(
    \`SELECT id, name, login_name, email, role, is_active, pin_hash, password_hash
     FROM users
     WHERE id = ?
     LIMIT 1\`,
    [id]
  );
  return rows[0] || null;
}

async function getUserFromRequest(req) {
  const raw = req.headers.authorization || "";
  const token = raw.startsWith("Bearer ") ? raw.slice(7) : "";
  const payload = verifyToken(token);
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
    if (pin.length < 4) return res.status(400).json({ error: "PIN musí mít alespoň 4 číslice nebo znaky." });
    if (pin !== pinConfirm) return res.status(400).json({ error: "PINy se neshodují." });

    const existing = await query(
      \`SELECT id FROM users WHERE LOWER(login_name) = LOWER(?) LIMIT 1\`,
      [loginName]
    );

    if (existing.length) return res.status(409).json({ error: "Tento login už existuje." });

    const result = await query(
      \`INSERT INTO users (name, login_name, email, role, pin_hash, password_hash, is_active)
       VALUES (?, ?, ?, 'player', ?, NULL, 1)\`,
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
    if (newPin.length < 4) return res.status(400).json({ error: "Nový PIN musí mít alespoň 4 číslice nebo znaky." });
    if (newPin !== newPinConfirm) return res.status(400).json({ error: "Nové PINy se neshodují." });

    const rows = await query(
      \`SELECT id, role, is_active
       FROM users
       WHERE LOWER(login_name) = LOWER(?)
         AND LOWER(COALESCE(email, '')) = LOWER(?)
       LIMIT 1\`,
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
      \`SELECT *
       FROM users
       WHERE LOWER(login_name) = LOWER(?)
          OR LOWER(name) = LOWER(?)
       ORDER BY CASE WHEN LOWER(login_name) = LOWER(?) THEN 0 ELSE 1 END
       LIMIT 1\`,
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

    await query(
      \`UPDATE users
       SET name = ?, login_name = ?, email = ?
       WHERE id = ?\`,
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

    const currentSecret = String(req.body?.current_secret || req.body?.current_pin || req.body?.current_password || "").trim();
    const newSecret = String(req.body?.new_secret || req.body?.new_pin || req.body?.new_password || "").trim();
    const newSecretConfirm = String(req.body?.new_secret_confirm || req.body?.new_pin_confirm || req.body?.new_password_confirm || "").trim();

    if (!currentSecret) return res.status(400).json({ error: user.role === "admin" ? "Zadej současné heslo." : "Zadej současný PIN." });
    if (newSecret.length < 4) return res.status(400).json({ error: user.role === "admin" ? "Nové heslo musí mít alespoň 4 znaky." : "Nový PIN musí mít alespoň 4 číslice nebo znaky." });
    if (newSecret !== newSecretConfirm) return res.status(400).json({ error: "Nové údaje se neshodují." });

    const ok = user.role === "admin"
      ? await verifySecret(currentSecret, user.password_hash)
      : await verifySecret(currentSecret, user.pin_hash);

    if (!ok) return res.status(401).json({ error: user.role === "admin" ? "Současné heslo nesedí." : "Současný PIN nesedí." });

    if (user.role === "admin") {
      await query("UPDATE users SET password_hash = ? WHERE id = ?", [await hashSecret(newSecret), user.id]);
    } else {
      await query("UPDATE users SET pin_hash = ? WHERE id = ?", [await hashSecret(newSecret), user.id]);
    }

    const updated = await getUserById(user.id);
    res.json({ user: publicUser(updated) });
  } catch (error) {
    console.error("PUT /api/auth/me/access", error);
    res.status(500).json({ error: "Přístupový údaj se nepodařilo změnit.", detail: error.message });
  }
});

export default router;
`;
write(files.auth, authRoutes);

const apiJs = `const rawApiBase = import.meta.env.VITE_API_URL || "/api";

export const API_BASE = rawApiBase.replace(/\\/$/, "");

export function getToken() {
  return localStorage.getItem("tipovacka_token") || "";
}

export function setToken(token) {
  if (token) localStorage.setItem("tipovacka_token", token);
  else localStorage.removeItem("tipovacka_token");
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const normalizedPath = path.startsWith("/") ? path : "/" + path;
  const url = API_BASE + normalizedPath;

  let response;

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    throw new Error("Nepodařilo se spojit s aplikací. Zkus stránku obnovit nebo to prosím zkus později.");
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  if (!response.ok) {
    if (response.status === 401) setToken("");

    const message = typeof data === "string"
      ? data
      : data?.error || data?.message || "Chyba aplikace " + response.status;

    throw new Error(message);
  }

  return data;
}
`;
write(files.api, apiJs);

const loginScreen = `import React, { useState } from "react";
import { apiFetch, setToken } from "../api";

export default function LoginScreen({ onLogin, onOpenPublic }) {
  const [mode, setMode] = useState("login");
  const [loginRole, setLoginRole] = useState("player");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
    setSuccess("");
  }

  async function submitLogin(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const form = new FormData(event.currentTarget);

    try {
      const result = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          login: form.get("login"),
          pin: loginRole === "player" ? form.get("secret") : "",
          password: loginRole === "admin" ? form.get("secret") : "",
        }),
      });

      setToken(result.token);
      onLogin(result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitRegister(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const form = new FormData(event.currentTarget);

    try {
      const result = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          login_name: form.get("login_name"),
          email: form.get("email"),
          pin: form.get("pin"),
          pin_confirm: form.get("pin_confirm"),
        }),
      });

      setToken(result.token);
      onLogin(result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitForgot(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const form = new FormData(event.currentTarget);

    try {
      const result = await apiFetch("/auth/forgot-pin", {
        method: "POST",
        body: JSON.stringify({
          login_name: form.get("login_name"),
          email: form.get("email"),
          new_pin: form.get("new_pin"),
          new_pin_confirm: form.get("new_pin_confirm"),
        }),
      });

      setSuccess(result.message || "PIN byl změněn. Můžeš se přihlásit.");
      event.currentTarget.reset();
      setMode("login");
      setLoginRole("player");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="cup-mark small">26</div>
          <div>
            <p className="eyebrow">MS ve fotbale 2026</p>
            <h1>Tipovačka</h1>
          </div>
        </div>

        <div className="login-switch login-mode-switch">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")}>Přihlášení</button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => switchMode("register")}>Registrace</button>
          <button type="button" className={mode === "forgot" ? "active" : ""} onClick={() => switchMode("forgot")}>Zapomenutý PIN</button>
        </div>

        {mode === "login" && (
          <>
            <div className="login-switch">
              <button type="button" className={loginRole === "player" ? "active" : ""} onClick={() => setLoginRole("player")}>Tipovač</button>
              <button type="button" className={loginRole === "admin" ? "active" : ""} onClick={() => setLoginRole("admin")}>Admin</button>
            </div>

            <form onSubmit={submitLogin} className="form-grid login-form">
              <label>
                {loginRole === "admin" ? "Admin login" : "Jméno / login"}
                <input name="login" required autoFocus />
              </label>
              <label>
                {loginRole === "admin" ? "Heslo" : "PIN"}
                <input name="secret" type={loginRole === "admin" ? "password" : "tel"} required />
              </label>
              {error && <div className="form-error">{error}</div>}
              {success && <div className="form-success">{success}</div>}
              <button className="btn" disabled={loading}>{loading ? "Přihlašuji..." : "Přihlásit"}</button>
            </form>
          </>
        )}

        {mode === "register" && (
          <form onSubmit={submitRegister} className="form-grid login-form">
            <label>Jméno tipovače<input name="name" required autoFocus /></label>
            <label>Login<input name="login_name" required /></label>
            <label className="full">E-mail pro obnovu PINu<input name="email" type="email" required /></label>
            <label>PIN<input name="pin" type="tel" required minLength="4" /></label>
            <label>PIN znovu<input name="pin_confirm" type="tel" required minLength="4" /></label>
            {error && <div className="form-error">{error}</div>}
            <p className="muted full">Registrace vytvoří pouze běžný účet tipovače. Admina vytváří správce v administraci.</p>
            <button className="btn" disabled={loading}>{loading ? "Registruji..." : "Registrovat a přihlásit"}</button>
          </form>
        )}

        {mode === "forgot" && (
          <form onSubmit={submitForgot} className="form-grid login-form">
            <label>Login<input name="login_name" required autoFocus /></label>
            <label>E-mail z registrace<input name="email" type="email" required /></label>
            <label>Nový PIN<input name="new_pin" type="tel" required minLength="4" /></label>
            <label>Nový PIN znovu<input name="new_pin_confirm" type="tel" required minLength="4" /></label>
            {error && <div className="form-error">{error}</div>}
            {success && <div className="form-success">{success}</div>}
            <p className="muted full">Obnova funguje pro tipovače, kteří mají u účtu uložený e-mail. Pokud e-mail chybí, nový PIN nastaví správce.</p>
            <button className="btn" disabled={loading}>{loading ? "Měním PIN..." : "Změnit PIN"}</button>
          </form>
        )}

        <button type="button" className="btn btn-soft login-public-btn" onClick={onOpenPublic}>
          Veřejný přehled bez přihlášení
        </button>
      </div>
    </div>
  );
}
`;
write(files.login, loginScreen);

let tabs = fs.readFileSync(files.tabs, "utf8");
if (!tabs.includes('id: "profile"') && !tabs.includes("id: 'profile'")) {
  tabs = tabs.replace(
    '  { id: "teams", label: "Týmy" },\n  { id: "rules", label: "Pravidla" },',
    '  { id: "teams", label: "Týmy" },\n  { id: "profile", label: "Profil" },\n  { id: "rules", label: "Pravidla" },'
  );
}
write(files.tabs, tabs);

let app = fs.readFileSync(files.app, "utf8");

const profileFunctions = `
  async function saveOwnProfile(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      const result = await apiFetch("/auth/me", {
        method: "PUT",
        body: JSON.stringify({
          name: form.get("name"),
          login_name: form.get("login_name"),
          email: form.get("email"),
        }),
      });

      if (result.token) setToken(result.token);
      setUser(result.user);
      if (result.user?.role === "player") setUsers([result.user]);
      showToast("Profil uložen.");
      await loadAll(result.user);
    } catch (err) {
      showToast(err.message);
    }
  }

  async function saveOwnAccess(event) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);

    try {
      await apiFetch("/auth/me/access", {
        method: "PUT",
        body: JSON.stringify({
          current_secret: form.get("current_secret"),
          new_secret: form.get("new_secret"),
          new_secret_confirm: form.get("new_secret_confirm"),
        }),
      });

      formEl.reset();
      showToast(user.role === "admin" ? "Heslo změněno." : "PIN změněn.");
    } catch (err) {
      showToast(err.message);
    }
  }
`;

if (!app.includes("async function saveOwnProfile")) {
  const marker = `  async function afterLogin(loggedUser) {
    setPublicMode(false);
    setUser(loggedUser);
    setActiveTab("dashboard");
    await loadAll(loggedUser);
  }
`;
  if (!app.includes(marker)) {
    console.error("Nepodařilo se najít místo pro vložení funkcí profilu v App.jsx.");
    process.exit(1);
  }
  app = app.replace(marker, marker + profileFunctions);
}

const profileSection = `
        {activeTab === "profile" && user.role === "player" && (
          <section className="profile-page layout-2">
            <div className="card profile-card">
              <h2>Můj profil</h2>
              <p className="muted">Uprav si jméno, login a e-mail. E-mail se používá pro obnovu PINu.</p>
              <form onSubmit={saveOwnProfile} className="form-grid">
                <label>Jméno<input name="name" defaultValue={user.name || ""} required /></label>
                <label>Login<input name="login_name" defaultValue={user.login_name || ""} required /></label>
                <label className="full">E-mail<input name="email" type="email" defaultValue={user.email || ""} placeholder="např. jmeno@email.cz" /></label>
                <button className="btn" type="submit">Uložit profil</button>
              </form>
            </div>

            <div className="card profile-card">
              <h2>Změna PINu</h2>
              <p className="muted">Z bezpečnostních důvodů je potřeba zadat současný PIN.</p>
              <form onSubmit={saveOwnAccess} className="form-grid">
                <label>Současný PIN<input name="current_secret" type="password" required /></label>
                <label>Nový PIN<input name="new_secret" type="password" required minLength="4" /></label>
                <label>Nový PIN znovu<input name="new_secret_confirm" type="password" required minLength="4" /></label>
                <button className="btn" type="submit">Změnit PIN</button>
              </form>
            </div>
          </section>
        )}
`;

if (!app.includes('activeTab === "profile"')) {
  const marker = `        {activeTab === "rules" && settings && (`;
  if (!app.includes(marker)) {
    console.error("Nepodařilo se najít místo pro vložení záložky Profil v App.jsx.");
    process.exit(1);
  }
  app = app.replace(marker, profileSection + "\n" + marker);
}
write(files.app, app);

let styles = fs.readFileSync(files.styles, "utf8");
const css = `

/* Patch 1.1.8 – registrace, zapomenutý PIN, profil tipovače */
.login-mode-switch {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.form-success {
  grid-column: 1 / -1;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(34, 197, 94, 0.12);
  color: #166534;
  border: 1px solid rgba(34, 197, 94, 0.24);
  font-weight: 700;
}

.profile-page {
  align-items: start;
}

.profile-card .form-grid {
  margin-top: 14px;
}

.profile-card input {
  min-height: 42px;
}

@media (max-width: 720px) {
  .login-mode-switch {
    grid-template-columns: 1fr;
  }
}
`;
if (!styles.includes("Patch 1.1.8")) styles += css;
write(files.styles, styles);

console.log("\nHotovo. Ověř:\n  cd api && node --check routes/auth.routes.js\n  cd ../web && npm run build\n");
