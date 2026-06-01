export function formatDate(value) {
  if (!value) return "bez času";

  return new Date(value).toLocaleString("cs-CZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function matchLocked(match, settings = {}) {
  if (Boolean(match?.locked_by_time)) return true;
  if (["locked", "finished", "evaluated"].includes(match?.status)) return true;

  const mode = settings?.tip_lock_mode || match?.tip_lock_mode || "match_start";

  if (mode === "fixed_datetime") {
    const fixed = parseDate(settings?.tip_lock_at || match?.tip_lock_at);
    return fixed ? Date.now() >= fixed.getTime() : false;
  }

  const start = parseDate(match?.start_time);
  return start ? Date.now() >= start.getTime() : false;
}
