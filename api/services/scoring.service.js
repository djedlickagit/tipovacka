import { query } from "../db.js";
import { getResult } from "../utils/match.js";

export async function getScoringSettings() {
  const rows = await query("SELECT * FROM scoring_settings ORDER BY id ASC LIMIT 1");

  if (rows.length) return rows[0];

  await query(
    `INSERT INTO scoring_settings (exact_score_points, correct_result_points, wrong_tip_points, rules_text)
     VALUES (3, 1, 0, '')`
  );

  const nextRows = await query("SELECT * FROM scoring_settings ORDER BY id ASC LIMIT 1");
  return nextRows[0];
}

export function calculatePoints(match, tip, settings) {
  const realHome = Number(match.home_score);
  const realAway = Number(match.away_score);
  const tipHome = Number(tip.home_tip);
  const tipAway = Number(tip.away_tip);

  if (realHome === tipHome && realAway === tipAway) {
    return Number(settings.exact_score_points);
  }

  if (getResult(realHome, realAway) === getResult(tipHome, tipAway)) {
    return Number(settings.correct_result_points);
  }

  return Number(settings.wrong_tip_points);
}

function hasSavedResult(match) {
  return match && match.home_score !== null && match.home_score !== undefined && match.away_score !== null && match.away_score !== undefined;
}

function emptyEvaluation(matchId = null) {
  return {
    match_id: matchId,
    evaluated_tips: 0,
    exact_count: 0,
    result_count: 0,
    wrong_count: 0,
  };
}

export async function evaluateMatchTips(matchId, settingsOverride = null) {
  const id = Number(matchId);
  if (!id) {
    return emptyEvaluation(null);
  }

  const matches = await query("SELECT * FROM matches WHERE id = ? LIMIT 1", [id]);
  const match = matches[0] || null;

  if (!match || !hasSavedResult(match)) {
    return emptyEvaluation(id);
  }

  const settings = settingsOverride || await getScoringSettings();
  const tips = await query("SELECT * FROM tips WHERE match_id = ?", [id]);

  const summary = emptyEvaluation(id);

  for (const tip of tips) {
    const points = calculatePoints(match, tip, settings);
    await query("UPDATE tips SET points = ? WHERE id = ?", [points, tip.id]);

    summary.evaluated_tips += 1;
    if (points === Number(settings.exact_score_points)) {
      summary.exact_count += 1;
    } else if (points === Number(settings.correct_result_points)) {
      summary.result_count += 1;
    } else {
      summary.wrong_count += 1;
    }
  }

  await query("UPDATE matches SET status = 'evaluated' WHERE id = ?", [id]);

  return summary;
}

export async function evaluateFinishedMatches() {
  const settings = await getScoringSettings();
  const finishedMatches = await query(
    "SELECT id FROM matches WHERE status IN ('finished', 'evaluated') AND home_score IS NOT NULL AND away_score IS NOT NULL ORDER BY start_time ASC, id ASC"
  );

  const summary = {
    evaluated_matches: 0,
    evaluated_tips: 0,
    exact_count: 0,
    result_count: 0,
    wrong_count: 0,
  };

  for (const match of finishedMatches) {
    const result = await evaluateMatchTips(match.id, settings);
    summary.evaluated_matches += 1;
    summary.evaluated_tips += result.evaluated_tips;
    summary.exact_count += result.exact_count;
    summary.result_count += result.result_count;
    summary.wrong_count += result.wrong_count;
  }

  return summary;
}
