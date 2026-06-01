import React, { useEffect, useState } from "react";
import { API_BASE, apiFetch, setToken } from "../api";

export default function LoginScreen({ onLogin, onOpenPublic }) {
  const [mode, setMode] = useState("player");
  const [loading, setLoading] = useState(false);
  const [apiOk, setApiOk] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function checkApi() {
      try {
        await apiFetch("/health");
        if (alive) setApiOk(true);
      } catch (err) {
        if (alive) setApiOk(false);
      }
    }

    checkApi();

    return () => {
      alive = false;
    };
  }, []);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);

    try {
      const result = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          login: form.get("login"),
          pin: mode === "player" ? form.get("secret") : "",
          password: mode === "admin" ? form.get("secret") : "",
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

        <div className="api-status">
          <span className={apiOk ? "dot ok" : apiOk === false ? "dot bad" : "dot"} />
          <span>
            API: {API_BASE} — {apiOk === null ? "kontroluji..." : apiOk ? "připojeno" : "nedostupné"}
          </span>
        </div>

        <div className="login-switch">
          <button type="button" className={mode === "player" ? "active" : ""} onClick={() => setMode("player")}>Tipovač</button>
          <button type="button" className={mode === "admin" ? "active" : ""} onClick={() => setMode("admin")}>Admin</button>
        </div>

        <form onSubmit={submit} className="form-grid login-form">
          <label>
            {mode === "admin" ? "Admin login" : "Jméno / login"}
            <input name="login" placeholder={mode === "admin" ? "admin" : "např. david"} required autoFocus />
          </label>
          <label>
            {mode === "admin" ? "Heslo" : "PIN"}
            <input name="secret" type={mode === "admin" ? "password" : "tel"} placeholder={mode === "admin" ? "admin2026" : "1234"} required />
          </label>
          {error && <div className="form-error">{error}</div>}
          <button className="btn" disabled={loading}>{loading ? "Přihlašuji..." : "Přihlásit"}</button>
        </form>

        <button type="button" className="btn btn-soft login-public-btn" onClick={onOpenPublic}>
          Veřejný přehled bez přihlášení
        </button>

        <p className="login-help">
          Výchozí přístup po migraci: admin / admin2026. Ukázkový tipovač: david / 1234.
        </p>
      </div>
    </div>
  );
}
