#!/usr/bin/env node
import fs from "fs";
import path from "path";

const root = process.cwd();
const authPath = path.join(root, "api", "routes", "auth.routes.js");
const apiPath = path.join(root, "web", "src", "api.js");
const loginPath = path.join(root, "web", "src", "auth", "LoginScreen.jsx");
const stylesPath = path.join(root, "web", "src", "styles.css");
const webEnvExamplePath = path.join(root, "web", ".env.example");

function ensureFile(file) {
  if (!fs.existsSync(file)) {
    console.error(`Soubor nenalezen: ${path.relative(root, file)}`);
    process.exit(1);
  }
}

function write(file, content) {
  fs.writeFileSync(file, content, "utf8");
  console.log(`OK: ${path.relative(root, file)}`);
}

ensureFile(authPath);
ensureFile(apiPath);
ensureFile(loginPath);
ensureFile(stylesPath);

let auth = fs.readFileSync(authPath, "utf8");
auth = auth.replace(
  'import { publicUser, signToken, verifySecret, verifyToken } from "../services/auth.service.js";',
  'import { hashSecret, publicUser, signToken, verifySecret, verifyToken } from "../services/auth.service.js";'
);

if (!auth.includes("function cleanLogin")) {
  auth = auth.replace(
    "const router = Router();\n",
    `const router = Router();\n\nfunction cleanLogin(value, fallback = "") {\n  return String(value || fallback || "")\n    .trim()\n    .toLowerCase()\n    .normalize("NFD")\n    .replace(/[\\u0300-\\u036f]/g, "")\n    .replace(/[^a-z0-9._-]+/g, "-")\n    .replace(/^-+|-+$/g, "")\n    .slice(0, 80);\n}\n`
  );
}

if (!auth.includes('router.post("/register"')) {
  const registerRoute = `\nrouter.post("/register", async (req, res) => {\n  try {\n    const body = req.body || {};\n    const name = String(body.name || "").trim();\n    const loginName = cleanLogin(body.login_name || body.login, name);\n    const email = String(body.email || "").trim() || null;\n    const pin = String(body.pin || "").trim();\n    const pinConfirm = String(body.pin_confirm || body.pinConfirm || "").trim();\n\n    if (name.length < 2) return res.status(400).json({ error: "Zadej jméno tipovače." });\n    if (loginName.length < 3) return res.status(400).json({ error: "Login musí mít alespoň 3 znaky." });\n    if (pin.length < 4) return res.status(400).json({ error: "PIN musí mít alespoň 4 číslice nebo znaky." });\n    if (pinConfirm && pin !== pinConfirm) return res.status(400).json({ error: "PINy se neshodují." });\n\n    const existing = await query(\n      \`SELECT id FROM users WHERE LOWER(login_name) = LOWER(?) LIMIT 1\`,\n      [loginName]\n    );\n\n    if (existing.length) return res.status(409).json({ error: "Tento login už existuje." });\n\n    const result = await query(\n      \`INSERT INTO users (name, login_name, email, role, pin_hash, password_hash, is_active)\n       VALUES (?, ?, ?, 'player', ?, NULL, 1)\`,\n      [name, loginName, email, await hashSecret(pin)]\n    );\n\n    const rows = await query(\n      \`SELECT id, name, login_name, email, role, is_active, pin_hash, password_hash\n       FROM users\n       WHERE id = ?\n       LIMIT 1\`,\n      [result.insertId]\n    );\n\n    const user = rows[0];\n    res.status(201).json({ token: signToken(user), user: publicUser(user) });\n  } catch (error) {\n    const message = error.code === "ER_DUP_ENTRY" ? "Tento login už existuje." : "Registraci se nepodařilo dokončit.";\n    console.error("POST /api/auth/register", error);\n    res.status(500).json({ error: message, detail: error.message });\n  }\n});\n`;
  auth = auth.replace('router.post("/login", async (req, res) => {', `${registerRoute}\nrouter.post("/login", async (req, res) => {`);
}
write(authPath, auth);

const apiJs = [
  'const rawApiBase =',
  '  import.meta.env.VITE_API_URL || "/api";',
  '',
  'export const API_BASE = rawApiBase.replace(/\/$/, "");',
  '',
  'export function getToken() {',
  '  return localStorage.getItem("tipovacka_token") || "";',
  '}',
  '',
  'export function setToken(token) {',
  '  if (token) localStorage.setItem("tipovacka_token", token);',
  '  else localStorage.removeItem("tipovacka_token");',
  '}',
  '',
  'export async function apiFetch(path, options = {}) {',
  '  const token = getToken();',
  '  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;',
  '',
  '  let response;',
  '',
  '  try {',
  '    response = await fetch(url, {',
  '      ...options,',
  '      headers: {',
  '        "Content-Type": "application/json",',
  '        ...(token ? { Authorization: `Bearer ${token}` } : {}),',
  '        ...(options.headers || {}),',
  '      },',
  '    });',
  '  } catch (error) {',
  '    throw new Error("Nepodařilo se spojit s aplikací. Zkus stránku obnovit nebo to prosím zkus později.");',
  '  }',
  '',
  '  const contentType = response.headers.get("content-type") || "";',
  '  const data = contentType.includes("application/json")',
  '    ? await response.json().catch(() => null)',
  '    : await response.text().catch(() => "");',
  '',
  '  if (!response.ok) {',
  '    if (response.status === 401) {',
  '      setToken("");',
  '    }',
  '',
  '    const message =',
  '      typeof data === "string"',
  '        ? data',
  '        : data?.error || data?.message || `Chyba aplikace ${response.status}`;',
  '',
  '    throw new Error(message);',
  '  }',
  '',
  '  return data;',
  '}',
  ''
].join("\n");
write(apiPath, apiJs);

const loginScreen = `import React, { useState } from "react";
import { apiFetch, setToken } from "../api";

export default function LoginScreen({ onLogin, onOpenPublic }) {
  const [mode, setMode] = useState("player");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = mode === "admin";
  const isRegister = mode === "register";

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);

    try {
      let result;

      if (isRegister) {
        const pin = String(form.get("pin") || "").trim();
        const pinConfirm = String(form.get("pin_confirm") || "").trim();

        if (pin !== pinConfirm) {
          throw new Error("PINy se neshodují.");
        }

        result = await apiFetch("/auth/register", {
          method: "POST",
          body: JSON.stringify({
            name: form.get("name"),
            login_name: form.get("login"),
            email: form.get("email"),
            pin,
            pin_confirm: pinConfirm,
          }),
        });
      } else {
        result = await apiFetch("/auth/login", {
          method: "POST",
          body: JSON.stringify({
            login: form.get("login"),
            pin: isAdmin ? "" : form.get("secret"),
            password: isAdmin ? form.get("secret") : "",
          }),
        });
      }

      setToken(result.token);
      onLogin(result.user);
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

        <div className="login-switch login-switch-three">
          <button type="button" className={mode === "player" ? "active" : ""} onClick={() => setMode("player")}>Tipovač</button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Registrace</button>
          <button type="button" className={mode === "admin" ? "active" : ""} onClick={() => setMode("admin")}>Admin</button>
        </div>

        <form onSubmit={submit} className="form-grid login-form">
          {isRegister ? (
            <>
              <label>
                Jméno tipovače
                <input name="name" placeholder="Tvoje jméno" required autoFocus minLength={2} />
              </label>
              <label>
                Login
                <input name="login" placeholder="např. david" required minLength={3} autoComplete="username" />
              </label>
              <label>
                E-mail <span className="label-muted">nepovinné</span>
                <input name="email" type="email" placeholder="email pro případnou domluvu" autoComplete="email" />
              </label>
              <div className="login-pin-grid">
                <label>
                  PIN
                  <input name="pin" type="password" inputMode="numeric" placeholder="min. 4 znaky" required minLength={4} autoComplete="new-password" />
                </label>
                <label>
                  PIN znovu
                  <input name="pin_confirm" type="password" inputMode="numeric" placeholder="zopakovat PIN" required minLength={4} autoComplete="new-password" />
                </label>
              </div>
            </>
          ) : (
            <>
              <label>
                {isAdmin ? "Admin login" : "Jméno / login"}
                <input name="login" placeholder={isAdmin ? "admin login" : "tvůj login"} required autoFocus autoComplete="username" />
              </label>
              <label>
                {isAdmin ? "Heslo" : "PIN"}
                <input name="secret" type="password" inputMode={isAdmin ? undefined : "numeric"} placeholder={isAdmin ? "heslo administrátora" : "tvůj PIN"} required autoComplete={isAdmin ? "current-password" : "one-time-code"} />
              </label>
            </>
          )}

          {error && <div className="form-error">{error}</div>}

          <button className="btn" disabled={loading}>
            {loading
              ? isRegister ? "Registruji..." : "Přihlašuji..."
              : isRegister ? "Zaregistrovat a pokračovat" : "Přihlásit"}
          </button>
        </form>

        <button type="button" className="btn btn-soft login-public-btn" onClick={onOpenPublic}>
          Veřejný přehled bez přihlášení
        </button>

        <p className="login-note">
          Registrace vytvoří běžný účet tipovače. Administrátorský přístup spravuje pořadatel soutěže.
        </p>
      </div>
    </div>
  );
}
`;
write(loginPath, loginScreen);

let styles = fs.readFileSync(stylesPath, "utf8");
const marker = "/* PATCH 1.1.2 registration clean login */";
if (!styles.includes(marker)) {
  styles += `\n\n${marker}\n.login-switch.login-switch-three {\n  grid-template-columns: repeat(3, minmax(0, 1fr));\n}\n\n.login-switch.login-switch-three button {\n  padding-left: 10px;\n  padding-right: 10px;\n  font-size: 13px;\n}\n\n.login-pin-grid {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 12px;\n}\n\n.label-muted {\n  color: #98a2b3;\n  font-size: 12px;\n  font-weight: 800;\n}\n\n.login-note {\n  margin: 14px 0 0;\n  color: #667085;\n  font-size: 12px;\n  line-height: 1.55;\n  font-weight: 650;\n}\n\n.login-card .api-status,\n.login-card .login-help {\n  display: none !important;\n}\n\n@media (max-width: 560px) {\n  .login-card {\n    padding: 22px;\n    border-radius: 26px;\n  }\n\n  .login-switch.login-switch-three {\n    grid-template-columns: 1fr;\n  }\n\n  .login-pin-grid {\n    grid-template-columns: 1fr;\n  }\n}\n`;
}
write(stylesPath, styles);

if (fs.existsSync(webEnvExamplePath)) {
  let envExample = fs.readFileSync(webEnvExamplePath, "utf8");
  if (!envExample.includes("VITE_API_URL")) {
    envExample += `\n# Volitelné jen pro samostatný lokální vývoj webu přes Vite.\n# V produkci nechte prázdné, aplikace používá relativní /api.\n# VITE_API_URL=http://localhost:5051/api\n`;
    write(webEnvExamplePath, envExample);
  }
}

console.log("\nHotovo: registrace tipovače je doplněná a lokální přihlašovací nápovědy jsou schované.");
