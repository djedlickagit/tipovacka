import React, { useEffect, useMemo, useState } from "react";
import { apiFetch, setToken } from "./api";
import LoginScreen from "./auth/LoginScreen";
import TipsTable from "./components/TipsTable";
import StatCard from "./components/StatCard";
import SyncPage from "./pages/SyncPage";
import { adminTabs, playerTabs } from "./constants/tabs";
import { formatDate, matchLocked } from "./utils/format";
import "./styles.css";

const USERS_PER_PAGE = 8;
const MATCHES_PER_PAGE = 10;
const PLAYER_TIPS_PER_PAGE = 12;
const LEADERBOARD_PER_PAGE = 12;
const EVALUATION_PER_PAGE = 12;

const STAGE_OPTIONS = [
  { value: "group", label: "Skupiny" },
  { value: "round_of_32", label: "1. kolo play-off" },
  { value: "round_of_16", label: "Osmifinále" },
  { value: "quarter_final", label: "Čtvrtfinále" },
  { value: "semi_final", label: "Semifinále" },
  { value: "third_place", label: "O 3. místo" },
  { value: "final", label: "Finále" },
];


const TEAM_META = {
  "Alžírsko": { code: "ALG", flag: "🇩🇿" },
  "Anglie": { code: "ENG", flag: "🏴" },
  "Argentina": { code: "ARG", flag: "🇦🇷" },
  "Austrálie": { code: "AUS", flag: "🇦🇺" },
  "Belgie": { code: "BEL", flag: "🇧🇪" },
  "Bosna a Hercegovina": { code: "BIH", flag: "🇧🇦" },
  "Brazílie": { code: "BRA", flag: "🇧🇷" },
  "Chorvatsko": { code: "CRO", flag: "🇭🇷" },
  "Curaçao": { code: "CUW", flag: "🇨🇼" },
  "DR Kongo": { code: "COD", flag: "🇨🇩" },
  "Egypt": { code: "EGY", flag: "🇪🇬" },
  "Ekvádor": { code: "ECU", flag: "🇪🇨" },
  "Francie": { code: "FRA", flag: "🇫🇷" },
  "Ghana": { code: "GHA", flag: "🇬🇭" },
  "Haiti": { code: "HAI", flag: "🇭🇹" },
  "Irák": { code: "IRQ", flag: "🇮🇶" },
  "Japonsko": { code: "JPN", flag: "🇯🇵" },
  "Jižní Afrika": { code: "RSA", flag: "🇿🇦" },
  "Jordánsko": { code: "JOR", flag: "🇯🇴" },
  "Kanada": { code: "CAN", flag: "🇨🇦" },
  "Kapverdy": { code: "CPV", flag: "🇨🇻" },
  "Katar": { code: "QAT", flag: "🇶🇦" },
  "Kolumbie": { code: "COL", flag: "🇨🇴" },
  "Korejská republika": { code: "KOR", flag: "🇰🇷" },
  "Maroko": { code: "MAR", flag: "🇲🇦" },
  "Mexiko": { code: "MEX", flag: "🇲🇽" },
  "Nizozemsko": { code: "NED", flag: "🇳🇱" },
  "Norsko": { code: "NOR", flag: "🇳🇴" },
  "Nový Zéland": { code: "NZL", flag: "🇳🇿" },
  "Německo": { code: "GER", flag: "🇩🇪" },
  "Panama": { code: "PAN", flag: "🇵🇦" },
  "Paraguay": { code: "PAR", flag: "🇵🇾" },
  "Pobřeží slonoviny": { code: "CIV", flag: "🇨🇮" },
  "Portugalsko": { code: "POR", flag: "🇵🇹" },
  "Rakousko": { code: "AUT", flag: "🇦🇹" },
  "Saúdská Arábie": { code: "KSA", flag: "🇸🇦" },
  "Senegal": { code: "SEN", flag: "🇸🇳" },
  "Skotsko": { code: "SCO", flag: "🏴" },
  "Spojené státy": { code: "USA", flag: "🇺🇸" },
  "Tunisko": { code: "TUN", flag: "🇹🇳" },
  "Turecko": { code: "TUR", flag: "🇹🇷" },
  "Uruguay": { code: "URU", flag: "🇺🇾" },
  "Uzbekistán": { code: "UZB", flag: "🇺🇿" },
  "Írán": { code: "IRN", flag: "🇮🇷" },
  "Česko": { code: "CZE", flag: "🇨🇿" },
  "Španělsko": { code: "ESP", flag: "🇪🇸" },
  "Švédsko": { code: "SWE", flag: "🇸🇪" },
  "Švýcarsko": { code: "SUI", flag: "🇨🇭" },
};

function getTeamMeta(name) {
  return TEAM_META[name] || { code: "", flag: "⚽" };
}

function TeamBadge({ name, compact = false }) {
  const meta = getTeamMeta(name);
  return (
    <span className={`team-badge ${compact ? "team-badge-compact" : ""}`}>
      <span className="team-flag" aria-hidden="true">{meta.flag}</span>
      <span className="team-name">{name || "Neznámý tým"}</span>
      {meta.code && <span className="team-code">{meta.code}</span>}
    </span>
  );
}

function MatchTeams({ match, compact = false }) {
  return (
    <span className={`match-teams ${compact ? "match-teams-compact" : ""}`}>
      <TeamBadge name={match?.home_team} compact={compact} />
      <span className="match-versus">vs</span>
      <TeamBadge name={match?.away_team} compact={compact} />
    </span>
  );
}

const STATUS_OPTIONS = [
  { value: "scheduled", label: "Otevřeno" },
  { value: "locked", label: "Zamčeno" },
  { value: "finished", label: "Dohráno" },
  { value: "evaluated", label: "Vyhodnoceno" },
];

function stageLabel(value) {
  return STAGE_OPTIONS.find((stage) => stage.value === value)?.label || value || "-";
}

function statusLabel(match) {
  if (match?.locked_by_time && match?.status === "scheduled") return "Zamčeno časem";
  return STATUS_OPTIONS.find((status) => status.value === match?.status)?.label || match?.status || "-";
}

function playerTipState(match, tip, settings = {}) {
  if (match?.status === "evaluated") return "evaluated";
  if (matchLocked(match, settings)) return "locked";
  if (tip) return "done";
  return "missing";
}

function playerTipStateLabel(state) {
  if (state === "missing") return "Chybí tip";
  if (state === "done") return "Natipováno";
  if (state === "locked") return "Zamčeno";
  if (state === "evaluated") return "Vyhodnoceno";
  return "Vše";
}

function getPlayerLockShortLabel(match, settings = {}) {
  if (!matchLocked(match, settings)) return "";
  if ((settings?.tip_lock_mode || match?.tip_lock_mode) === "fixed_datetime") return "Uzavřeno termínem";
  if (["finished", "evaluated"].includes(match?.status)) return "Dohráno";
  if (match?.status === "locked") return "Zamčeno adminem";
  return "Zápas začal";
}

function getPlayerLockNotice(match, settings = {}) {
  if (!matchLocked(match, settings)) return "";
  if (match?.lock_message) return match.lock_message;
  if (["finished", "evaluated"].includes(match?.status)) return "Zápas je už dohraný a tip nejde změnit.";
  if (match?.status === "locked") return "Zápas je ručně uzamčený administrátorem.";
  if ((settings?.tip_lock_mode || match?.tip_lock_mode) === "fixed_datetime") return "Tipování je už uzamčeno pevným termínem.";
  return "Tipování tohoto zápasu je už uzamčeno, protože zápas začal.";
}

function formatLockDate(value) {
  const date = normalizeDateValue(value);
  if (!date) return "nezadaný čas";
  return date.toLocaleString("cs-CZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getLockInfo(settings = {}) {
  const mode = settings?.tip_lock_mode || "match_start";

  if (mode === "fixed_datetime") {
    const fixedText = formatLockDate(settings?.tip_lock_at);
    return {
      mode,
      pill: `🔒 tipování se uzavře ${fixedText}`,
      short: `Tipování se uzavírá jednotně: ${fixedText}.`,
      rules: `Pevné uzavření všech tipů: ${fixedText}.`,
    };
  }

  return {
    mode,
    pill: "🔒 tipy se zamykají při výkopu zápasu",
    short: "Tipování se uzavírá pro každý zápas samostatně v čase výkopu.",
    rules: "Tipy se uzamykají samostatně podle začátku každého zápasu.",
  };
}


function getMatchStartValue(match) {
  return match?.start_time || match?.startTime || match?.kickoff_time || match?.match_date || match?.date || "";
}

function normalizeDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const raw = String(value).trim();
  if (!raw) return null;

  // MySQL DATETIME typicky přijde jako "2026-05-26 18:00:00".
  // Pro prohlížeč je bezpečnější převést mezeru na T.
  const normalized = raw.replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDateKey(value) {
  const date = normalizeDateValue(value);
  if (!date) return "";
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getRawDateKey(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

function getDateKeyCandidates(value) {
  return Array.from(new Set([getDateKey(value), getRawDateKey(value)].filter(Boolean)));
}

function isMatchOnDate(match, dateKey) {
  return getDateKeyCandidates(getMatchStartValue(match)).includes(dateKey);
}

function getComparableMatchDate(match) {
  return normalizeDateValue(getMatchStartValue(match));
}

function formatMatchTime(value) {
  if (!value) return "bez času";
  const date = normalizeDateValue(value);
  if (!date) return "bez času";
  return date.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
}

function scoreText(match) {
  const hasHome = match?.home_score !== null && match?.home_score !== undefined && match?.home_score !== "";
  const hasAway = match?.away_score !== null && match?.away_score !== undefined && match?.away_score !== "";
  return hasHome && hasAway ? `${match.home_score}:${match.away_score}` : "-:-";
}

function formatScore(match) {
  return scoreText(match);
}

function formatPublicDateOnly(value) {
  if (!value) return "bez data";
  const normalized = String(value).replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "bez data";
  return date.toLocaleDateString("cs-CZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isMatchFinished(match) {
  return ["finished", "evaluated"].includes(match?.status) || scoreText(match) !== "-:-";
}

function matchHasSavedResult(match) {
  return match?.home_score !== null
    && match?.home_score !== undefined
    && match?.home_score !== ""
    && match?.away_score !== null
    && match?.away_score !== undefined
    && match?.away_score !== "";
}

function evaluationState(match, tipsForMatch = []) {
  const hasResult = matchHasSavedResult(match);
  const hasTips = tipsForMatch.length > 0;
  const hasUnevaluatedTips = tipsForMatch.some((tip) => tip.points === null || tip.points === undefined || tip.points === "");

  if (!hasResult) return "missing_result";
  if (match?.status !== "evaluated") return "needs_evaluation";
  if (hasTips && hasUnevaluatedTips) return "needs_evaluation";
  return "ok";
}

function evaluationStateLabel(state) {
  if (state === "missing_result") return "Čeká na výsledek";
  if (state === "needs_evaluation") return "Vyžaduje přepočet";
  return "OK";
}

function getResultType(home, away) {
  const h = Number(home);
  const a = Number(away);
  if (!Number.isFinite(h) || !Number.isFinite(a)) return "unknown";
  if (h > a) return "home";
  if (h < a) return "away";
  return "draw";
}

function getTipPointsInfo(match, tip, settings = {}) {
  if (!tip) {
    return { tone: "empty", label: "Bez tipu", detail: "Zápas zatím nemáš natipovaný." };
  }

  if (!isMatchFinished(match)) {
    return { tone: "pending", label: "Čeká", detail: "Body se dopočítají po zadání výsledku." };
  }

  const hasPoints = tip.points !== null && tip.points !== undefined && tip.points !== "";
  if (!hasPoints) {
    return { tone: "pending", label: "Čeká na vyhodnocení", detail: "Výsledek je uložený, body ještě nejsou přepočítané." };
  }

  const points = Number(tip.points);
  const exactPoints = Number(settings?.exact_score_points ?? 3);
  const correctPoints = Number(settings?.correct_result_points ?? 1);
  const realHome = Number(match?.home_score);
  const realAway = Number(match?.away_score);
  const tipHome = Number(tip?.home_tip);
  const tipAway = Number(tip?.away_tip);

  if (Number.isFinite(realHome) && Number.isFinite(realAway) && realHome === tipHome && realAway === tipAway) {
    return { tone: "exact", label: `+${points} b.`, detail: `Přesný výsledek +${exactPoints} b.` };
  }

  if (getResultType(realHome, realAway) === getResultType(tipHome, tipAway) && getResultType(realHome, realAway) !== "unknown") {
    return { tone: "correct", label: `+${points} b.`, detail: `Správný vítěz/remíza +${correctPoints} b.` };
  }

  return { tone: "wrong", label: `${points} b.`, detail: "Bez bodu – netrefený vítěz/remíza." };
}

function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function UserModal({ modal, onClose, onSubmit, onDelete, onToggle }) {
  if (!modal) return null;

  const { type, user } = modal;
  const title =
    type === "edit"
      ? "Upravit tipovače"
      : type === "access"
        ? user?.role === "admin" ? "Změnit heslo admina" : "Změnit PIN tipovače"
        : type === "delete"
          ? "Smazat uživatele"
          : user?.is_active ? "Deaktivovat tipovače" : "Aktivovat tipovače";

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">Správa uživatele</p>
            <h3>{title}</h3>
            {user && <p className="muted">{user.name} · {user.login_name || "bez loginu"}</p>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Zavřít">×</button>
        </div>

        {type === "edit" && (
          <form className="form-grid modal-form" onSubmit={onSubmit}>
            <label>Jméno<input name="name" defaultValue={user?.name || ""} required /></label>
            <label>Login<input name="login_name" defaultValue={user?.login_name || ""} required /></label>
            <label>Email<input name="email" type="email" defaultValue={user?.email || ""} /></label>
            <div className="modal-actions">
              <button type="button" className="btn btn-soft" onClick={onClose}>Zrušit</button>
              <button type="submit" className="btn">Uložit změny</button>
            </div>
          </form>
        )}

        {type === "access" && (
          <form className="form-grid modal-form" onSubmit={onSubmit}>
            {user?.role === "admin" ? (
              <label>Nové heslo<input name="password" type="password" autoComplete="new-password" required /></label>
            ) : (
              <label>Nový PIN<input name="pin" inputMode="numeric" autoComplete="off" placeholder="např. 1234" required /></label>
            )}
            <div className="modal-actions">
              <button type="button" className="btn btn-soft" onClick={onClose}>Zrušit</button>
              <button type="submit" className="btn">Uložit přístup</button>
            </div>
          </form>
        )}

        {type === "toggle" && (
          <div className="confirm-box">
            <p>
              {user?.is_active
                ? "Deaktivovaný tipovač se nebude moci přihlásit, ale jeho tipy a body zůstanou zachované."
                : "Po aktivaci se tipovač bude moci znovu přihlásit."}
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-soft" onClick={onClose}>Zrušit</button>
              <button type="button" className={user?.is_active ? "btn btn-warning" : "btn"} onClick={() => onToggle(user)}>
                {user?.is_active ? "Deaktivovat" : "Aktivovat"}
              </button>
            </div>
          </div>
        )}

        {type === "delete" && (
          <div className="confirm-box danger-zone">
            <p>
              Opravdu chceš smazat uživatele <strong>{user?.name}</strong>? Smazání je dostupné pouze tehdy, pokud uživatel ještě nemá žádné tipy.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-soft" onClick={onClose}>Zrušit</button>
              <button type="button" className="btn btn-danger" onClick={() => onDelete(user)}>Smazat uživatele</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MatchModal({ modal, onClose, onSubmit, onDelete }) {
  if (!modal) return null;

  const { type, match } = modal;
  const title =
    type === "edit"
      ? "Upravit zápas"
      : type === "result"
        ? "Zadat výsledek"
        : "Smazat zápas";

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="modal-card modal-card-wide" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">Správa zápasu</p>
            <h3>{title}</h3>
            {match && <p className="muted">{match.home_team} – {match.away_team}</p>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Zavřít">×</button>
        </div>

        {type === "edit" && (
          <form className="form-grid modal-form" onSubmit={onSubmit}>
            <label>Fáze
              <select name="stage" defaultValue={match?.stage || "group"}>
                {STAGE_OPTIONS.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
              </select>
            </label>
            <label>Skupina
              <select name="group_name" defaultValue={match?.group_name || ""}>
                <option value="">Bez skupiny</option>
                {"ABCDEFGHIJKL".split("").map((group) => <option key={group} value={group}>{group}</option>)}
              </select>
            </label>
            <label>Domácí tým<input name="home_team" defaultValue={match?.home_team || ""} required /></label>
            <label>Hostující tým<input name="away_team" defaultValue={match?.away_team || ""} required /></label>
            <label>Začátek<input name="start_time" type="datetime-local" defaultValue={toDateTimeLocal(match?.start_time)} /></label>
            <label>Stav
              <select name="status" defaultValue={match?.status || "scheduled"}>
                {STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
              </select>
            </label>
            <div className="modal-actions">
              <button type="button" className="btn btn-soft" onClick={onClose}>Zrušit</button>
              <button type="submit" className="btn">Uložit zápas</button>
            </div>
          </form>
        )}

        {type === "result" && (
          <form className="form-grid modal-form result-form" onSubmit={onSubmit}>
            <label>{match?.home_team || "Domácí"}<input name="home_score" type="number" min="0" defaultValue={match?.home_score ?? ""} required /></label>
            <label>{match?.away_team || "Hosté"}<input name="away_score" type="number" min="0" defaultValue={match?.away_score ?? ""} required /></label>
            <p className="muted full">Po uložení výsledku můžeš následně spustit vyhodnocení tipů.</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-soft" onClick={onClose}>Zrušit</button>
              <button type="submit" className="btn">Uložit výsledek</button>
            </div>
          </form>
        )}

        {type === "delete" && (
          <div className="confirm-box danger-zone">
            <p>
              Opravdu chceš smazat zápas <strong>{match?.home_team} – {match?.away_team}</strong>? Smazání je dostupné pouze tehdy, pokud k zápasu ještě neexistují tipy.
            </p>
            <p className="muted">Aktuálně evidovaných tipů: <strong>{match?.tips_count ?? 0}</strong></p>
            <div className="modal-actions">
              <button type="button" className="btn btn-soft" onClick={onClose}>Zrušit</button>
              <button type="button" className="btn btn-danger" onClick={() => onDelete(match)}>Smazat zápas</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TipModal({ modal, onClose, onSubmit, onDelete, onBulkDelete }) {
  if (!modal) return null;

  const tip = modal.tip;
  const ids = modal.ids || [];
  const isDelete = modal.type === "delete";
  const isBulkDelete = modal.type === "bulkDelete";
  const title = isBulkDelete ? "Smazat vybrané tipy" : isDelete ? "Smazat tip" : "Upravit tip";

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">Správa tipu</p>
            <h3>{title}</h3>
            {isBulkDelete ? (
              <p className="muted">Vybráno tipů: {ids.length}</p>
            ) : (
              <p className="muted">{tip?.user_name} · {tip?.home_team} – {tip?.away_team}</p>
            )}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Zavřít">×</button>
        </div>

        {modal.type === "edit" && (
          <form className="form-grid modal-form result-form" onSubmit={onSubmit}>
            <input type="hidden" name="user_id" value={tip?.user_id || ""} />
            <input type="hidden" name="match_id" value={tip?.match_id || ""} />
            <label>{tip?.home_team || "Domácí"}<input name="home_tip" type="number" min="0" defaultValue={tip?.home_tip ?? ""} required /></label>
            <label>{tip?.away_team || "Hosté"}<input name="away_tip" type="number" min="0" defaultValue={tip?.away_tip ?? ""} required /></label>
            <p className="muted full">Admin může opravit tip i po uzavření tipování. Po uložení se body u tipu vynulují, aby šlo korektně znovu spustit vyhodnocení.</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-soft" onClick={onClose}>Zrušit</button>
              <button type="submit" className="btn">Uložit tip</button>
            </div>
          </form>
        )}

        {isDelete && (
          <div className="confirm-box danger-zone">
            <p>Opravdu chceš smazat tip <strong>{tip?.user_name}</strong> na zápas <strong>{tip?.home_team} – {tip?.away_team}</strong>?</p>
            <p className="muted">Smazání tipu ovlivní žebříček. Po smazání doporučujeme znovu spustit vyhodnocení.</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-soft" onClick={onClose}>Zrušit</button>
              <button type="button" className="btn btn-danger" onClick={() => onDelete?.(tip)}>Smazat tip</button>
            </div>
          </div>
        )}

        {isBulkDelete && (
          <div className="confirm-box danger-zone">
            <p>Opravdu chceš hromadně smazat <strong>{ids.length}</strong> vybraných tipů?</p>
            <p className="muted">Tuto akci nepoužívej na ostrých datech bez rozmyslu. Body v žebříčku se změní podle smazaných tipů.</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-soft" onClick={onClose}>Zrušit</button>
              <button type="button" className="btn btn-danger" onClick={() => onBulkDelete?.(ids)}>Smazat vybrané</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function PublicLanding({ onBack }) {
  const [data, setData] = useState({ matches: [], leaderboard: [], standings: [], settings: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadPublicData() {
    setLoading(true);
    setError("");
    try {
      const result = await apiFetch("/public/summary");
      setData({
        matches: result.matches || [],
        leaderboard: result.leaderboard || [],
        standings: result.standings || [],
        settings: result.settings || null,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPublicData();
  }, []);

  const lockInfo = useMemo(() => getLockInfo(data.settings), [data.settings]);

  const todayMatches = useMemo(() => {
    const todayKey = getDateKey(new Date());
    return data.matches
      .filter((match) => isMatchOnDate(match, todayKey))
      .sort((a, b) => (getComparableMatchDate(a)?.getTime() || 0) - (getComparableMatchDate(b)?.getTime() || 0));
  }, [data.matches]);

  const upcomingMatches = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return data.matches
      .filter((match) => !isMatchFinished(match))
      .filter((match) => {
        const date = getComparableMatchDate(match);
        return date && date.getTime() >= today.getTime() && !isMatchOnDate(match, getDateKey(today));
      })
      .sort((a, b) => (getComparableMatchDate(a)?.getTime() || 0) - (getComparableMatchDate(b)?.getTime() || 0))
      .slice(0, 8);
  }, [data.matches]);

  const latestResults = useMemo(() => {
    return data.matches
      .filter(isMatchFinished)
      .sort((a, b) => (getComparableMatchDate(b)?.getTime() || 0) - (getComparableMatchDate(a)?.getTime() || 0))
      .slice(0, 8);
  }, [data.matches]);

  const publicStats = useMemo(() => {
    return {
      matches: data.matches.length,
      players: data.leaderboard.length,
      results: data.matches.filter(isMatchFinished).length,
      groups: data.standings.length,
    };
  }, [data.matches, data.leaderboard, data.standings]);

  return (
    <div className="app-shell public-shell">
      <header className="hero public-hero">
        <div className="hero-bg-cup" aria-hidden="true">🏆</div>
        <div className="hero-content">
          <p className="eyebrow">MS ve fotbale 2026 · veřejný přehled</p>
          <h1>Tipovačka</h1>
          <p className="hero-text">Výsledky, tabulky skupin, nejbližší zápasy a průběžný žebříček bez přihlášení.</p>
          <div className="hero-pills">
            <span>⚽ {data.settings?.exact_score_points ?? 3} body přesný výsledek</span>
            <span>🏆 {data.settings?.correct_result_points ?? 1} bod vítěz/remíza</span>
            <span>{lockInfo.pill}</span>
          </div>
        </div>
        <div className="hero-side">
          <button className="btn btn-light" type="button" onClick={loadPublicData} disabled={loading}>{loading ? "Načítám..." : "Obnovit"}</button>
          <button className="btn btn-ghost" type="button" onClick={onBack}>Přihlášení</button>
        </div>
      </header>

      {error && <div className="toast error-toast">{error}</div>}

      <main>
        <section className="stats-grid public-stats-grid">
          <StatCard label="Zápasů" value={publicStats.matches} />
          <StatCard label="Tipovačů" value={publicStats.players} />
          <StatCard label="Výsledků" value={publicStats.results} />
          <StatCard label="Tabulek" value={publicStats.groups} />
        </section>

        <section className="public-grid">
          <div className="card public-main-card">
            <div className="section-head compact-head">
              <div>
                <h2>Dnešní zápasy</h2>
                <p className="muted">Pokud se dnes nehraje, níže najdeš nejbližší další zápasy.</p>
              </div>
            </div>
            <div className="match-list public-match-list">
              {todayMatches.map((match) => (
                <div key={match.id} className="match-row public-match-row">
                  <div className="match-date-block">
                    <strong>{formatMatchTime(match.start_time)}</strong>
                    <span>{stageLabel(match.stage)}{match.group_name ? ` · Sk. ${match.group_name}` : ""}</span>
                  </div>
                  <div className="match-main">
                    <MatchTeams match={match} />
                    <span className="muted">Tipů: {match.tipped_players_count || 0}</span>
                  </div>
                  <div className="match-score public-score">{formatScore(match)}</div>
                </div>
              ))}
              {!todayMatches.length && <div className="empty-line">Dnes není v aplikaci žádný zápas.</div>}
            </div>
          </div>

          <aside className="card public-side-card">
            <h2>Žebříček</h2>
            <div className="public-leaderboard-list">
              {data.leaderboard.slice(0, 10).map((row, index) => (
                <div key={row.id} className="public-leader-row">
                  <span className="rank-badge">{index + 1}</span>
                  <strong>{row.name}</strong>
                  <span>{row.points} b.</span>
                </div>
              ))}
              {!data.leaderboard.length && <div className="empty-line">Žebříček je zatím prázdný.</div>}
            </div>
          </aside>
        </section>

        <section className="public-grid two-columns">
          <div className="card">
            <h2>Nejbližší další zápasy</h2>
            <div className="match-list public-match-list">
              {upcomingMatches.map((match) => (
                <div key={match.id} className="match-row public-match-row compact-public-match-row">
                  <div className="match-date-block">
                    <strong>{formatPublicDateOnly(match.start_time)}</strong>
                    <span>{formatMatchTime(match.start_time)}</span>
                  </div>
                  <div className="match-main">
                    <MatchTeams match={match} />
                    <span className="muted">{stageLabel(match.stage)}{match.group_name ? ` · Sk. ${match.group_name}` : ""}</span>
                  </div>
                  <span className={`status-pill ${match.locked_by_time ? "locked" : ""}`}>{statusLabel(match)}</span>
                </div>
              ))}
              {!upcomingMatches.length && <div className="empty-line">Žádné další zápasy nejsou připravené.</div>}
            </div>
          </div>

          <div className="card">
            <h2>Poslední výsledky</h2>
            <div className="match-list public-match-list">
              {latestResults.map((match) => (
                <div key={match.id} className="match-row public-match-row compact-public-match-row">
                  <div className="match-date-block">
                    <strong>{formatPublicDateOnly(match.start_time)}</strong>
                    <span>{stageLabel(match.stage)}</span>
                  </div>
                  <div className="match-main"><MatchTeams match={match} /></div>
                  <div className="match-score public-score">{formatScore(match)}</div>
                </div>
              ))}
              {!latestResults.length && <div className="empty-line">Zatím nejsou zadané žádné výsledky.</div>}
            </div>
          </div>
        </section>

        <section className="card standings-page-card public-standings-card">
          <div className="section-head standings-page-head">
            <div>
              <h2>Tabulky skupin</h2>
              <p className="muted">Tabulky se zobrazí po zadání výsledků skupinových zápasů.</p>
            </div>
          </div>
          <div className="standings-grid public-standings-grid">
            {data.standings.map((group) => (
              <section key={group.group_name} className="standings-card">
                <div className="standings-card-head">
                  <div>
                    <p className="eyebrow dark">Skupina</p>
                    <h3>{group.group_name}</h3>
                  </div>
                  <span>{group.played_matches} záp.</span>
                </div>
                <div className="table-wrap standings-table-wrap">
                  <table className="standings-table">
                    <thead><tr><th>#</th><th>Tým</th><th>Z</th><th>Skóre</th><th>Body</th></tr></thead>
                    <tbody>
                      {group.teams.map((team) => (
                        <tr key={team.team}>
                          <td>{team.position}</td>
                          <td><TeamBadge name={team.team} compact /></td>
                          <td>{team.played}</td>
                          <td>{team.goals_for}:{team.goals_against}</td>
                          <td><strong>{team.points}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
            {!data.standings.length && <div className="empty-line">Zatím není odehraný žádný skupinový zápas s výsledkem.</div>}
          </div>
        </section>

        <section className="card rules-preview public-rules-card">
          <h2>Pravidla</h2>
          <p className="muted rules-lock-note">{lockInfo.rules}</p>
          <pre>{data.settings?.rules_text || "Pravidla zatím nejsou vyplněná."}</pre>
        </section>
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [publicMode, setPublicMode] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [serviceMenuOpen, setServiceMenuOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [tips, setTips] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [standings, setStandings] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [userModal, setUserModal] = useState(null);
  const [matchSearch, setMatchSearch] = useState("");
  const [matchStage, setMatchStage] = useState("all");
  const [matchGroup, setMatchGroup] = useState("all");
  const [matchPage, setMatchPage] = useState(1);
  const [matchModal, setMatchModal] = useState(null);
  const [tipModal, setTipModal] = useState(null);
  const [playerTipSearch, setPlayerTipSearch] = useState("");
  const [playerTipFilter, setPlayerTipFilter] = useState("all");
  const [playerTipStage, setPlayerTipStage] = useState("all");
  const [playerTipGroup, setPlayerTipGroup] = useState("all");
  const [playerTipPage, setPlayerTipPage] = useState(1);
  const [leaderboardSearch, setLeaderboardSearch] = useState("");
  const [leaderboardPage, setLeaderboardPage] = useState(1);
  const [evaluationFilter, setEvaluationFilter] = useState("needs_attention");
  const [evaluationPage, setEvaluationPage] = useState(1);

  function showToast(message) {
    setToast(message);
    window.clearTimeout(window.__tipToast);
    window.__tipToast = window.setTimeout(() => setToast(""), 3500);
  }

  function logout() {
    setToken("");
    setUser(null);
    setUsers([]);
    setMatches([]);
    setTips([]);
    setLeaderboard([]);
    setStandings([]);
    setSettings(null);
    setActiveTab("dashboard");
    setServiceMenuOpen(false);
    setUserModal(null);
    setMatchModal(null);
    setTipModal(null);
  }

  async function loadAll(currentUser = user) {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [matchesData, tipsData, leaderboardData, standingsData, settingsData] = await Promise.all([
        apiFetch("/matches"),
        apiFetch("/tips"),
        apiFetch("/leaderboard"),
        apiFetch("/standings"),
        apiFetch("/settings/scoring"),
      ]);
      setMatches(matchesData);
      setTips(tipsData);
      setLeaderboard(leaderboardData);
      setStandings(standingsData);
      setSettings(settingsData);

      if (currentUser.role === "admin") setUsers(await apiFetch("/users"));
      else setUsers([currentUser]);
    } catch (err) {
      showToast(err.message);
      if (err.message.toLowerCase().includes("přihl")) logout();
    } finally {
      setLoading(false);
    }
  }

  async function bootstrap() {
    try {
      const result = await apiFetch("/auth/me");
      setUser(result.user);
      setActiveTab("dashboard");
      await loadAll(result.user);
    } catch {
      setUser(null);
    }
  }

  useEffect(() => {
    bootstrap();
  }, []);

  useEffect(() => {
    setUserPage(1);
  }, [userSearch, users.length]);

  useEffect(() => {
    setMatchPage(1);
  }, [matchSearch, matchStage, matchGroup, matches.length]);

  useEffect(() => {
    setPlayerTipPage(1);
  }, [playerTipSearch, playerTipFilter, playerTipStage, playerTipGroup, matches.length, tips.length]);

  useEffect(() => {
    setLeaderboardPage(1);
  }, [leaderboardSearch, leaderboard.length]);

  useEffect(() => {
    setEvaluationPage(1);
  }, [evaluationFilter, matches.length, tips.length]);

  async function afterLogin(loggedUser) {
    setPublicMode(false);
    setUser(loggedUser);
    setActiveTab("dashboard");
    await loadAll(loggedUser);
  }

  const players = useMemo(() => users.filter((u) => u.role === "player"), [users]);
  const myTipsByMatch = useMemo(() => {
    const map = new Map();
    for (const tip of tips) map.set(Number(tip.match_id), tip);
    return map;
  }, [tips]);

  const stats = useMemo(() => {
    const leader = leaderboard[0];
    return {
      players: user?.role === "admin" ? players.length : leaderboard.length,
      matches: matches.length,
      tips: tips.length,
      leader: leader ? `${leader.name} (${leader.points} b.)` : "zatím nikdo",
    };
  }, [players, matches, tips, leaderboard, user]);

  const lockInfo = useMemo(() => getLockInfo(settings), [settings]);

  const todayMatches = useMemo(() => {
    const todayKey = getDateKey(new Date());
    return matches
      .filter((match) => isMatchOnDate(match, todayKey))
      .sort((a, b) => (getComparableMatchDate(a)?.getTime() || 0) - (getComparableMatchDate(b)?.getTime() || 0));
  }, [matches]);

  const upcomingMatches = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return matches
      .filter((match) => !isMatchFinished(match))
      .filter((match) => {
        const date = getComparableMatchDate(match);
        return date && date.getTime() >= today.getTime() && !isMatchOnDate(match, getDateKey(today));
      })
      .sort((a, b) => (getComparableMatchDate(a)?.getTime() || 0) - (getComparableMatchDate(b)?.getTime() || 0))
      .slice(0, 6);
  }, [matches]);

  const latestResults = useMemo(() => {
    return matches
      .filter(isMatchFinished)
      .sort((a, b) => (getComparableMatchDate(b)?.getTime() || 0) - (getComparableMatchDate(a)?.getTime() || 0))
      .slice(0, 6);
  }, [matches]);

  const tipsByMatchForAudit = useMemo(() => {
    const map = new Map();
    for (const tip of tips) {
      const key = Number(tip.match_id);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(tip);
    }
    return map;
  }, [tips]);

  const evaluationRows = useMemo(() => {
    return matches.map((match) => {
      const rowTips = tipsByMatchForAudit.get(Number(match.id)) || [];
      const state = evaluationState(match, rowTips);
      const evaluatedTips = rowTips.filter((tip) => tip.points !== null && tip.points !== undefined && tip.points !== "").length;
      const pointsSum = rowTips.reduce((sum, tip) => {
        const value = Number(tip.points);
        return Number.isFinite(value) ? sum + value : sum;
      }, 0);

      return {
        match,
        state,
        tipsCount: rowTips.length,
        evaluatedTips,
        pointsSum,
      };
    }).sort((a, b) => {
      const order = { needs_evaluation: 0, missing_result: 1, ok: 2 };
      const diff = (order[a.state] ?? 9) - (order[b.state] ?? 9);
      if (diff) return diff;
      return (getComparableMatchDate(a.match)?.getTime() || 0) - (getComparableMatchDate(b.match)?.getTime() || 0);
    });
  }, [matches, tipsByMatchForAudit]);

  const evaluationStats = useMemo(() => {
    return evaluationRows.reduce((acc, row) => {
      acc.total += 1;
      acc.tips += row.tipsCount;
      acc.points += row.pointsSum;
      if (row.state === "missing_result") acc.missingResult += 1;
      if (row.state === "needs_evaluation") acc.needsEvaluation += 1;
      if (row.state === "ok") acc.ok += 1;
      return acc;
    }, { total: 0, missingResult: 0, needsEvaluation: 0, ok: 0, tips: 0, points: 0 });
  }, [evaluationRows]);

  const prelaunchCheck = useMemo(() => {
    const groupMatches = matches.filter((match) => match.stage === "group");
    const missingTime = matches.filter((match) => !getComparableMatchDate(match));
    const missingTeams = matches.filter((match) => !match.home_team || !match.away_team);
    const missingGroup = groupMatches.filter((match) => !match.group_name);
    const needsEvaluation = evaluationRows.filter((row) => row.state === "needs_evaluation");
    const evaluatedTips = tips.filter((tip) => tip.points !== null && tip.points !== undefined && tip.points !== "").length;
    const groupsCount = new Set(groupMatches.map((match) => match.group_name).filter(Boolean)).size;
    const teamsCount = new Set(matches.flatMap((match) => [match.home_team, match.away_team]).filter(Boolean)).size;
    const hasSeedLikeData = matches.some((match) => match.external_id || match.source || String(match.group_name || "").trim());

    const nextMatch = matches
      .filter((match) => !isMatchFinished(match))
      .map((match) => ({ match, date: getComparableMatchDate(match) }))
      .filter((item) => item.date)
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0]?.match || null;

    const issues = [];
    if (!matches.length) issues.push("V systému nejsou žádné zápasy.");
    if (matches.length && groupMatches.length < 72) issues.push(`Skupinových zápasů je ${groupMatches.length}. Pro kompletní základní část MS 2026 očekáváme 72.`);
    if (!players.length) issues.push("Není založený žádný tipovač.");
    if (missingTime.length) issues.push(`Zápasy bez data/času: ${missingTime.length}.`);
    if (missingTeams.length) issues.push(`Zápasy bez obou týmů: ${missingTeams.length}.`);
    if (missingGroup.length) issues.push(`Skupinové zápasy bez skupiny: ${missingGroup.length}.`);
    if (needsEvaluation.length) issues.push(`Zápasy s výsledkem čekající na přepočet: ${needsEvaluation.length}.`);

    return {
      ready: issues.length === 0,
      issues,
      groupMatches: groupMatches.length,
      players: players.length,
      tips: tips.length,
      evaluatedTips,
      groupsCount,
      teamsCount,
      missingTime,
      missingTeams,
      missingGroup,
      needsEvaluation,
      nextMatch,
      seedStatus: hasSeedLikeData ? "Data vypadají importovaná / připravená" : "Import seedu zatím není zřejmý",
    };
  }, [matches, players, tips, evaluationRows]);

  const filteredEvaluationRows = useMemo(() => {
    if (evaluationFilter === "all") return evaluationRows;
    if (evaluationFilter === "needs_attention") return evaluationRows.filter((row) => row.state !== "ok");
    return evaluationRows.filter((row) => row.state === evaluationFilter);
  }, [evaluationRows, evaluationFilter]);

  const evaluationPageCount = Math.max(1, Math.ceil(filteredEvaluationRows.length / EVALUATION_PER_PAGE));
  const pagedEvaluationRows = filteredEvaluationRows.slice((evaluationPage - 1) * EVALUATION_PER_PAGE, evaluationPage * EVALUATION_PER_PAGE);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.name, u.login_name, u.email, u.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [users, userSearch]);

  const userPageCount = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
  const pagedUsers = filteredUsers.slice((userPage - 1) * USERS_PER_PAGE, userPage * USERS_PER_PAGE);

  const availableGroups = useMemo(() => {
    const set = new Set(matches.map((match) => match.group_name).filter(Boolean));
    return Array.from(set).sort();
  }, [matches]);

  const teamsByGroup = useMemo(() => {
    const groups = new Map();

    for (const match of matches) {
      const groupName = match.group_name || "Bez skupiny";
      if (!groups.has(groupName)) groups.set(groupName, new Set());
      if (match.home_team) groups.get(groupName).add(match.home_team);
      if (match.away_team) groups.get(groupName).add(match.away_team);
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => String(a).localeCompare(String(b), "cs"))
      .map(([group_name, set]) => ({
        group_name,
        teams: Array.from(set).sort((a, b) => a.localeCompare(b, "cs")),
      }));
  }, [matches]);

  const filteredMatches = useMemo(() => {
    const q = matchSearch.trim().toLowerCase();
    return matches.filter((match) => {
      const stageOk = matchStage === "all" || match.stage === matchStage;
      const groupOk = matchGroup === "all" || (match.group_name || "") === matchGroup;
      const textOk = !q || [match.home_team, match.away_team, match.stage, match.group_name, match.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
      return stageOk && groupOk && textOk;
    });
  }, [matches, matchSearch, matchStage, matchGroup]);

  const matchPageCount = Math.max(1, Math.ceil(filteredMatches.length / MATCHES_PER_PAGE));
  const pagedMatches = filteredMatches.slice((matchPage - 1) * MATCHES_PER_PAGE, matchPage * MATCHES_PER_PAGE);

  const playerTipStats = useMemo(() => {
    let missing = 0;
    let done = 0;
    let locked = 0;
    let evaluated = 0;

    for (const match of matches) {
      const tip = myTipsByMatch.get(Number(match.id));
      const state = playerTipState(match, tip, settings);
      if (state === "missing") missing++;
      if (state === "done") done++;
      if (state === "locked") locked++;
      if (state === "evaluated") evaluated++;
    }

    return { missing, done, locked, evaluated, total: matches.length };
  }, [matches, myTipsByMatch]);

  const filteredPlayerMatches = useMemo(() => {
    const q = playerTipSearch.trim().toLowerCase();

    return matches.filter((match) => {
      const tip = myTipsByMatch.get(Number(match.id));
      const state = playerTipState(match, tip, settings);
      const stageOk = playerTipStage === "all" || match.stage === playerTipStage;
      const groupOk = playerTipGroup === "all" || (match.group_name || "") === playerTipGroup;
      const stateOk = playerTipFilter === "all" || state === playerTipFilter;
      const textOk = !q || [match.home_team, match.away_team, match.stage, match.group_name, match.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));

      return stageOk && groupOk && stateOk && textOk;
    }).sort((a, b) => (getComparableMatchDate(a)?.getTime() || 0) - (getComparableMatchDate(b)?.getTime() || 0));
  }, [matches, myTipsByMatch, settings, playerTipSearch, playerTipFilter, playerTipStage, playerTipGroup]);

  const playerTipPageCount = Math.max(1, Math.ceil(filteredPlayerMatches.length / PLAYER_TIPS_PER_PAGE));
  const pagedPlayerMatches = filteredPlayerMatches.slice((playerTipPage - 1) * PLAYER_TIPS_PER_PAGE, playerTipPage * PLAYER_TIPS_PER_PAGE);

  const filteredLeaderboard = useMemo(() => {
    const q = leaderboardSearch.trim().toLowerCase();
    if (!q) return leaderboard;

    return leaderboard.filter((row) =>
      [row.name, row.login_name, row.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [leaderboard, leaderboardSearch]);

  const leaderboardPageCount = Math.max(1, Math.ceil(filteredLeaderboard.length / LEADERBOARD_PER_PAGE));
  const pagedLeaderboard = filteredLeaderboard.slice((leaderboardPage - 1) * LEADERBOARD_PER_PAGE, leaderboardPage * LEADERBOARD_PER_PAGE);

  function closeUserModal() {
    setUserModal(null);
  }

  function closeMatchModal() {
    setMatchModal(null);
  }

  function closeTipModal() {
    setTipModal(null);
  }

  function openUserModal(modal) {
    setMatchModal(null);
    setTipModal(null);
    setUserModal(modal);
  }

  function openMatchModal(modal) {
    setUserModal(null);
    setTipModal(null);
    setMatchModal(modal);
  }

  function openTipModal(modal) {
    setUserModal(null);
    setMatchModal(null);
    setTipModal(modal);
  }

  async function addUser(event) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    try {
      await apiFetch("/users", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          login_name: form.get("login_name"),
          email: form.get("email"),
          role: form.get("role"),
          pin: form.get("pin"),
          password: form.get("password"),
        }),
      });
      formEl?.reset?.();
      showToast("Uživatel uložen.");
      await loadAll();
    } catch (err) {
      showToast(err.message);
    }
  }

  async function saveUserProfile(event) {
    event.preventDefault();
    if (!userModal?.user) return;
    const form = new FormData(event.currentTarget);
    try {
      await apiFetch(`/users/${userModal.user.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: form.get("name"),
          login_name: form.get("login_name"),
          email: form.get("email"),
        }),
      });
      closeUserModal();
      showToast("Uživatel upraven.");
      await loadAll();
    } catch (err) {
      showToast(err.message);
    }
  }

  async function saveUserAccess(event) {
    event.preventDefault();
    if (!userModal?.user) return;
    const form = new FormData(event.currentTarget);
    try {
      await apiFetch(`/users/${userModal.user.id}/access`, {
        method: "PUT",
        body: JSON.stringify({
          pin: form.get("pin") || undefined,
          password: form.get("password") || undefined,
        }),
      });
      closeUserModal();
      showToast(userModal.user.role === "admin" ? "Heslo změněno." : "PIN změněn.");
      await loadAll();
    } catch (err) {
      showToast(err.message);
    }
  }

  async function toggleUserAccess(targetUser) {
    if (!targetUser) return;
    try {
      await apiFetch(`/users/${targetUser.id}/access`, {
        method: "PUT",
        body: JSON.stringify({ is_active: !targetUser.is_active }),
      });
      closeUserModal();
      showToast(targetUser.is_active ? "Uživatel deaktivován." : "Uživatel aktivován.");
      await loadAll();
    } catch (err) {
      showToast(err.message);
    }
  }

  async function deleteUser(targetUser) {
    if (!targetUser) return;
    try {
      await apiFetch(`/users/${targetUser.id}`, { method: "DELETE" });
      closeUserModal();
      showToast("Uživatel smazán.");
      await loadAll();
    } catch (err) {
      showToast(err.message);
    }
  }

  async function addMatch(event) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    try {
      await apiFetch("/matches", {
        method: "POST",
        body: JSON.stringify({
          stage: form.get("stage"),
          group_name: form.get("group_name"),
          home_team: form.get("home_team"),
          away_team: form.get("away_team"),
          start_time: form.get("start_time") || null,
        }),
      });
      formEl?.reset?.();
      showToast("Zápas uložen.");
      await loadAll();
    } catch (err) {
      showToast(err.message);
    }
  }

  async function saveMatchProfile(event) {
    event.preventDefault();
    if (!matchModal?.match) return;
    const form = new FormData(event.currentTarget);
    try {
      await apiFetch(`/matches/${matchModal.match.id}`, {
        method: "PUT",
        body: JSON.stringify({
          stage: form.get("stage"),
          group_name: form.get("group_name"),
          home_team: form.get("home_team"),
          away_team: form.get("away_team"),
          start_time: form.get("start_time") || null,
          status: form.get("status"),
        }),
      });
      closeMatchModal();
      showToast("Zápas upraven.");
      await loadAll();
    } catch (err) {
      showToast(err.message);
    }
  }

  async function saveResult(event, matchId = null) {
    event.preventDefault();
    const activeMatchId = matchId || matchModal?.match?.id;
    if (!activeMatchId) return;
    const form = new FormData(event.currentTarget);
    try {
      const result = await apiFetch(`/matches/${activeMatchId}/result`, {
        method: "PUT",
        body: JSON.stringify({ home_score: form.get("home_score"), away_score: form.get("away_score") }),
      });
      closeMatchModal();
      const evaluatedTips = result?.evaluation?.evaluated_tips ?? 0;
      showToast(`Výsledek uložen a vyhodnoceno tipů: ${evaluatedTips}.`);
      await loadAll();
    } catch (err) {
      showToast(err.message);
    }
  }

  async function deleteMatch(targetMatch) {
    if (!targetMatch) return;
    try {
      await apiFetch(`/matches/${targetMatch.id}`, { method: "DELETE" });
      closeMatchModal();
      showToast("Zápas smazán.");
      await loadAll();
    } catch (err) {
      showToast(err.message);
    }
  }

  async function saveTip(event, forcedMatchId = null) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const matchId = Number(forcedMatchId || form.get("match_id"));
    const selectedMatch = matches.find((item) => Number(item.id) === matchId);

    if (user?.role !== "admin" && selectedMatch && matchLocked(selectedMatch, settings)) {
      showToast(getPlayerLockNotice(selectedMatch, settings));
      await loadAll();
      return;
    }

    try {
      await apiFetch("/tips", {
        method: "POST",
        body: JSON.stringify({
          user_id: form.get("user_id"),
          match_id: matchId || form.get("match_id"),
          home_tip: form.get("home_tip"),
          away_tip: form.get("away_tip"),
        }),
      });
      showToast("Tip uložen.");
      if (!forcedMatchId) formEl?.reset?.();
      await loadAll();
    } catch (err) {
      showToast(err.message);
    }
  }

  async function saveAdminTip(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await apiFetch("/tips", {
        method: "POST",
        body: JSON.stringify({
          user_id: form.get("user_id"),
          match_id: form.get("match_id"),
          home_tip: form.get("home_tip"),
          away_tip: form.get("away_tip"),
        }),
      });
      const matchId = Number(form.get("match_id"));
      const match = matches.find((item) => Number(item.id) === matchId);
      if (isMatchFinished(match)) {
        const result = await apiFetch(`/evaluate/matches/${matchId}`, { method: "POST", body: JSON.stringify({}) });
        showToast(`Tip upraven a zápas přepočítán. Vyhodnoceno tipů: ${result.evaluated_tips ?? 0}.`);
      } else {
        showToast("Tip upraven.");
      }
      closeTipModal();
      await loadAll();
    } catch (err) {
      showToast(err.message);
    }
  }

  async function deleteTip(tip) {
    if (!tip?.id) return;
    try {
      await apiFetch(`/tips/${tip.id}`, { method: "DELETE" });
      closeTipModal();
      showToast("Tip smazán.");
      await loadAll();
    } catch (err) {
      showToast(err.message);
    }
  }

  async function bulkDeleteTips(ids) {
    const cleanIds = Array.isArray(ids) ? ids.filter(Boolean) : [];
    if (!cleanIds.length) return;
    try {
      const result = await apiFetch("/tips/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids: cleanIds }),
      });
      closeTipModal();
      showToast(`Smazáno tipů: ${result.deletedCount ?? cleanIds.length}.`);
      await loadAll();
    } catch (err) {
      showToast(err.message);
    }
  }

  async function evaluateTips() {
    try {
      const result = await apiFetch("/evaluate", { method: "POST", body: JSON.stringify({}) });
      showToast(`Vyhodnoceno: ${result.evaluated_tips ?? result.evaluatedCount ?? 0} tipů v ${result.evaluated_matches ?? 0} zápasech.`);
      await loadAll();
    } catch (err) {
      showToast(err.message);
    }
  }

  async function evaluateOneMatch(matchId) {
    try {
      const result = await apiFetch(`/evaluate/matches/${matchId}`, { method: "POST", body: JSON.stringify({}) });
      showToast(`Zápas přepočítán. Vyhodnoceno tipů: ${result.evaluated_tips ?? 0}.`);
      await loadAll();
    } catch (err) {
      showToast(err.message);
    }
  }

  async function saveSettings(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await apiFetch("/settings/scoring", {
        method: "PUT",
        body: JSON.stringify({
          exact_score_points: form.get("exact_score_points"),
          correct_result_points: form.get("correct_result_points"),
          wrong_tip_points: form.get("wrong_tip_points"),
          rules_text: form.get("rules_text"),
          tip_lock_mode: form.get("tip_lock_mode"),
          tip_lock_at: form.get("tip_lock_at") || null,
        }),
      });
      showToast("Pravidla uložena.");
      await loadAll();
    } catch (err) {
      showToast(err.message);
    }
  }

  if (!user) {
    if (publicMode) return <PublicLanding onBack={() => setPublicMode(false)} />;
    return <LoginScreen onLogin={afterLogin} onOpenPublic={() => setPublicMode(true)} />;
  }

  const tabs = user.role === "admin" ? adminTabs : playerTabs;
  const serviceTabIds = new Set(["sync", "evaluation", "prelaunch"]);
  const primaryTabs = user.role === "admin" ? tabs.filter((tab) => !serviceTabIds.has(tab.id)) : tabs;
  const serviceTabs = user.role === "admin" ? tabs.filter((tab) => serviceTabIds.has(tab.id)) : [];
  const serviceActive = serviceTabs.some((tab) => tab.id === activeTab);
  const serviceTabIcon = (tabId) => ({
    evaluation: "✓",
    prelaunch: "🚦",
    sync: "↻",
  }[tabId] || "•");

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-bg-cup" aria-hidden="true">🏆</div>
        <div className="hero-content">
          <p className="eyebrow">MS ve fotbale 2026 · Tipovací liga</p>
          <h1>Tipovačka</h1>
          <p className="hero-text">Přihlášen: <strong>{user.name}</strong> · {user.role === "admin" ? "správce soutěže" : "tipovač"}</p>
          <div className="hero-pills">
            <span>⚽ 3 body přesný výsledek</span>
            <span>🏆 1 bod vítěz/remíza</span>
            <span>{lockInfo.pill}</span>
          </div>
        </div>
        <div className="hero-side">
          <button className="btn btn-light" onClick={() => loadAll()} disabled={loading}>{loading ? "Načítám..." : "Obnovit data"}</button>
          <button className="btn btn-ghost" onClick={logout}>Odhlásit</button>
        </div>
      </header>

      <nav className="tabs">
        {primaryTabs.map((tab) => (
          <button key={tab.id} className={activeTab === tab.id ? "active" : ""} onClick={() => { setActiveTab(tab.id); setServiceMenuOpen(false); }}>
            {tab.label}
          </button>
        ))}
        {serviceTabs.length > 0 && (
          <div className="service-tabs-wrap">
            <button
              type="button"
              className={serviceActive ? "active service-menu-trigger" : "service-menu-trigger"}
              onClick={() => setServiceMenuOpen((open) => !open)}
              aria-expanded={serviceMenuOpen}
              aria-haspopup="menu"
              title="Servisní nástroje"
            >
              <span aria-hidden="true">⚙️</span>
              <span>Správa</span>
            </button>
            {serviceMenuOpen && (
              <div className="service-tabs-dropdown" role="menu">
                {serviceTabs.map((tab) => (
                  <button key={tab.id} type="button" className={activeTab === tab.id ? "active" : ""} onClick={() => { setActiveTab(tab.id); setServiceMenuOpen(false); }}>
                    <span className="service-tab-icon" aria-hidden="true">{serviceTabIcon(tab.id)}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

      {toast && <div className="toast">{toast}</div>}

      <main>
        {activeTab === "dashboard" && (
          <section className="dashboard-layout">
            <section className="grid cards-4">
              {user.role === "admin" ? (
                <>
                  <StatCard label="Tipovači" value={stats.players} accent="blue" />
                  <StatCard label="Zápasy" value={stats.matches} accent="green" />
                  <StatCard label="Zadané tipy" value={stats.tips} accent="red" />
                  <StatCard label="Aktuálně vede" value={stats.leader} accent="gold" />
                </>
              ) : (
                <>
                  <StatCard label="Chybí natipovat" value={playerTipStats.missing} accent="red" />
                  <StatCard label="Natipováno" value={playerTipStats.done} accent="green" />
                  <StatCard label="Zamčeno" value={playerTipStats.locked} accent="blue" />
                  <StatCard label="Aktuálně vede" value={stats.leader} accent="gold" />
                </>
              )}
            </section>
<section className="card dashboard-today-card">
              <div className="section-head dashboard-section-head">
                <div>
                  <h2>Dnešní zápasy / výsledky</h2>
                  <p className="muted">{user.role === "admin" ? "Rychlý přehled zápasů naplánovaných na dnešek." : "Stejná data jako v administraci – zápasy, výsledky a tvoje dostupné tipování."}</p>
                </div>
                <button className="btn btn-soft" type="button" onClick={() => loadAll()} disabled={loading}>
                  {loading ? "Načítám..." : "Obnovit"}
                </button>
              </div>

              <div className="dashboard-match-list">
                {todayMatches.map((match) => (
                  <div key={match.id} className={`dashboard-match-row ${isMatchFinished(match) ? "is-finished" : ""}`}>
                    <div className="dashboard-match-time">
                      <strong>{formatMatchTime(getMatchStartValue(match))}</strong>
                      <span>{stageLabel(match.stage)}{match.group_name ? ` · sk. ${match.group_name}` : ""}</span>
                    </div>
                    <div className="dashboard-match-teams">
                      <MatchTeams match={match} />
                      <small>{match.tipped_players_count ?? 0} tipů / {players.length || 0} tipovačů</small>
                    </div>
                    <div className="dashboard-match-result">
                      <strong>{scoreText(match)}</strong>
                      <span className={`status-pill match-${match.status || "scheduled"}`}>{statusLabel(match)}</span>
                    </div>
                  </div>
                ))}
                {!todayMatches.length && (
                  <div className="empty-line">
                    Na dnešek není v systému zadaný žádný zápas. Pokud byl zápas právě vytvořen, klikni na Obnovit a zkontroluj datum/čas.
                  </div>
                )}
              </div>

              {!!upcomingMatches.length && (
                <div className="dashboard-upcoming">
                  <h3>Nejbližší další zápasy</h3>
                  <div className="dashboard-match-list dashboard-match-list-compact">
                    {upcomingMatches.map((match) => (
                      <div key={match.id} className="dashboard-match-row">
                        <div className="dashboard-match-time">
                          <strong>{getDateKey(getMatchStartValue(match)).split("-").reverse().join(". ")}</strong>
                          <span>{formatMatchTime(getMatchStartValue(match))}</span>
                        </div>
                        <div className="dashboard-match-teams">
                          <MatchTeams match={match} />
                          <small>{stageLabel(match.stage)}{match.group_name ? ` · sk. ${match.group_name}` : ""}</small>
                        </div>
                        <div className="dashboard-match-result">
                          <span className={`status-pill match-${match.status || "scheduled"}`}>{statusLabel(match)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="card dashboard-standings-card">
              <div className="section-head">
                <div>
                  <h2>Tabulky skupin</h2>
                  <p className="muted">Počítají se automaticky z uložených výsledků skupinových zápasů.</p>
                </div>
                <button className="btn btn-soft" type="button" onClick={() => setActiveTab("standings")}>Zobrazit všechny</button>
              </div>

              <div className="standings-preview-grid">
                {standings.slice(0, 4).map((group) => (
                  <div key={group.group_name} className="standings-mini-card">
                    <h3>Skupina {group.group_name}</h3>
                    <div className="standings-mini-list">
                      {group.teams.slice(0, 4).map((team) => (
                        <div key={team.team} className="standings-mini-row">
                          <span>{team.position}. <TeamBadge name={team.team} compact /></span>
                          <strong>{team.points} b.</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {!standings.length && <div className="empty-line full">Zatím nejsou k dispozici žádné tabulky. Stačí uložit výsledek skupinového zápasu.</div>}
              </div>
            </section>

            <section className="card dashboard-results-card">
              <div className="section-head">
                <div>
                  <h2>Poslední výsledky</h2>
                  <p className="muted">Posledních šest zápasů s uloženým výsledkem.</p>
                </div>
              </div>

              <div className="table-wrap dashboard-results-table-wrap">
                <table className="dashboard-results-table">
                  <thead><tr><th>Zápas</th><th>Fáze</th><th>Datum</th><th>Výsledek</th></tr></thead>
                  <tbody>
                    {latestResults.map((match) => (
                      <tr key={match.id}>
                        <td><MatchTeams match={match} compact /></td>
                        <td>{stageLabel(match.stage)}{match.group_name ? ` / sk. ${match.group_name}` : ""}</td>
                        <td>{formatDate(getMatchStartValue(match))}</td>
                        <td><strong>{scoreText(match)}</strong></td>
                      </tr>
                    ))}
                    {!latestResults.length && <tr><td colSpan="4"><div className="empty-line">Zatím není uložený žádný výsledek.</div></td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        )}

        {activeTab === "playerTips" && user.role === "player" && (
          <section className="player-tips-layout">
            <div className="grid player-tip-stats">
              <StatCard label="Chybí natipovat" value={playerTipStats.missing} accent="red" />
              <StatCard label="Natipováno" value={playerTipStats.done} accent="green" />
              <StatCard label="Zamčeno" value={playerTipStats.locked} accent="blue" />
              <StatCard label="Vyhodnoceno" value={playerTipStats.evaluated} accent="gold" />
            </div>

            <section className="card">
              <div className="section-head player-tips-head">
                <div>
                  <h2>Moje tipy</h2>
                  <p className="muted">Tip můžeš měnit jen do začátku zápasu. Nenatipované zápasy si můžeš rychle vyfiltrovat.</p>
                </div>
                <div className="tip-progress">
                  <strong>{playerTipStats.total - playerTipStats.missing}</strong> / {playerTipStats.total}
                  <span>hotovo</span>
                </div>
              </div>

              <div className="filter-grid player-filter-grid">
                <label>Vyhledat
                  <input value={playerTipSearch} onChange={(e) => setPlayerTipSearch(e.target.value)} placeholder="tým, skupina, fáze…" />
                </label>
                <label>Stav tipu
                  <select value={playerTipFilter} onChange={(e) => setPlayerTipFilter(e.target.value)}>
                    <option value="all">Všechny zápasy</option>
                    <option value="missing">Chybí tip</option>
                    <option value="done">Natipováno</option>
                    <option value="locked">Zamčeno</option>
                    <option value="evaluated">Vyhodnoceno</option>
                  </select>
                </label>
                <label>Fáze
                  <select value={playerTipStage} onChange={(e) => setPlayerTipStage(e.target.value)}>
                    <option value="all">Všechny fáze</option>
                    {STAGE_OPTIONS.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
                  </select>
                </label>
                <label>Skupina
                  <select value={playerTipGroup} onChange={(e) => setPlayerTipGroup(e.target.value)}>
                    <option value="all">Všechny skupiny</option>
                    {availableGroups.map((group) => <option key={group} value={group}>Skupina {group}</option>)}
                  </select>
                </label>
              </div>

              <div className="match-tip-list">
                {pagedPlayerMatches.map((match) => {
                  const tip = myTipsByMatch.get(Number(match.id));
                  const locked = matchLocked(match, settings);
                  const state = playerTipState(match, tip, settings);
                  const pointsInfo = getTipPointsInfo(match, tip, settings);
                  return (
                    <form key={match.id} className={`player-tip-row state-${state} ${locked ? "is-locked" : ""}`} onSubmit={(e) => saveTip(e, match.id)}>
                      <div className="player-match-main">
                        <span className={`status-pill tip-${state}`}>{state === "locked" ? getPlayerLockShortLabel(match, settings) : playerTipStateLabel(state)}</span>
                        <MatchTeams match={match} compact />
                        <span>{formatDate(getMatchStartValue(match))} · {stageLabel(match.stage)}{match.group_name ? ` / skupina ${match.group_name}` : ""}</span>
                        {locked && <span className="player-lock-note">{getPlayerLockNotice(match, settings)}</span>}
                      </div>
                      <div className="inline-score player-score">
                        <input name="home_tip" type="number" min="0" defaultValue={tip?.home_tip ?? ""} disabled={locked} required />
                        <span>:</span>
                        <input name="away_tip" type="number" min="0" defaultValue={tip?.away_tip ?? ""} disabled={locked} required />
                        <button className="btn btn-small" type="submit" disabled={locked}>{locked ? "Zamčeno" : tip ? "Upravit" : "Uložit"}</button>
                      </div>
                      <div className="tip-meta">
                        {tip ? (
                          <>
                            <div>Tip: <strong>{tip.home_tip}:{tip.away_tip}</strong></div>
                            <div>{isMatchFinished(match) ? <>Výsledek: <strong>{scoreText(match)}</strong></> : "Výsledek: čeká se"}</div>
                            <div className={`tip-points-badge points-${pointsInfo.tone}`}>
                              <span>{pointsInfo.label}</span>
                              <small>{pointsInfo.detail}</small>
                            </div>
                          </>
                        ) : (
                          <div className="tip-points-badge points-empty">
                            <span>Bez tipu</span>
                            <small>Zatím nenatipováno</small>
                          </div>
                        )}
                      </div>
                    </form>
                  );
                })}
                {!pagedPlayerMatches.length && <div className="empty-line">Žádný zápas neodpovídá filtru.</div>}
              </div>

              <div className="pagination-bar">
                <span>Zobrazeno {pagedPlayerMatches.length} z {filteredPlayerMatches.length}</span>
                <div className="pagination-buttons">
                  <button className="btn-mini" disabled={playerTipPage <= 1} onClick={() => setPlayerTipPage((p) => Math.max(1, p - 1))}>Předchozí</button>
                  <strong>{playerTipPage} / {playerTipPageCount}</strong>
                  <button className="btn-mini" disabled={playerTipPage >= playerTipPageCount} onClick={() => setPlayerTipPage((p) => Math.min(playerTipPageCount, p + 1))}>Další</button>
                </div>
              </div>
            </section>
          </section>
        )}


        {activeTab === "prelaunch" && user.role === "admin" && (
          <section className="prelaunch-layout">
            <div className="grid cards-4">
              <StatCard label="Zápasy" value={matches.length} accent="green" />
              <StatCard label="Skupinové zápasy" value={prelaunchCheck.groupMatches} accent="blue" />
              <StatCard label="Tipovači" value={prelaunchCheck.players} accent="gold" />
              <StatCard label="Tipy" value={prelaunchCheck.tips} accent="red" />
            </div>

            <section className={`card wide-card prelaunch-card ${prelaunchCheck.ready ? "is-ready" : "needs-check"}`}>
              <div className="section-head matches-head">
                <div>
                  <p className="eyebrow dark">Předstartovní kontrola</p>
                  <h2>{prelaunchCheck.ready ? "Připraveno ke spuštění" : "Ještě zkontrolovat"}</h2>
                  <p className="muted">Rychlá kontrola dat, tipovačů, uzávěrek a vyhodnocení před ostrým provozem.</p>
                </div>
                <div className={`prelaunch-status ${prelaunchCheck.ready ? "ok" : "warn"}`}>
                  {prelaunchCheck.ready ? "✅ OK" : "⚠️ Kontrola"}
                </div>
              </div>

              <div className="prelaunch-summary-grid">
                <div><span>Skupiny</span><strong>{prelaunchCheck.groupsCount}</strong></div>
                <div><span>Týmy</span><strong>{prelaunchCheck.teamsCount}</strong></div>
                <div><span>Vyhodnocené tipy</span><strong>{prelaunchCheck.evaluatedTips}</strong></div>
                <div><span>Import</span><strong>{prelaunchCheck.seedStatus}</strong></div>
                <div><span>Nejbližší zápas</span><strong>{prelaunchCheck.nextMatch ? formatDate(getMatchStartValue(prelaunchCheck.nextMatch)) : "nenalezen"}</strong></div>
                <div><span>Uzavírání</span><strong>{lockInfo.short}</strong></div>
              </div>

              <div className="prelaunch-check-list">
                {prelaunchCheck.ready ? (
                  <div className="check-row ok"><strong>✅ Všechny základní kontroly prošly.</strong><span>Aplikaci můžeš projít na testovacím tipovači a připravit na spuštění.</span></div>
                ) : (
                  prelaunchCheck.issues.map((issue) => <div key={issue} className="check-row warn"><strong>⚠️ {issue}</strong><span>Doporučení: oprav v administraci nebo spusť příslušný import/přepočet.</span></div>)
                )}
              </div>

              <div className="prelaunch-actions">
                <button className="btn btn-soft" type="button" onClick={() => loadAll()} disabled={loading}>{loading ? "Načítám..." : "Obnovit data"}</button>
                <button className="btn btn-secondary" type="button" onClick={evaluateTips}>Přepočítat vše dohrané</button>
                <button className="btn" type="button" onClick={() => setActiveTab("sync")}>Přejít na synchronizaci</button>
              </div>
            </section>

            <section className="card wide-card prelaunch-detail-card">
              <h2>Detail kontrol</h2>
              <div className="prelaunch-detail-grid">
                <div><strong>Zápasy bez data/času</strong><span>{prelaunchCheck.missingTime.length}</span></div>
                <div><strong>Zápasy bez týmů</strong><span>{prelaunchCheck.missingTeams.length}</span></div>
                <div><strong>Skupinové zápasy bez skupiny</strong><span>{prelaunchCheck.missingGroup.length}</span></div>
                <div><strong>Výsledky čekající na přepočet</strong><span>{prelaunchCheck.needsEvaluation.length}</span></div>
              </div>
            </section>
          </section>
        )}

        {activeTab === "evaluation" && user.role === "admin" && (
          <section className="evaluation-layout">
            <div className="grid cards-4">
              <StatCard label="Bez výsledku" value={evaluationStats.missingResult} accent="blue" />
              <StatCard label="K přepočtu" value={evaluationStats.needsEvaluation} accent="red" />
              <StatCard label="OK" value={evaluationStats.ok} accent="green" />
              <StatCard label="Rozdáno bodů" value={evaluationStats.points} accent="gold" />
            </div>

            <section className="card wide-card evaluation-card">
              <div className="section-head matches-head">
                <div>
                  <h2>Kontrola vyhodnocení</h2>
                  <p className="muted">Rychlá kontrola zápasů, výsledků, vyhodnocených tipů a rozdaných bodů.</p>
                </div>
                <button className="btn btn-secondary" onClick={evaluateTips}>Přepočítat vše dohrané</button>
              </div>

              <div className="filter-grid evaluation-filter-grid">
                <label>Stav
                  <select value={evaluationFilter} onChange={(e) => setEvaluationFilter(e.target.value)}>
                    <option value="needs_attention">Jen ke kontrole</option>
                    <option value="needs_evaluation">Vyžaduje přepočet</option>
                    <option value="missing_result">Čeká na výsledek</option>
                    <option value="ok">OK</option>
                    <option value="all">Všechny zápasy</option>
                  </select>
                </label>
              </div>

              <div className="table-wrap matches-table-wrap">
                <table className="matches-table evaluation-table">
                  <thead>
                    <tr><th>Zápas</th><th>Fáze</th><th>Výsledek</th><th>Stav</th><th>Tipy</th><th>Body</th><th>Akce</th></tr>
                  </thead>
                  <tbody>
                    {pagedEvaluationRows.map(({ match, state, tipsCount, evaluatedTips, pointsSum }) => (
                      <tr key={match.id} className={state === "ok" ? "is-muted-row" : ""}>
                        <td>
                          <MatchTeams match={match} compact />
                          <span className="subline">{formatDate(getMatchStartValue(match))}</span>
                        </td>
                        <td>{stageLabel(match.stage)}{match.group_name ? <span className="subline">Skupina {match.group_name}</span> : null}</td>
                        <td><strong>{scoreText(match)}</strong></td>
                        <td><span className={`status-pill evaluation-${state}`}>{evaluationStateLabel(state)}</span></td>
                        <td>{evaluatedTips} / {tipsCount}</td>
                        <td><strong>{pointsSum}</strong></td>
                        <td>
                          <div className="row-actions">
                            <button className="btn-mini" type="button" onClick={() => openMatchModal({ type: "result", match })}>Výsledek</button>
                            <button className="btn-mini" type="button" disabled={!matchHasSavedResult(match)} onClick={() => evaluateOneMatch(match.id)}>Přepočítat</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!pagedEvaluationRows.length && <tr><td colSpan="7"><div className="empty-line">V tomto filtru není žádný zápas.</div></td></tr>}
                  </tbody>
                </table>
              </div>

              <div className="pagination-bar">
                <span>Zobrazeno {pagedEvaluationRows.length} z {filteredEvaluationRows.length}</span>
                <div className="pagination-buttons">
                  <button className="btn-mini" disabled={evaluationPage <= 1} onClick={() => setEvaluationPage((p) => Math.max(1, p - 1))}>Předchozí</button>
                  <strong>{evaluationPage} / {evaluationPageCount}</strong>
                  <button className="btn-mini" disabled={evaluationPage >= evaluationPageCount} onClick={() => setEvaluationPage((p) => Math.min(evaluationPageCount, p + 1))}>Další</button>
                </div>
              </div>
            </section>
          </section>
        )}

        {activeTab === "sync" && user.role === "admin" && (
          <SyncPage onRefresh={() => loadAll()} showToast={showToast} />
        )}

        {activeTab === "matches" && user.role === "admin" && (
          <section className="matches-layout">
            <div className="card compact-card">
              <h2>Přidat zápas</h2>
              <form onSubmit={addMatch} className="form-grid compact-form">
                <label>Fáze
                  <select name="stage" defaultValue="group">
                    {STAGE_OPTIONS.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
                  </select>
                </label>
                <label>Skupina
                  <select name="group_name" defaultValue="">
                    <option value="">Bez skupiny</option>
                    {"ABCDEFGHIJKL".split("").map((group) => <option key={group} value={group}>{group}</option>)}
                  </select>
                </label>
                <label>Domácí tým<input name="home_team" required /></label>
                <label>Hostující tým<input name="away_team" required /></label>
                <label>Začátek<input name="start_time" type="datetime-local" /></label>
                <button className="btn" type="submit">Uložit zápas</button>
              </form>
            </div>

            <div className="card wide-card">
              <div className="section-head matches-head">
                <div>
                  <h2>Správa zápasů</h2>
                  <p className="muted">Filtry, editace, zadání výsledku a mazání jsou řešené bez alertů přes modaly.</p>
                </div>
                <button className="btn btn-secondary" onClick={evaluateTips}>Vyhodnotit tipy</button>
              </div>

              <div className="filter-grid">
                <label>Vyhledat
                  <input value={matchSearch} onChange={(e) => setMatchSearch(e.target.value)} placeholder="tým, fáze, skupina…" />
                </label>
                <label>Fáze
                  <select value={matchStage} onChange={(e) => setMatchStage(e.target.value)}>
                    <option value="all">Všechny fáze</option>
                    {STAGE_OPTIONS.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
                  </select>
                </label>
                <label>Skupina
                  <select value={matchGroup} onChange={(e) => setMatchGroup(e.target.value)}>
                    <option value="all">Všechny skupiny</option>
                    {availableGroups.map((group) => <option key={group} value={group}>{group}</option>)}
                  </select>
                </label>
              </div>

              <div className="table-wrap matches-table-wrap">
                <table className="matches-table">
                  <thead>
                    <tr><th>Fáze</th><th>Zápas</th><th>Začátek</th><th>Výsledek</th><th>Stav</th><th>Tipů</th><th>Akce</th></tr>
                  </thead>
                  <tbody>
                    {pagedMatches.map((match) => (
                      <tr key={match.id} className={match.status === "evaluated" ? "is-muted-row" : ""}>
                        <td>
                          <strong>{stageLabel(match.stage)}</strong>
                          {match.group_name && <span className="subline">Skupina {match.group_name}</span>}
                        </td>
                        <td><MatchTeams match={match} compact /></td>
                        <td>{formatDate(getMatchStartValue(match))}</td>
                        <td><strong>{match.home_score ?? "-"} : {match.away_score ?? "-"}</strong></td>
                        <td><span className={`status-pill match-${match.status}`}>{statusLabel(match)}</span></td>
                        <td>{match.tips_count ?? 0}</td>
                        <td>
                          <div className="row-actions">
                            <button className="btn-mini" type="button" onClick={() => openMatchModal({ type: "edit", match })}>Upravit</button>
                            <button className="btn-mini" type="button" onClick={() => openMatchModal({ type: "result", match })}>Výsledek</button>
                            <button className="btn-mini danger" type="button" onClick={() => openMatchModal({ type: "delete", match })}>Smazat</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!pagedMatches.length && <tr><td colSpan="7"><div className="empty-line">Žádný zápas neodpovídá filtru.</div></td></tr>}
                  </tbody>
                </table>
              </div>

              <div className="pagination-bar">
                <span>Zobrazeno {pagedMatches.length} z {filteredMatches.length}</span>
                <div className="pagination-buttons">
                  <button className="btn-mini" disabled={matchPage <= 1} onClick={() => setMatchPage((p) => Math.max(1, p - 1))}>Předchozí</button>
                  <strong>{matchPage} / {matchPageCount}</strong>
                  <button className="btn-mini" disabled={matchPage >= matchPageCount} onClick={() => setMatchPage((p) => Math.min(matchPageCount, p + 1))}>Další</button>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === "tips" && user.role === "admin" && (
          <section className="layout-2">
            <div className="card">
              <h2>Zadat tip za tipovače</h2>
              <form onSubmit={saveTip} className="form-grid">
                <label>Tipovač<select name="user_id" required><option value="">Vybrat tipovače</option>{players.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
                <label>Zápas<select name="match_id" required><option value="">Vybrat zápas</option>{matches.map((m) => <option key={m.id} value={m.id}>{m.home_team} – {m.away_team}</option>)}</select></label>
                <label>Domácí tip<input name="home_tip" type="number" min="0" required /></label>
                <label>Hosté tip<input name="away_tip" type="number" min="0" required /></label>
                <button className="btn" type="submit">Uložit tip</button>
              </form>
            </div>

            <TipsTable
              tips={tips}
              onEdit={(tip) => openTipModal({ type: "edit", tip })}
              onDelete={(tip) => openTipModal({ type: "delete", tip })}
              onBulkDelete={(ids) => openTipModal({ type: "bulkDelete", ids })}
            />
          </section>
        )}

        {activeTab === "users" && user.role === "admin" && (
          <section className="layout-2 users-layout">
            <div className="card compact-card">
              <h2>Přidat uživatele</h2>
              <form onSubmit={addUser} className="form-grid compact-form">
                <label>Jméno<input name="name" required /></label>
                <label>Login<input name="login_name" placeholder="např. petr" required /></label>
                <label>Email<input name="email" type="email" /></label>
                <label>Role<select name="role" defaultValue="player"><option value="player">Tipovač</option><option value="admin">Admin</option></select></label>
                <label>PIN pro tipovače<input name="pin" placeholder="např. 1234" /></label>
                <label>Heslo pro admina<input name="password" type="password" /></label>
                <button className="btn" type="submit">Uložit uživatele</button>
              </form>
            </div>

            <div className="card wide-card">
              <div className="section-head users-head">
                <div>
                  <h2>Správa tipovačů</h2>
                  <p className="muted">Editace, PINy, aktivace a mazání jsou v modalech. Vždy je otevřený jen jeden modal.</p>
                </div>
                <label className="search-field">Vyhledat
                  <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="jméno, login, e-mail…" />
                </label>
              </div>
              <div className="table-wrap users-table-wrap">
                <table className="users-table">
                  <thead><tr><th>Uživatel</th><th>Role</th><th>Stav</th><th>Tipy</th><th>Body</th><th>Akce</th></tr></thead>
                  <tbody>
                    {pagedUsers.map((u) => (
                      <tr key={u.id} className={!u.is_active ? "is-muted-row" : ""}>
                        <td>
                          <strong>{u.name}</strong>
                          <span className="subline">{u.login_name || "bez loginu"}{u.email ? ` · ${u.email}` : ""}</span>
                        </td>
                        <td><span className="mini-badge">{u.role === "admin" ? "Admin" : "Tipovač"}</span></td>
                        <td>{u.is_active ? <span className="status-pill ok">Aktivní</span> : <span className="status-pill off">Vypnuto</span>}</td>
                        <td>{u.tips_count ?? 0}</td>
                        <td><strong>{u.points ?? 0}</strong></td>
                        <td>
                          <div className="row-actions">
                            <button className="btn-mini" type="button" onClick={() => openUserModal({ type: "edit", user: u })}>Upravit</button>
                            <button className="btn-mini" type="button" onClick={() => openUserModal({ type: "access", user: u })}>{u.role === "admin" ? "Heslo" : "PIN"}</button>
                            <button className="btn-mini" type="button" onClick={() => openUserModal({ type: "toggle", user: u })}>{u.is_active ? "Deaktivovat" : "Aktivovat"}</button>
                            <button className="btn-mini danger" type="button" onClick={() => openUserModal({ type: "delete", user: u })}>Smazat</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!pagedUsers.length && <tr><td colSpan="6"><div className="empty-line">Žádný uživatel neodpovídá filtru.</div></td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="pagination-bar">
                <span>Zobrazeno {pagedUsers.length} z {filteredUsers.length}</span>
                <div className="pagination-buttons">
                  <button className="btn-mini" disabled={userPage <= 1} onClick={() => setUserPage((p) => Math.max(1, p - 1))}>Předchozí</button>
                  <strong>{userPage} / {userPageCount}</strong>
                  <button className="btn-mini" disabled={userPage >= userPageCount} onClick={() => setUserPage((p) => Math.min(userPageCount, p + 1))}>Další</button>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === "leaderboard" && (
          <section className="card">
            <div className="section-head leaderboard-head">
              <div>
                <h2>Žebříček</h2>
                <p className="muted">Vyhledávání funguje podle jména, loginu nebo e-mailu.</p>
              </div>
              <label className="search-field">Vyhledat
                <input value={leaderboardSearch} onChange={(e) => setLeaderboardSearch(e.target.value)} placeholder="jméno tipovače…" />
              </label>
            </div>
            <div className="table-wrap">
              <table className="leaderboard-table">
                <thead><tr><th>#</th><th>Tipovač</th><th>Body</th><th>Přesné tipy</th><th>Správný vítěz/remíza</th><th>Tipů celkem</th></tr></thead>
                <tbody>
                  {pagedLeaderboard.map((row) => {
                    const originalIndex = leaderboard.findIndex((item) => Number(item.id) === Number(row.id));
                    return (
                      <tr key={row.id}>
                        <td>{originalIndex + 1}</td>
                        <td>
                          <strong>{row.name}</strong>
                          {(row.login_name || row.email) && <span className="subline">{row.login_name || ""}{row.email ? ` · ${row.email}` : ""}</span>}
                        </td>
                        <td><strong>{row.points}</strong></td>
                        <td>{row.exact_count || 0}</td>
                        <td>{row.result_count || row.correct_result_count || 0}</td>
                        <td>{row.tips_count || 0}</td>
                      </tr>
                    );
                  })}
                  {!pagedLeaderboard.length && <tr><td colSpan="6"><div className="empty-line">Žádný tipovač neodpovídá hledání.</div></td></tr>}
                </tbody>
              </table>
            </div>
            <div className="pagination-bar">
              <span>Zobrazeno {pagedLeaderboard.length} z {filteredLeaderboard.length}</span>
              <div className="pagination-buttons">
                <button className="btn-mini" disabled={leaderboardPage <= 1} onClick={() => setLeaderboardPage((p) => Math.max(1, p - 1))}>Předchozí</button>
                <strong>{leaderboardPage} / {leaderboardPageCount}</strong>
                <button className="btn-mini" disabled={leaderboardPage >= leaderboardPageCount} onClick={() => setLeaderboardPage((p) => Math.min(leaderboardPageCount, p + 1))}>Další</button>
              </div>
            </div>
          </section>
        )}

        {activeTab === "teams" && (
          <section className="teams-layout">
            <section className="card wide-card">
              <div className="section-head">
                <div>
                  <h2>Týmy a skupiny</h2>
                  <p className="muted">Přehled týmů vychází z importovaných zápasů. Vlajky a zkratky jsou zatím čistě prezentační vrstva bez zásahu do databáze.</p>
                </div>
                <button className="btn btn-soft" type="button" onClick={() => loadAll()} disabled={loading}>{loading ? "Načítám..." : "Obnovit"}</button>
              </div>

              <div className="teams-grid">
                {teamsByGroup.map((group) => (
                  <div key={group.group_name} className="team-group-card">
                    <div className="team-group-head">
                      <span>Skupina</span>
                      <strong>{group.group_name}</strong>
                    </div>
                    <div className="team-group-list">
                      {group.teams.map((team) => <TeamBadge key={team} name={team} />)}
                    </div>
                  </div>
                ))}
                {!teamsByGroup.length && <div className="empty-line full">Zatím nejsou v aplikaci žádné týmy. Nejdřív importuj nebo přidej zápasy.</div>}
              </div>
            </section>
          </section>
        )}

        {activeTab === "standings" && (
          <section className="card standings-page-card">
            <div className="section-head standings-page-head">
              <div>
                <h2>Tabulky skupin</h2>
                <p className="muted">Tabulky se počítají z výsledků zápasů ve fázi „Skupiny“. Ruční změna výsledku se projeví po obnovení dat.</p>
              </div>
              <button className="btn btn-soft" type="button" onClick={() => loadAll()} disabled={loading}>{loading ? "Načítám..." : "Obnovit"}</button>
            </div>

            <div className="standings-grid">
              {standings.map((group) => (
                <section key={group.group_name} className="standings-card">
                  <div className="standings-card-head">
                    <div>
                      <p className="eyebrow dark">Skupina</p>
                      <h3>{group.group_name}</h3>
                    </div>
                    <span>{group.played_matches} odehraných zápasů</span>
                  </div>
                  <div className="table-wrap standings-table-wrap">
                    <table className="standings-table">
                      <thead>
                        <tr><th>#</th><th>Tým</th><th>Z</th><th>V</th><th>R</th><th>P</th><th>Skóre</th><th>+/-</th><th>Body</th></tr>
                      </thead>
                      <tbody>
                        {group.teams.map((team) => (
                          <tr key={team.team}>
                            <td>{team.position}</td>
                            <td><TeamBadge name={team.team} compact /></td>
                            <td>{team.played}</td>
                            <td>{team.wins}</td>
                            <td>{team.draws}</td>
                            <td>{team.losses}</td>
                            <td>{team.goals_for}:{team.goals_against}</td>
                            <td>{team.goal_difference > 0 ? `+${team.goal_difference}` : team.goal_difference}</td>
                            <td><strong>{team.points}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
              {!standings.length && <div className="empty-line">Zatím není odehraný žádný skupinový zápas s výsledkem.</div>}
            </div>
          </section>
        )}

        {activeTab === "rules" && settings && (
          <section className="layout-2">
            {user.role === "admin" && (
              <div className="card">
                <h2>Upravit bodování</h2>
                <form onSubmit={saveSettings} className="form-grid">
                  <label>Přesný výsledek<input name="exact_score_points" type="number" defaultValue={settings.exact_score_points} /></label>
                  <label>Vítěz / remíza<input name="correct_result_points" type="number" defaultValue={settings.correct_result_points} /></label>
                  <label>Špatný tip<input name="wrong_tip_points" type="number" defaultValue={settings.wrong_tip_points} /></label>
                  <label>Uzavírání tipování
                    <select name="tip_lock_mode" defaultValue={settings.tip_lock_mode || "match_start"}>
                      <option value="match_start">Automaticky v čase výkopu zápasu</option>
                      <option value="fixed_datetime">Jedním pevným datem a časem</option>
                    </select>
                  </label>
                  <label>Pevné uzavření
                    <input name="tip_lock_at" type="datetime-local" defaultValue={toDateTimeLocal(settings.tip_lock_at)} />
                  </label>
                  <p className="muted full">Pokud zvolíš pevné datum, uzamkne se tipování všech zápasů v daný čas. Pokud zůstane volba výkopu, každý zápas se zamkne samostatně podle svého začátku.</p>
                  <label className="full">Text pravidel<textarea name="rules_text" rows="12" defaultValue={settings.rules_text || ""} /></label>
                  <button className="btn" type="submit">Uložit pravidla</button>
                </form>
              </div>
            )}
            <div className="card rules-preview">
              <h2>Pravidla tipovačky</h2>
              <p className="muted rules-lock-note">{lockInfo.rules}</p>
              <pre>{settings.rules_text}</pre>
            </div>
          </section>
        )}
      </main>

      <UserModal
        modal={userModal}
        onClose={closeUserModal}
        onSubmit={userModal?.type === "edit" ? saveUserProfile : saveUserAccess}
        onDelete={deleteUser}
        onToggle={toggleUserAccess}
      />

      <MatchModal
        modal={matchModal}
        onClose={closeMatchModal}
        onSubmit={matchModal?.type === "result" ? saveResult : saveMatchProfile}
        onDelete={deleteMatch}
      />

      <TipModal
        modal={tipModal}
        onClose={closeTipModal}
        onSubmit={saveAdminTip}
        onDelete={deleteTip}
        onBulkDelete={bulkDeleteTips}
      />
    </div>
  );
}
