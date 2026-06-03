import React, { useState } from "react";
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
