import React, { useState } from "react";
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
