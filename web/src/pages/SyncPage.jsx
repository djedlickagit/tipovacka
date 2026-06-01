import React, { useEffect, useMemo, useState } from "react";
import { API_BASE, apiFetch, getToken } from "../api";
import { formatDate } from "../utils/format";

const SAMPLE_TEMPLATE = `{
  "source": "manual-ms2026",
  "mode": "insert_missing",
  "matches": [
    {
      "external_id": "manual-001",
      "stage": "group",
      "group_name": "A",
      "home_team": "Tým 1",
      "away_team": "Tým 2",
      "start_time": "2026-06-11 21:00:00",
      "venue": "stadion",
      "status": "scheduled"
    }
  ]
}`;

function modeLabel(mode) {
  if (mode === "upsert_all") return "Aktualizovat existující";
  return "Jen doplnit chybějící";
}

function summaryText(result) {
  if (!result) return "";
  const insert = result.insertCount ?? result.importedCount ?? 0;
  const update = result.updateCount ?? result.updatedCount ?? 0;
  const keep = result.keepCount ?? result.keptCount ?? 0;
  const skip = result.skippedCount ?? 0;
  return `Nové: ${insert}, aktualizace: ${update}, ponechané: ${keep}, přeskočené: ${skip}.`;
}

export default function SyncPage({ onRefresh, showToast }) {
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [jsonText, setJsonText] = useState(SAMPLE_TEMPLATE);
  const [mode, setMode] = useState("insert_missing");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [resultsPreview, setResultsPreview] = useState(null);
  const [resultsStatus, setResultsStatus] = useState(null);

  const lastSynced = useMemo(() => {
    const value = status?.last_synced_at;
    return value ? formatDate(value) : "zatím neproběhla";
  }, [status]);

  async function loadResultsStatus() {
    try {
      const data = await apiFetch("/results-sync/status");
      setResultsStatus(data);
    } catch (err) {
      showToast?.(err.message || "Nepodařilo se načíst stav výsledků.");
    }
  }

  async function loadStatus() {
    try {
      const data = await apiFetch("/sync/status");
      setStatus(data.status || {});
      setLogs(data.logs || []);
    } catch (err) {
      showToast?.(err.message || "Nepodařilo se načíst synchronizaci.");
    }
  }

  useEffect(() => {
    loadStatus();
    loadResultsStatus();
  }, []);

  async function runSeedPreview() {
    setLoading(true);
    setPreview(null);
    try {
      const result = await apiFetch("/sync/preview-seed", {
        method: "POST",
        body: JSON.stringify({ mode }),
      });
      setPreview(result);
      showToast?.(`Náhled rozpisu: ${summaryText(result)}`);
    } catch (err) {
      showToast?.(err.message || "Náhled rozpisu se nepovedl.");
    } finally {
      setLoading(false);
    }
  }

  async function importSeed() {
    setLoading(true);
    setPreview(null);
    try {
      const result = await apiFetch("/sync/import-seed", {
        method: "POST",
        body: JSON.stringify({ mode }),
      });
      showToast?.(`Import rozpisu hotov: ${summaryText(result)}`);
      await loadStatus();
      await onRefresh?.();
    } catch (err) {
      showToast?.(err.message || "Import rozpisu se nepovedl.");
    } finally {
      setLoading(false);
    }
  }

  async function importSample() {
    setLoading(true);
    setPreview(null);
    try {
      const result = await apiFetch("/sync/import-sample", {
        method: "POST",
        body: JSON.stringify({ mode }),
      });
      showToast?.(`Ukázkový import hotov: ${summaryText(result)}`);
      await loadStatus();
      await onRefresh?.();
    } catch (err) {
      showToast?.(err.message || "Import se nepovedl.");
    } finally {
      setLoading(false);
    }
  }

  async function previewJson(event) {
    event?.preventDefault();
    setLoading(true);
    setPreview(null);
    try {
      const payload = JSON.parse(jsonText);
      const result = await apiFetch("/sync/preview-json", {
        method: "POST",
        body: JSON.stringify({ ...payload, mode }),
      });
      setPreview(result);
      showToast?.(`Náhled JSON: ${summaryText(result)}`);
    } catch (err) {
      showToast?.(err.message || "JSON není validní nebo náhled selhal.");
    } finally {
      setLoading(false);
    }
  }

  async function importJson(event) {
    event.preventDefault();
    setLoading(true);
    setPreview(null);
    try {
      const payload = JSON.parse(jsonText);
      const result = await apiFetch("/sync/import-json", {
        method: "POST",
        body: JSON.stringify({ ...payload, mode }),
      });
      showToast?.(`JSON import hotov: ${summaryText(result)}`);
      await loadStatus();
      await onRefresh?.();
    } catch (err) {
      showToast?.(err.message || "JSON není validní nebo import selhal.");
    } finally {
      setLoading(false);
    }
  }

  async function previewResultsSync() {
    setLoading(true);
    setResultsPreview(null);
    try {
      const result = await apiFetch("/results-sync/preview", { method: "POST", body: JSON.stringify({}) });
      setResultsPreview(result);
      showToast?.(`Kontrola výsledků: změny ${result.changeCount || 0}, přeskočeno ${result.skippedCount || 0}.`);
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
      showToast?.(`Výsledky propsány: ${result.updatedCount || 0}, vyhodnoceno tipů: ${result.evaluatedTips || 0}.`);
      await loadStatus();
      await loadResultsStatus();
      await onRefresh?.();
    } catch (err) {
      showToast?.(err.message || "Propsání výsledků se nepovedlo.");
    } finally {
      setLoading(false);
    }
  }

  async function loadJsonFromEndpoint(endpoint, fallback = SAMPLE_TEMPLATE) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const text = await response.text();
      setJsonText(text);
    } catch {
      setJsonText(fallback);
    }
  }

  return (
    <section className="card sync-page">
      <div className="section-head section-head-wrap">
        <div>
          <h2>Synchronizace / import MS 2026</h2>
          <p className="muted">
            Bezpečný mezikrok před živým API. Import doplňuje zápasy do vlastní databáze a výchozí režim nepřepisuje ruční úpravy.
          </p>
        </div>
        <button type="button" className="btn btn-soft" onClick={loadStatus} disabled={loading}>Obnovit stav</button>
      </div>

      <div className="grid cards-3 sync-stats">
        <div className="mini-stat">
          <span>Celkem zápasů</span>
          <strong>{Number(status?.total_matches || 0)}</strong>
        </div>
        <div className="mini-stat">
          <span>Importované / sync</span>
          <strong>{Number(status?.synced_matches || 0)}</strong>
        </div>
        <div className="mini-stat">
          <span>Poslední sync</span>
          <strong>{lastSynced}</strong>
        </div>
      </div>

      <div className="sync-panel sync-mode-panel">
        <div>
          <h3>Režim importu</h3>
          <p className="muted">
            Doporučeno je „Jen doplnit chybějící“. Druhý režim použij až ve chvíli, kdy opravdu chceš aktualizovat existující zápasy podle importu.
          </p>
        </div>
        <label className="sync-mode-select">Režim
          <select value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="insert_missing">Jen doplnit chybějící</option>
            <option value="upsert_all">Aktualizovat existující</option>
          </select>
        </label>
      </div>

      <div className="sync-panel">
        <div>
          <h3>1. Rozpis základních skupin MS 2026</h3>
          <p className="muted">
            Připravený ostrý seed základních skupin A–L. Import doplní zápasy do /api/matches, následně se propíšou do dashboardu, účtu tipovače i tabulek.
          </p>
          <p className="muted small-note">Aktuální režim: <strong>{modeLabel(mode)}</strong>. Doporučeno: Jen doplnit chybějící.</p>
        </div>
        <div className="sync-actions">
          <button type="button" className="btn btn-soft" onClick={runSeedPreview} disabled={loading}>Náhled</button>
          <button type="button" className="btn" onClick={importSeed} disabled={loading}>{loading ? "Pracuji…" : "Importovat rozpis"}</button>
        </div>
      </div>

      <div className="sync-panel">
        <div>
          <h3>2. Bezpečný test importu</h3>
          <p className="muted">
            Vloží nebo aktualizuje několik ukázkových zápasů. V režimu „Jen doplnit chybějící“ existující zápasy nepřepíše.
          </p>
        </div>
        <button type="button" className="btn btn-soft" onClick={importSample} disabled={loading}>Importovat ukázku</button>
      </div>

      <div className="sync-panel results-sync-panel">
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

      {preview && (
        <div className="sync-preview">
          <div>
            <h3>Náhled importu</h3>
            <p className="muted">Zdroj: <strong>{preview.source}</strong> · režim: <strong>{modeLabel(preview.mode)}</strong></p>
          </div>
          <div className="grid cards-4">
            <div className="mini-stat"><span>Celkem</span><strong>{preview.totalCount ?? 0}</strong></div>
            <div className="mini-stat"><span>Nové</span><strong>{preview.insertCount ?? 0}</strong></div>
            <div className="mini-stat"><span>Aktualizace</span><strong>{preview.updateCount ?? 0}</strong></div>
            <div className="mini-stat"><span>Ponechané</span><strong>{preview.keepCount ?? 0}</strong></div>
          </div>
          {preview.conflicts?.length > 0 && (
            <p className="muted small-note">Nalezené existující zápasy: {preview.conflicts.length}. V bezpečném režimu zůstanou beze změny.</p>
          )}
        </div>
      )}

      <form className="sync-json-box" onSubmit={importJson}>
        <div className="section-head section-head-wrap">
          <div>
            <h3>4. Vložený JSON</h3>
            <p className="muted">Sem půjde vložit kompletní rozpis, CSV převod nebo výstup z budoucího externího API. Párování běží přes <code>source</code> + <code>external_id</code>.</p>
          </div>
          <div className="sync-actions">
            <button type="button" className="btn btn-soft" onClick={() => loadJsonFromEndpoint("/sync/seed-json")}>Načíst rozpis</button>
            <button type="button" className="btn btn-soft" onClick={() => loadJsonFromEndpoint("/sync/sample-json")}>Načíst ukázku</button>
          </div>
        </div>
        <textarea
          className="json-textarea"
          value={jsonText}
          onChange={(event) => setJsonText(event.target.value)}
          spellCheck="false"
        />
        <div className="modal-actions">
          <button type="button" className="btn btn-soft" onClick={previewJson} disabled={loading}>Náhled JSON</button>
          <button type="submit" className="btn" disabled={loading}>Importovat JSON</button>
        </div>
      </form>

      <div className="sync-log">
        <h3>Log synchronizace</h3>
        {logs.length === 0 ? (
          <p className="muted">Zatím žádný záznam.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Čas</th>
                  <th>Zdroj</th>
                  <th>Akce</th>
                  <th>Stav</th>
                  <th>Nové</th>
                  <th>Aktualizace</th>
                  <th>Zpráva</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDate(log.created_at)}</td>
                    <td>{log.source}</td>
                    <td>{log.action}</td>
                    <td><span className={log.status === "ok" ? "badge badge-ok" : "badge badge-danger"}>{log.status}</span></td>
                    <td>{log.imported_count}</td>
                    <td>{log.updated_count}</td>
                    <td>{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
