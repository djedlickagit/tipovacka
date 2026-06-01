export function getResult(home, away) {
  if (Number(home) > Number(away)) return "home";
  if (Number(home) < Number(away)) return "away";
  return "draw";
}

export function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getTipLockInfo(match, settings = {}) {
  if (!match) {
    return { locked: false, code: "open", message: "Tipování je otevřené." };
  }

  if (["finished", "evaluated"].includes(match.status)) {
    return { locked: true, code: "finished", message: "Zápas je už dohraný a tip nejde změnit." };
  }

  if (match.status === "locked") {
    return { locked: true, code: "manual", message: "Zápas je ručně uzamčený administrátorem." };
  }

  const mode = settings?.tip_lock_mode || "match_start";

  if (mode === "fixed_datetime") {
    const fixed = parseDate(settings?.tip_lock_at);
    if (fixed && Date.now() >= fixed.getTime()) {
      return { locked: true, code: "fixed_datetime", message: "Tipování je už uzamčeno pevným termínem." };
    }
    return { locked: false, code: "open", message: "Tipování je otevřené." };
  }

  const start = parseDate(match?.start_time);
  if (start && Date.now() >= start.getTime()) {
    return { locked: true, code: "match_start", message: "Tipování tohoto zápasu je už uzamčeno, protože zápas začal." };
  }

  return { locked: false, code: "open", message: "Tipování je otevřené." };
}

export function isMatchLocked(match) {
  return isTipLocked(match, { tip_lock_mode: "match_start" });
}

export function isTipLocked(match, settings = {}) {
  return getTipLockInfo(match, settings).locked;
}
