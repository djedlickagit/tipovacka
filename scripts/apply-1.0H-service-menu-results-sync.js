const fs = require('fs');
const path = require('path');

const root = process.cwd();
const appPath = path.join(root, 'web', 'src', 'App.jsx');
const cssPath = path.join(root, 'web', 'src', 'styles.css');
const syncPagePath = path.join(root, 'web', 'src', 'pages', 'SyncPage.jsx');
const serverPath = path.join(root, 'api', 'server.js');
const routesDir = path.join(root, 'api', 'routes');
const dataDir = path.join(root, 'api', 'data');
const resultsRoutePath = path.join(routesDir, 'results-sync.routes.js');
const sampleResultsPath = path.join(dataDir, 'worldcup2026-results.sample.json');

function fail(msg) {
  console.error('\n❌ ' + msg);
  process.exit(1);
}

function ensureFile(filePath, label) {
  if (!fs.existsSync(filePath)) fail(`Nenalezen ${label}. Spusť skript v kořeni projektu tipovacka-ms-2026.`);
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function writeIfChanged(filePath, content) {
  if (!fs.existsSync(filePath) || fs.readFileSync(filePath, 'utf8') !== content) {
    fs.writeFileSync(filePath, content);
  }
}

ensureFile(appPath, 'web/src/App.jsx');
ensureFile(cssPath, 'web/src/styles.css');
ensureFile(syncPagePath, 'web/src/pages/SyncPage.jsx');
ensureFile(serverPath, 'api/server.js');
ensureDir(routesDir);
ensureDir(dataDir);

let app = fs.readFileSync(appPath, 'utf8');
let css = fs.readFileSync(cssPath, 'utf8');
let syncPage = fs.readFileSync(syncPagePath, 'utf8');
let server = fs.readFileSync(serverPath, 'utf8');

const routeContent = `import { Router } from "express";\nimport fs from "fs/promises";\nimport path from "path";\nimport { fileURLToPath } from "url";\nimport { query } from "../db.js";\nimport { auth, requireAdmin } from "../middleware/auth.js";\nimport { evaluateMatchTips } from "../services/scoring.service.js";\n\nconst router = Router();\nconst __filename = fileURLToPath(import.meta.url);\nconst __dirname = path.dirname(__filename);\nconst DATA_DIR = path.join(__dirname, "..", "data");\nconst SAMPLE_RESULTS_PATH = path.join(DATA_DIR, "worldcup2026-results.sample.json");\n\nfunction cleanString(value, fallback = null) {\n  const text = String(value ?? "").trim();\n  return text || fallback;\n}\n\nfunction normalizeScore(value) {\n  if (value === null || value === undefined || value === "") return null;\n  const number = Number(value);\n  return Number.isInteger(number) && number >= 0 ? number : null;\n}\n\nfunction normalizeStartTime(value) {\n  const raw = cleanString(value, null);\n  if (!raw) return null;\n  const normalized = raw.replace("T", " ").replace(/\\.\\d{3}Z$/, "").replace(/Z$/, "");\n  const match = normalized.match(/^(\\d{4}-\\d{2}-\\d{2})\\s(\\d{2}:\\d{2})(?::(\\d{2}))?/);\n  if (match) return \`\${match[1]} \${match[2]}:\${match[3] || "00"}\`;\n  return raw;\n}\n\nfunction normalizeResult(raw = {}, fallbackSource = "results-sync") {\n  const homeScore = normalizeScore(raw.home_score ?? raw.homeScore ?? raw.home?.score);\n  const awayScore = normalizeScore(raw.away_score ?? raw.awayScore ?? raw.away?.score);\n  return {\n    external_id: cleanString(raw.external_id ?? raw.externalId ?? raw.id, null),\n    source: cleanString(raw.source, fallbackSource),\n    home_team: cleanString(raw.home_team ?? raw.homeTeam ?? raw.home?.name ?? raw.home, null),\n    away_team: cleanString(raw.away_team ?? raw.awayTeam ?? raw.away?.name ?? raw.away, null),\n    start_time: normalizeStartTime(raw.start_time ?? raw.startTime ?? raw.date ?? raw.kickoff),\n    home_score: homeScore,\n    away_score: awayScore,\n    status: cleanString(raw.status, "finished"),\n  };\n}\n\nasync function addSyncLog({ action, status = "ok", message = "", importedCount = 0, updatedCount = 0 }) {\n  try {\n    await query(\n      \`INSERT INTO sync_logs (source, action, status, message, imported_count, updated_count)\n       VALUES ('results-sync', ?, ?, ?, ?, ?)\`,\n      [action, status, message, importedCount, updatedCount]\n    );\n  } catch {\n    // Starší instalace nemusí mít sync_logs. Synchronizace výsledků kvůli tomu nesmí spadnout.\n  }\n}\n\nasync function loadPayload(body = {}) {\n  if (Array.isArray(body.results)) {\n    return { source: cleanString(body.source, "manual-results-json"), results: body.results };\n  }\n\n  const configuredUrl = cleanString(process.env.RESULTS_SYNC_URL, null);\n  if (configuredUrl) {\n    const response = await fetch(configuredUrl, {\n      headers: process.env.RESULTS_SYNC_TOKEN\n        ? { Authorization: \`Bearer \${process.env.RESULTS_SYNC_TOKEN}\` }\n        : {},\n    });\n\n    if (!response.ok) {\n      throw new Error(\`Zdroj výsledků vrátil HTTP \${response.status}.\`);\n    }\n\n    const json = await response.json();\n    return { source: cleanString(json.source, "external-results-api"), results: Array.isArray(json.results) ? json.results : [] };\n  }\n\n  const text = await fs.readFile(SAMPLE_RESULTS_PATH, "utf8");\n  const json = JSON.parse(text);\n  return { source: cleanString(json.source, "sample-results"), results: Array.isArray(json.results) ? json.results : [] };\n}\n\nasync function findMatchForResult(result) {\n  if (result.external_id) {\n    const rows = await query(\n      \`SELECT * FROM matches WHERE external_id = ? ORDER BY id ASC LIMIT 1\`,\n      [result.external_id]\n    );\n    if (rows[0]) return rows[0];\n  }\n\n  if (result.start_time && result.home_team && result.away_team) {\n    const rows = await query(\n      \`SELECT * FROM matches\n       WHERE start_time = ? AND home_team = ? AND away_team = ?\n       ORDER BY id ASC LIMIT 1\`,\n      [result.start_time, result.home_team, result.away_team]\n    );\n    if (rows[0]) return rows[0];\n  }\n\n  if (result.home_team && result.away_team) {\n    const rows = await query(\n      \`SELECT * FROM matches\n       WHERE home_team = ? AND away_team = ?\n       ORDER BY CASE WHEN start_time IS NULL THEN 1 ELSE 0 END, start_time ASC, id ASC\n       LIMIT 1\`,\n      [result.home_team, result.away_team]\n    );\n    if (rows[0]) return rows[0];\n  }\n\n  return null;\n}\n\nfunction hasScore(result) {\n  return result.home_score !== null && result.away_score !== null;\n}\n\nfunction scoreChanged(match, result) {\n  return Number(match.home_score) !== Number(result.home_score) || Number(match.away_score) !== Number(result.away_score);\n}\n\nasync function buildPreview(payload) {\n  const normalized = payload.results.map((raw) => normalizeResult(raw, payload.source));\n  const items = [];\n  let matchedCount = 0;\n  let changeCount = 0;\n  let sameCount = 0;\n  let skippedCount = 0;\n\n  for (const result of normalized) {\n    if (!hasScore(result)) {\n      skippedCount++;\n      items.push({ action: "skip", reason: "missing_score", result });\n      continue;\n    }\n\n    const match = await findMatchForResult(result);\n    if (!match) {\n      skippedCount++;\n      items.push({ action: "skip", reason: "match_not_found", result });\n      continue;\n    }\n\n    matchedCount++;\n    const changed = scoreChanged(match, result) || !["finished", "evaluated"].includes(match.status);\n    if (changed) changeCount++; else sameCount++;\n\n    items.push({\n      action: changed ? "update" : "same",\n      match_id: match.id,\n      external_id: match.external_id,\n      home_team: match.home_team,\n      away_team: match.away_team,\n      start_time: match.start_time,\n      current_score: match.home_score === null || match.away_score === null ? null : `${match.home_score}:${match.away_score}`,\n      new_score: `${result.home_score}:${result.away_score}`,\n      status: match.status,\n    });\n  }\n\n  return {\n    source: payload.source,\n    totalCount: normalized.length,\n    matchedCount,\n    changeCount,\n    sameCount,\n    skippedCount,\n    items: items.slice(0, 80),\n  };\n}\n\nrouter.get("/status", auth, requireAdmin, async (req, res) => {\n  try {\n    const configured = Boolean(cleanString(process.env.RESULTS_SYNC_URL, null));\n    const lastRows = await query(\n      \`SELECT * FROM sync_logs WHERE source = 'results-sync' ORDER BY created_at DESC, id DESC LIMIT 5\`\n    ).catch(() => []);\n\n    res.json({\n      configured,\n      source: configured ? "RESULTS_SYNC_URL" : "lokální ukázkový soubor",\n      autoHint: configured\n        ? "Zdroj výsledků je nastavený v .env. Kontrola stáhne data z externí adresy."\n        : "RESULTS_SYNC_URL není nastavený, proto se použije pouze ukázkový soubor.",\n      logs: lastRows,\n    });\n  } catch (err) {\n    res.status(500).json({ error: "Nepodařilo se načíst stav výsledkové synchronizace.", detail: err.message });\n  }\n});\n\nrouter.post("/preview", auth, requireAdmin, async (req, res) => {\n  try {\n    const payload = await loadPayload(req.body || {});\n    const preview = await buildPreview(payload);\n    await addSyncLog({ action: "results-preview", message: `Náhled: změny ${preview.changeCount}, beze změny ${preview.sameCount}, přeskočeno ${preview.skippedCount}.` });\n    res.json(preview);\n  } catch (err) {\n    await addSyncLog({ action: "results-preview", status: "error", message: err.message });\n    res.status(500).json({ error: "Nepodařilo se zkontrolovat výsledky.", detail: err.message });\n  }\n});\n\nrouter.post("/apply", auth, requireAdmin, async (req, res) => {\n  try {\n    const payload = await loadPayload(req.body || {});\n    const preview = await buildPreview(payload);\n    const toUpdate = preview.items.filter((item) => item.action === "update");\n    let updatedCount = 0;\n    let evaluatedTips = 0;\n\n    for (const item of toUpdate) {\n      const [home, away] = item.new_score.split(":").map(Number);\n      await query(\n        \`UPDATE matches\n         SET home_score = ?, away_score = ?, status = 'finished', synced_at = NOW()\n         WHERE id = ?\`,\n        [home, away, item.match_id]\n      );\n      const evaluation = await evaluateMatchTips(item.match_id);\n      evaluatedTips += Number(evaluation.evaluated_tips || 0);\n      updatedCount++;\n    }\n\n    await addSyncLog({\n      action: "results-apply",\n      message: `Zapsáno ${updatedCount} výsledků, vyhodnoceno ${evaluatedTips} tipů.`,\n      updatedCount,\n    });\n\n    res.json({ ...preview, updatedCount, evaluatedTips });\n  } catch (err) {\n    await addSyncLog({ action: "results-apply", status: "error", message: err.message });\n    res.status(500).json({ error: "Nepodařilo se propsat výsledky.", detail: err.message });\n  }\n});\n\nexport default router;\n`;
writeIfChanged(resultsRoutePath, routeContent);

const sampleResultsContent = `{
  "source": "ms2026-results-sample",
  "note": "Ukázkový výsledkový feed pro test synchronizace. Ostrý zdroj nastavíš v api/.env přes RESULTS_SYNC_URL.",
  "results": [
    {
      "external_id": "FIFA-WC2026-GROUP-001",
      "home_score": 3,
      "away_score": 1,
      "status": "finished"
    }
  ]
}
`;
writeIfChanged(sampleResultsPath, sampleResultsContent);

// 1) Zapojit novou API route do serveru.
if (!server.includes('resultsSyncRoutes')) {
  const importNeedle = 'import publicRoutes from "./routes/public.routes.js";';
  if (!server.includes(importNeedle)) fail('V api/server.js se nepodařilo najít import publicRoutes.');
  server = server.replace(importNeedle, `${importNeedle}\nimport resultsSyncRoutes from "./routes/results-sync.routes.js";`);
}
if (!server.includes('app.use("/api/results-sync", resultsSyncRoutes);')) {
  const useNeedle = 'app.use("/api/sync", syncRoutes);';
  if (!server.includes(useNeedle)) fail('V api/server.js se nepodařilo najít app.use("/api/sync"...).');
  server = server.replace(useNeedle, `${useNeedle}\napp.use("/api/results-sync", resultsSyncRoutes);`);
}

// 2) Vylepšit servisní ozubené menu, pokud už existuje z patche 1.0G.
if (app.includes('const serviceActive = serviceTabs.some((tab) => tab.id === activeTab);') && !app.includes('const serviceTabIcon = (tabId) =>')) {
  app = app.replace(
    '  const serviceActive = serviceTabs.some((tab) => tab.id === activeTab);',
    `  const serviceActive = serviceTabs.some((tab) => tab.id === activeTab);\n  const serviceTabIcon = (tabId) => ({\n    evaluation: "✓",\n    prelaunch: "🚦",\n    sync: "↻",\n  }[tabId] || "•");`
  );
}

const oldDropdownButton = `                  <button key={tab.id} type="button" className={activeTab === tab.id ? "active" : ""} onClick={() => { setActiveTab(tab.id); setServiceMenuOpen(false); }}>
                    {tab.label}
                  </button>`;
const newDropdownButton = `                  <button key={tab.id} type="button" className={activeTab === tab.id ? "active" : ""} onClick={() => { setActiveTab(tab.id); setServiceMenuOpen(false); }}>
                    <span className="service-tab-icon" aria-hidden="true">{serviceTabIcon(tab.id)}</span>
                    <span>{tab.label}</span>
                  </button>`;
if (app.includes(oldDropdownButton)) {
  app = app.replace(oldDropdownButton, newDropdownButton);
}

const oldTriggerTitle = '<span>Servis</span>';
if (app.includes(oldTriggerTitle) && !app.includes('<span>Správa</span>')) {
  app = app.replace(oldTriggerTitle, '<span>Správa</span>');
}

// 3) Přidat výsledkovou synchronizaci do SyncPage.
if (!syncPage.includes('const [resultsPreview, setResultsPreview] = useState(null);')) {
  const stateNeedle = '  const [preview, setPreview] = useState(null);';
  if (!syncPage.includes(stateNeedle)) fail('V SyncPage.jsx se nepodařilo najít stav preview.');
  syncPage = syncPage.replace(stateNeedle, `${stateNeedle}\n  const [resultsPreview, setResultsPreview] = useState(null);\n  const [resultsStatus, setResultsStatus] = useState(null);`);
}

if (!syncPage.includes('async function loadResultsStatus()')) {
  const functionNeedle = '  async function loadStatus() {';
  if (!syncPage.includes(functionNeedle)) fail('V SyncPage.jsx se nepodařilo najít loadStatus.');
  const resultsFunctions = `  async function loadResultsStatus() {\n    try {\n      const data = await apiFetch("/results-sync/status");\n      setResultsStatus(data);\n    } catch (err) {\n      showToast?.(err.message || "Nepodařilo se načíst stav výsledků.");\n    }\n  }\n\n`;
  syncPage = syncPage.replace(functionNeedle, resultsFunctions + functionNeedle);
}

if (syncPage.includes('  useEffect(() => {\n    loadStatus();\n  }, []);') && !syncPage.includes('loadResultsStatus();')) {
  syncPage = syncPage.replace(
    '  useEffect(() => {\n    loadStatus();\n  }, []);',
    '  useEffect(() => {\n    loadStatus();\n    loadResultsStatus();\n  }, []);'
  );
}

if (!syncPage.includes('async function previewResultsSync()')) {
  const insertAfter = `  async function importSample() {
    setLoading(true);
    setPreview(null);
    try {
      const result = await apiFetch("/sync/import-sample", {
        method: "POST",
        body: JSON.stringify({ mode }),
      });
      showToast?.(\`Ukázkový import hotov: \${summaryText(result)}\`);
      await loadStatus();
      await onRefresh?.();
    } catch (err) {
      showToast?.(err.message || "Import se nepovedl.");
    } finally {
      setLoading(false);
    }
  }
`;
  if (!syncPage.includes(insertAfter)) fail('V SyncPage.jsx se nepodařilo najít funkci importSample v očekávaném tvaru.');
  const resultsFunctions = `
  async function previewResultsSync() {
    setLoading(true);
    setResultsPreview(null);
    try {
      const result = await apiFetch("/results-sync/preview", { method: "POST", body: JSON.stringify({}) });
      setResultsPreview(result);
      showToast?.(\`Kontrola výsledků: změny \${result.changeCount || 0}, přeskočeno \${result.skippedCount || 0}.\`);
      await loadResultsStatus();
    } catch (err) {
      showToast?.(err.message || "Kontrola výsledků se nepovedla.");
    } finally {
      setLoading(false);
    }
  }

  async function applyResultsSync() {
    setLoading(true);
    try {
      const result = await apiFetch("/results-sync/apply", { method: "POST", body: JSON.stringify({}) });
      setResultsPreview(result);
      showToast?.(\`Výsledky propsány: \${result.updatedCount || 0}, vyhodnoceno tipů: \${result.evaluatedTips || 0}.\`);
      await loadStatus();
      await loadResultsStatus();
      await onRefresh?.();
    } catch (err) {
      showToast?.(err.message || "Propsání výsledků se nepovedlo.");
    } finally {
      setLoading(false);
    }
  }
`;
  syncPage = syncPage.replace(insertAfter, insertAfter + resultsFunctions);
}

if (!syncPage.includes('3. Automatické stahování výsledků')) {
  const uiNeedle = `      {preview && (`;
  if (!syncPage.includes(uiNeedle)) fail('V SyncPage.jsx se nepodařilo najít místo před náhledem importu.');
  const resultsPanel = `      <div className="sync-panel results-sync-panel">
        <div>
          <h3>3. Automatické stahování výsledků</h3>
          <p className="muted">
            Bezpečný režim: nejdřív zkontroluje změny, teprve potom je můžeš propsat. Po propsání se zápasy vyhodnotí stejně jako při ručním zadání výsledku.
          </p>
          <p className="muted small-note">
            Zdroj: <strong>{resultsStatus?.source || "načítám…"}</strong>. {resultsStatus?.autoHint || ""}
          </p>
        </div>
        <div className="sync-actions">
          <button type="button" className="btn btn-soft" onClick={previewResultsSync} disabled={loading}>Zkontrolovat výsledky</button>
          <button type="button" className="btn" onClick={applyResultsSync} disabled={loading || !resultsPreview?.changeCount}>Propsat změny</button>
        </div>
      </div>

      {resultsPreview && (
        <div className="sync-preview results-sync-preview">
          <div>
            <h3>Náhled výsledků</h3>
            <p className="muted">Zdroj: <strong>{resultsPreview.source}</strong></p>
          </div>
          <div className="grid cards-4">
            <div className="mini-stat"><span>Celkem</span><strong>{resultsPreview.totalCount ?? 0}</strong></div>
            <div className="mini-stat"><span>Nalezeno</span><strong>{resultsPreview.matchedCount ?? 0}</strong></div>
            <div className="mini-stat"><span>Změny</span><strong>{resultsPreview.changeCount ?? 0}</strong></div>
            <div className="mini-stat"><span>Přeskočeno</span><strong>{resultsPreview.skippedCount ?? 0}</strong></div>
          </div>
          {resultsPreview.items?.length > 0 && (
            <div className="results-preview-list">
              {resultsPreview.items.slice(0, 10).map((item, index) => (
                <div key={index} className={item.action === "update" ? "result-preview-item update" : "result-preview-item"}>
                  <span>{item.home_team || item.result?.home_team || "?"} – {item.away_team || item.result?.away_team || "?"}</span>
                  <strong>{item.new_score || "bez skóre"}</strong>
                  <small>{item.action === "update" ? "změna" : item.action === "same" ? "beze změny" : "přeskočeno"}</small>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

`;
  syncPage = syncPage.replace(uiNeedle, resultsPanel + uiNeedle);
}

syncPage = syncPage.replace('3. Vložený JSON', '4. Vložený JSON');

// 4) CSS: lepší ozubené menu + výsledkový panel.
const cssBlock = `
/* Patch 1.0H – vylepšené servisní menu a výsledková synchronizace */
.service-menu-trigger {
  border-radius: 999px !important;
  background: linear-gradient(135deg, #102a83, #2457ff) !important;
  color: #fff !important;
  box-shadow: 0 16px 36px rgba(36, 87, 255, 0.22);
}

.service-menu-trigger::after {
  content: "▾";
  font-size: 12px;
  opacity: 0.8;
  transform: translateY(1px);
}

.service-tabs-dropdown {
  padding: 12px !important;
  border-radius: 26px !important;
}

.service-tabs-dropdown button {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 850;
}

.service-tabs-dropdown button.active {
  background: #153dca;
  color: #fff;
}

.service-tab-icon {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(37, 99, 235, 0.10);
  color: #153dca;
  flex: 0 0 auto;
}

.service-tabs-dropdown button.active .service-tab-icon {
  background: rgba(255, 255, 255, 0.20);
  color: #fff;
}

.results-sync-panel {
  border-color: rgba(37, 99, 235, 0.16);
  background: linear-gradient(135deg, rgba(239, 246, 255, 0.85), rgba(255, 255, 255, 0.92));
}

.results-sync-preview .mini-stat strong {
  color: #153dca;
}

.results-preview-list {
  display: grid;
  gap: 8px;
  margin-top: 14px;
}

.result-preview-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid rgba(16, 24, 40, 0.08);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.82);
}

.result-preview-item.update {
  border-color: rgba(34, 197, 94, 0.22);
  background: rgba(240, 253, 244, 0.75);
}

.result-preview-item span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-preview-item small {
  color: #667085;
  font-weight: 800;
}

@media (max-width: 760px) {
  .result-preview-item {
    grid-template-columns: 1fr auto;
  }

  .result-preview-item small {
    grid-column: 1 / -1;
  }
}
`;
if (!css.includes('Patch 1.0H')) css += '\n' + cssBlock;

fs.writeFileSync(appPath, app);
fs.writeFileSync(cssPath, css);
fs.writeFileSync(syncPagePath, syncPage);
fs.writeFileSync(serverPath, server);

console.log('✅ Patch 1.0H aplikován: lepší ozubené menu + bezpečná synchronizace výsledků.');
console.log('ℹ️ Pro ostrý zdroj výsledků nastav v api/.env RESULTS_SYNC_URL=https://...');
