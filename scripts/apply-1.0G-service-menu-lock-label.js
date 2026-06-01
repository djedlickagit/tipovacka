const fs = require('fs');
const path = require('path');

const root = process.cwd();
const appPath = path.join(root, 'web', 'src', 'App.jsx');
const cssPath = path.join(root, 'web', 'src', 'styles.css');

function fail(msg) {
  console.error('\n❌ ' + msg);
  process.exit(1);
}

if (!fs.existsSync(appPath)) fail('Nenalezen web/src/App.jsx. Spusť skript v kořeni projektu tipovacka-ms-2026.');
if (!fs.existsSync(cssPath)) fail('Nenalezen web/src/styles.css. Spusť skript v kořeni projektu tipovacka-ms-2026.');

let app = fs.readFileSync(appPath, 'utf8');
let css = fs.readFileSync(cssPath, 'utf8');

// 1) Přidat stav pro rozbalovací servisní menu.
if (!app.includes('const [serviceMenuOpen, setServiceMenuOpen] = useState(false);')) {
  const needle = '  const [activeTab, setActiveTab] = useState("dashboard");';
  if (!app.includes(needle)) fail('Nepodařilo se najít stav activeTab v App.jsx.');
  app = app.replace(needle, needle + '\n  const [serviceMenuOpen, setServiceMenuOpen] = useState(false);');
}

// 2) Při odhlášení zavřít servisní menu.
if (!app.includes('setServiceMenuOpen(false);')) {
  const needle = '    setActiveTab("dashboard");';
  if (app.includes(needle)) {
    app = app.replace(needle, needle + '\n    setServiceMenuOpen(false);');
  }
}

// 3) Přidat krátký popisek důvodu uzamčení pro hráčský seznam tipů.
if (!app.includes('function getPlayerLockShortLabel(')) {
  const marker = 'function getPlayerLockNotice(match, settings = {}) {';
  const idx = app.indexOf(marker);
  if (idx === -1) fail('Nepodařilo se najít funkci getPlayerLockNotice v App.jsx.');
  const helper = `function getPlayerLockShortLabel(match, settings = {}) {\n  if (!matchLocked(match, settings)) return "";\n  if ((settings?.tip_lock_mode || match?.tip_lock_mode) === "fixed_datetime") return "Uzavřeno termínem";\n  if (["finished", "evaluated"].includes(match?.status)) return "Dohráno";\n  if (match?.status === "locked") return "Zamčeno adminem";\n  return "Zápas začal";\n}\n\n`;
  app = app.slice(0, idx) + helper + app.slice(idx);
}

// 4) Vložit rozdělení menu na hlavní a servisní záložky.
const tabsNeedle = '  const tabs = user.role === "admin" ? adminTabs : playerTabs;';
if (app.includes(tabsNeedle) && !app.includes('const serviceTabIds = new Set(')) {
  app = app.replace(tabsNeedle, `  const tabs = user.role === "admin" ? adminTabs : playerTabs;\n  const serviceTabIds = new Set(["sync", "evaluation", "prelaunch"]);\n  const primaryTabs = user.role === "admin" ? tabs.filter((tab) => !serviceTabIds.has(tab.id)) : tabs;\n  const serviceTabs = user.role === "admin" ? tabs.filter((tab) => serviceTabIds.has(tab.id)) : [];\n  const serviceActive = serviceTabs.some((tab) => tab.id === activeTab);`);
}

// 5) Nahradit původní vykreslení záložek verzí s ozubeným kolečkem.
const oldNav = `      <nav className="tabs">\n        {tabs.map((tab) => (\n          <button key={tab.id} className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)}>\n            {tab.label}\n          </button>\n        ))}\n      </nav>`;
const newNav = `      <nav className="tabs">\n        {primaryTabs.map((tab) => (\n          <button key={tab.id} className={activeTab === tab.id ? "active" : ""} onClick={() => { setActiveTab(tab.id); setServiceMenuOpen(false); }}>\n            {tab.label}\n          </button>\n        ))}\n        {serviceTabs.length > 0 && (\n          <div className="service-tabs-wrap">\n            <button\n              type="button"\n              className={serviceActive ? "active service-menu-trigger" : "service-menu-trigger"}\n              onClick={() => setServiceMenuOpen((open) => !open)}\n              aria-expanded={serviceMenuOpen}\n              aria-haspopup="menu"\n              title="Servisní nástroje"\n            >\n              <span aria-hidden="true">⚙️</span>\n              <span>Servis</span>\n            </button>\n            {serviceMenuOpen && (\n              <div className="service-tabs-dropdown" role="menu">\n                {serviceTabs.map((tab) => (\n                  <button key={tab.id} type="button" className={activeTab === tab.id ? "active" : ""} onClick={() => { setActiveTab(tab.id); setServiceMenuOpen(false); }}>\n                    {tab.label}\n                  </button>\n                ))}\n              </div>\n            )}\n          </div>\n        )}\n      </nav>`;
if (app.includes(oldNav)) {
  app = app.replace(oldNav, newNav);
} else if (!app.includes('service-tabs-wrap')) {
  fail('Nepodařilo se najít blok <nav className="tabs"> v očekávaném tvaru.');
}

// 6) Krátký štítek u hráče: při uzamčení nepsat jen obecné "Zamčeno", ale důvod.
const oldStatus = '<span className={`status-pill tip-${state}`}>{playerTipStateLabel(state)}</span>';
const newStatus = '<span className={`status-pill tip-${state}`}>{state === "locked" ? getPlayerLockShortLabel(match, settings) : playerTipStateLabel(state)}</span>';
if (app.includes(oldStatus)) {
  app = app.replace(oldStatus, newStatus);
}

// 7) CSS pro servisní menu a drobné zklidnění navigace.
const cssBlock = `
/* Patch 1.0G – servisní záložky pod ozubeným kolečkem */
.tabs {
  overflow: visible;
  position: relative;
}

.service-tabs-wrap {
  position: relative;
  margin-left: auto;
  flex: 0 0 auto;
}

.tabs .service-menu-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.service-tabs-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 10px);
  z-index: 80;
  min-width: 250px;
  padding: 10px;
  border: 1px solid rgba(16, 24, 40, 0.10);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.18);
  display: grid;
  gap: 8px;
}

.service-tabs-dropdown button {
  width: 100%;
  justify-content: flex-start;
  border-radius: 16px;
  padding: 12px 14px;
}

.player-tip-row .player-lock-note {
  max-width: 100%;
}

.status-pill.tip-locked {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
}

@media (max-width: 760px) {
  .tabs {
    overflow-x: auto;
    overflow-y: visible;
  }

  .service-tabs-wrap {
    margin-left: 0;
  }

  .service-tabs-dropdown {
    right: auto;
    left: 0;
    min-width: 230px;
  }
}
`;
if (!css.includes('Patch 1.0G')) {
  css += '\n' + cssBlock;
}

fs.writeFileSync(appPath, app);
fs.writeFileSync(cssPath, css);
console.log('✅ Patch 1.0G aplikován: servisní záložky jsou pod ozubeným kolečkem a zamčení má jasnější popisek.');
