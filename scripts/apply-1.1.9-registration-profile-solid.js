#!/usr/bin/env node
import fs from "fs";
import path from "path";

const root = process.cwd();
const patchRoot = path.dirname(path.dirname(new URL(import.meta.url).pathname));

function read(file) { return fs.readFileSync(file, "utf8"); }
function write(file, content) { fs.writeFileSync(file, content, "utf8"); console.log("OK:", path.relative(root, file)); }
function ensure(file) { if (!fs.existsSync(file)) { console.error("Soubor nenalezen:", path.relative(root, file)); process.exit(1); } }

const files = {
  auth: path.join(root, "api", "routes", "auth.routes.js"),
  login: path.join(root, "web", "src", "auth", "LoginScreen.jsx"),
  tabs: path.join(root, "web", "src", "constants", "tabs.js"),
  app: path.join(root, "web", "src", "App.jsx"),
  styles: path.join(root, "web", "src", "styles.css"),
};
Object.values(files).forEach(ensure);

write(files.auth, read(path.join(patchRoot, "files", "auth.routes.js")));
write(files.login, read(path.join(patchRoot, "files", "LoginScreen.jsx")));

let tabs = read(files.tabs);
if (!tabs.includes('{ id: "profile"')) {
  tabs = tabs.replace(
    /export const playerTabs = \[([\s\S]*?)\];/,
    `export const playerTabs = [
  { id: "dashboard", label: "Přehled" },
  { id: "playerTips", label: "Moje tipy" },
  { id: "leaderboard", label: "Žebříček" },
  { id: "standings", label: "Tabulky" },
  { id: "teams", label: "Týmy" },
  { id: "profile", label: "Profil" },
  { id: "rules", label: "Pravidla" },
];`
  );
  write(files.tabs, tabs);
} else {
  console.log("OK: Profil už je v playerTabs");
}

let app = read(files.app);

if (!app.includes("profileSaving")) {
  app = app.replace(
    `const [evaluationPage, setEvaluationPage] = useState(1);`,
    `const [evaluationPage, setEvaluationPage] = useState(1);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");`
  );
}

const profileFunctions = `
  async function saveMyProfile(event) {
    event.preventDefault();
    setProfileSaving(true);
    setProfileError("");
    setProfileMessage("");

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
      setProfileMessage("Profil byl uložen.");
      showToast("Profil byl uložen.");
      await loadAll(result.user);
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setProfileSaving(false);
    }
  }

  async function saveMyAccess(event) {
    event.preventDefault();
    setProfileSaving(true);
    setProfileError("");
    setProfileMessage("");

    const form = new FormData(event.currentTarget);

    try {
      const result = await apiFetch("/auth/me/access", {
        method: "PUT",
        body: JSON.stringify({
          current_pin: form.get("current_pin"),
          new_pin: form.get("new_pin"),
          new_pin_confirm: form.get("new_pin_confirm"),
        }),
      });

      if (result.token) setToken(result.token);
      setUser(result.user);
      event.currentTarget.reset();
      setProfileMessage(result.message || "PIN byl změněn.");
      showToast("PIN byl změněn.");
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setProfileSaving(false);
    }
  }
`;

if (!app.includes("async function saveMyProfile")) {
  app = app.replace(/\n  if \(!user\) \{/, `${profileFunctions}\n  if (!user) {`);
}

const profileSection = `
        {activeTab === "profile" && user.role !== "admin" && (
          <section className="profile-layout">
            <div className="card profile-card">
              <div className="section-head">
                <div>
                  <h2>Můj profil</h2>
                  <p className="muted">Uprav si jméno, login a e-mail pro obnovu PINu.</p>
                </div>
              </div>

              {profileMessage && <div className="form-success">{profileMessage}</div>}
              {profileError && <div className="form-error">{profileError}</div>}

              <form className="form-grid profile-form" onSubmit={saveMyProfile}>
                <label>Jméno / přezdívka<input name="name" defaultValue={user.name || ""} required /></label>
                <label>Login<input name="login_name" defaultValue={user.login_name || ""} required /></label>
                <label>E-mail<input name="email" type="email" defaultValue={user.email || ""} placeholder="kvůli obnově PINu" /></label>
                <button className="btn" type="submit" disabled={profileSaving}>{profileSaving ? "Ukládám..." : "Uložit profil"}</button>
              </form>
            </div>

            <div className="card profile-card">
              <div className="section-head">
                <div>
                  <h2>Změna PINu</h2>
                  <p className="muted">PIN si můžeš změnit po zadání aktuálního PINu.</p>
                </div>
              </div>
              <form className="form-grid profile-form" onSubmit={saveMyAccess}>
                <label>Aktuální PIN<input name="current_pin" type="password" required /></label>
                <label>Nový PIN<input name="new_pin" type="password" minLength="4" required /></label>
                <label>Nový PIN znovu<input name="new_pin_confirm" type="password" minLength="4" required /></label>
                <button className="btn" type="submit" disabled={profileSaving}>{profileSaving ? "Ukládám..." : "Změnit PIN"}</button>
              </form>
            </div>
          </section>
        )}
`;

if (!app.includes('activeTab === "profile"')) {
  app = app.replace(/\n        \{activeTab === "leaderboard" && \(/, `${profileSection}\n        {activeTab === "leaderboard" && (`);
}

write(files.app, app);

let styles = read(files.styles);
const css = `

/* Patch 1.1.9 – registrace, zapomenutý PIN, profil tipovače */
.login-mode-switch {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 14px;
}

.compact-switch {
  margin: 8px 0 14px;
}

.form-success {
  width: 100%;
  border: 1px solid rgba(32, 166, 93, 0.25);
  background: rgba(32, 166, 93, 0.08);
  color: #166534;
  border-radius: 14px;
  padding: 10px 12px;
  font-weight: 700;
}

.profile-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px;
}

.profile-card {
  min-height: 0;
}

.profile-form {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.profile-form button {
  align-self: end;
}

.login-form .full,
.profile-form .full {
  grid-column: 1 / -1;
}

@media (max-width: 820px) {
  .profile-layout,
  .profile-form {
    grid-template-columns: 1fr;
  }

  .login-mode-switch {
    grid-template-columns: 1fr;
  }
}
`;
if (!styles.includes("Patch 1.1.9")) write(files.styles, styles + css);
else console.log("OK: styly 1.1.9 už jsou vložené");

console.log("\nHotovo. Ověř: cd api && node --check routes/auth.routes.js; cd ../web && npm run build");
