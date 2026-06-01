import { Router } from "express";
import { query } from "../db.js";
import { isTipLocked } from "../utils/match.js";
import { getScoringSettings } from "../services/scoring.service.js";

const router = Router();

function publicMatch(row, settings = {}) {
  return {
    ...row,
    tips_count: Number(row.tips_count || 0),
    tipped_players_count: Number(row.tipped_players_count || 0),
    locked_by_time: isTipLocked(row, settings),
    tip_lock_mode: settings.tip_lock_mode || "match_start",
    tip_lock_at: settings.tip_lock_at || null,
  };
}

function emptyTeam(team) {
  return {
    team,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goals_for: 0,
    goals_against: 0,
    goal_difference: 0,
    points: 0,
  };
}

function applyMatch(team, goalsFor, goalsAgainst) {
  team.played += 1;
  team.goals_for += goalsFor;
  team.goals_against += goalsAgainst;
  team.goal_difference = team.goals_for - team.goals_against;

  if (goalsFor > goalsAgainst) {
    team.wins += 1;
    team.points += 3;
  } else if (goalsFor === goalsAgainst) {
    team.draws += 1;
    team.points += 1;
  } else {
    team.losses += 1;
  }
}

function sortTeams(a, b) {
  return (
    b.points - a.points ||
    b.goal_difference - a.goal_difference ||
    b.goals_for - a.goals_for ||
    a.goals_against - b.goals_against ||
    String(a.team).localeCompare(String(b.team), "cs")
  );
}

function buildStandings(matches = []) {
  const groups = new Map();

  for (const match of matches) {
    if (match.stage !== "group") continue;
    const groupName = String(match.group_name || "").trim().toUpperCase();
    if (!groupName) continue;
    if (match.home_score === null || match.home_score === undefined || match.away_score === null || match.away_score === undefined) continue;

    if (!groups.has(groupName)) {
      groups.set(groupName, {
        group_name: groupName,
        played_matches: 0,
        teams: new Map(),
      });
    }

    const group = groups.get(groupName);
    const homeTeamName = String(match.home_team || "").trim();
    const awayTeamName = String(match.away_team || "").trim();
    const homeScore = Number(match.home_score);
    const awayScore = Number(match.away_score);

    if (!homeTeamName || !awayTeamName || !Number.isInteger(homeScore) || !Number.isInteger(awayScore)) continue;

    if (!group.teams.has(homeTeamName)) group.teams.set(homeTeamName, emptyTeam(homeTeamName));
    if (!group.teams.has(awayTeamName)) group.teams.set(awayTeamName, emptyTeam(awayTeamName));

    applyMatch(group.teams.get(homeTeamName), homeScore, awayScore);
    applyMatch(group.teams.get(awayTeamName), awayScore, homeScore);
    group.played_matches += 1;
  }

  return Array.from(groups.values())
    .sort((a, b) => String(a.group_name).localeCompare(String(b.group_name), "cs"))
    .map((group) => ({
      group_name: group.group_name,
      played_matches: group.played_matches,
      teams: Array.from(group.teams.values())
        .sort(sortTeams)
        .map((team, index) => ({ ...team, position: index + 1 })),
    }));
}

router.get("/summary", async (req, res) => {
  try {
    const settings = await getScoringSettings();

    const matches = await query(
      `SELECT
         matches.*,
         COUNT(tips.id) AS tips_count,
         COUNT(DISTINCT tips.user_id) AS tipped_players_count
       FROM matches
       LEFT JOIN tips ON tips.match_id = matches.id
       GROUP BY matches.id
       ORDER BY
         CASE WHEN matches.start_time IS NULL THEN 1 ELSE 0 END,
         matches.start_time ASC,
         matches.id ASC`
    );

    const leaderboard = await query(
      `SELECT
         users.id,
         users.name,
         COALESCE(SUM(tips.points), 0) AS points,
         COUNT(tips.id) AS tips_count,
         SUM(CASE WHEN tips.points = settings.exact_score_points THEN 1 ELSE 0 END) AS exact_count,
         SUM(CASE WHEN tips.points = settings.correct_result_points THEN 1 ELSE 0 END) AS result_count
       FROM users
       LEFT JOIN tips ON tips.user_id = users.id
       CROSS JOIN (SELECT * FROM scoring_settings ORDER BY id ASC LIMIT 1) settings
       WHERE users.role = 'player' AND users.is_active = 1
       GROUP BY users.id, users.name
       ORDER BY points DESC, exact_count DESC, result_count DESC, users.name ASC`
    );

    const publicMatches = matches.map((row) => publicMatch(row, settings));

    res.json({
      matches: publicMatches,
      leaderboard,
      standings: buildStandings(publicMatches),
      settings: {
        exact_score_points: settings.exact_score_points,
        correct_result_points: settings.correct_result_points,
        wrong_tip_points: settings.wrong_tip_points,
        rules_text: settings.rules_text,
        tip_lock_mode: settings.tip_lock_mode,
        tip_lock_at: settings.tip_lock_at,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Nepodařilo se načíst veřejný přehled.", detail: err.message });
  }
});

export default router;
