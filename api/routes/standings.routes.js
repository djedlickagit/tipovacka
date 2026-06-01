import { Router } from "express";
import { query } from "../db.js";
import { auth } from "../middleware/auth.js";

const router = Router();

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

router.get("/", auth, async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, stage, group_name, home_team, away_team, home_score, away_score, status, start_time
       FROM matches
       WHERE stage = 'group'
         AND group_name IS NOT NULL
         AND group_name <> ''
         AND home_score IS NOT NULL
         AND away_score IS NOT NULL
       ORDER BY group_name ASC, start_time ASC, id ASC`
    );

    const groups = new Map();

    for (const match of rows) {
      const groupName = String(match.group_name || "").trim().toUpperCase();
      if (!groupName) continue;

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

      if (!homeTeamName || !awayTeamName || !Number.isInteger(homeScore) || !Number.isInteger(awayScore)) {
        continue;
      }

      if (!group.teams.has(homeTeamName)) group.teams.set(homeTeamName, emptyTeam(homeTeamName));
      if (!group.teams.has(awayTeamName)) group.teams.set(awayTeamName, emptyTeam(awayTeamName));

      applyMatch(group.teams.get(homeTeamName), homeScore, awayScore);
      applyMatch(group.teams.get(awayTeamName), awayScore, homeScore);
      group.played_matches += 1;
    }

    const standings = Array.from(groups.values())
      .sort((a, b) => String(a.group_name).localeCompare(String(b.group_name), "cs"))
      .map((group) => ({
        group_name: group.group_name,
        played_matches: group.played_matches,
        teams: Array.from(group.teams.values())
          .sort(sortTeams)
          .map((team, index) => ({ ...team, position: index + 1 })),
      }));

    res.json(standings);
  } catch (err) {
    res.status(500).json({ error: "Nepodařilo se načíst tabulky skupin.", detail: err.message });
  }
});

export default router;
