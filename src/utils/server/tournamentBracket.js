import { SingleElimination, DoubleElimination, RoundRobin } from "tournament-pairings";
import { ApiError } from "@/utils/server/ApiError";

function shuffleArray(array) {
  return array
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

function toPairingIds(teams) {
  return teams.map((t) => t._id.toString());
}

function nextPowerOfTwo(n) {
  let size = 1;
  while (size < n) size *= 2;
  return size;
}

function previousPowerOfTwo(n) {
  let size = 1;
  while (size * 2 <= n) size *= 2;
  return size;
}

// Pads the seed list with explicit `null` byes up to the next power of two.
// Without this, the pairing library "compacts" byes by seeding their recipient
// directly into round 2+ and never emitting a round-1 entry for them at all --
// which produces a bracket where round counts don't halve consistently (e.g.
// round 1 has fewer matches than round 2). The bracket-visualization library
// assumes strict halving per round to lay out columns, so an uneven shape like
// that renders as a corrupted/clipped tree. Padding with real `null` bye slots
// keeps every round a clean power-of-two shape, matching what the bracket
// component expects.
function paddedIds(teams) {
  const ids = toPairingIds(teams);
  const size = nextPowerOfTwo(ids.length);
  while (ids.length < size) ids.push(null);
  return ids;
}

// Determines, for every match in a raw pairing-library bracket, how many real
// occupants it will ever have (0, 1, or 2) and -- when exactly one -- whether
// that occupant is already concretely known.
//
// This matters beyond round 1: a losers-bracket match's occupant count depends
// on how many of its *own* feeder matches are themselves byes (a bye produces
// no loser, so it silently contributes nothing to whatever the loser side would
// have fed). With enough round-1 byes, a losers-bracket slot can end up with
// zero incoming losers (a phantom match, never creatable) or exactly one (a
// "pass-through" bye whose sole occupant isn't known until an upstream match
// still in progress finishes) -- neither of which the naive "one null slot at
// construction" check catches, since those only ever apply to round 1.
function analyzeBracket(rawMatches) {
  const winFeeders = new Map();
  const lossFeeders = new Map();
  const key = (round, slot) => `${round}:${slot}`;
  for (const m of rawMatches) {
    if (m.win) {
      const k = key(m.win.round, m.win.match);
      if (!winFeeders.has(k)) winFeeders.set(k, []);
      winFeeders.get(k).push(m);
    }
    if (m.loss) {
      const k = key(m.loss.round, m.loss.match);
      if (!lossFeeders.has(k)) lossFeeders.set(k, []);
      lossFeeders.get(k).push(m);
    }
  }

  const cache = new Map();
  function analyze(m) {
    const k = key(m.round, m.match);
    if (cache.has(k)) return cache.get(k);
    cache.set(k, { count: 0, winner: null }); // cycle guard; graph is a DAG so unused

    const occupants = [];
    if (m.player1 != null) occupants.push(m.player1);
    if (m.player2 != null) occupants.push(m.player2);

    for (const src of winFeeders.get(k) || []) {
      const a = analyze(src);
      if (a.count >= 1) occupants.push(a.count === 1 ? a.winner : undefined);
    }
    for (const src of lossFeeders.get(k) || []) {
      const a = analyze(src);
      // Only a match with 2 real occupants is guaranteed to eventually produce
      // a loser; a bye (count 1) or phantom (count 0) never sends anyone here.
      if (a.count === 2) occupants.push(undefined);
    }

    const result = {
      count: occupants.length,
      winner: occupants.length === 1 ? occupants[0] ?? null : null,
    };
    cache.set(k, result);
    return result;
  }

  for (const m of rawMatches) analyze(m);
  return { analyze: (m) => cache.get(key(m.round, m.match)) };
}

// The pairing library forces every round in a bracket down a strictly-increasing
// chain, except the double-elimination grand final, which is reached both from the
// winners chain (round1 -> ... -> N) and the losers chain (which loops back with a
// higher round number). A single increasing pass can't classify that, so this
// iterates to a fixed point instead.
function classifyBracketSides(rawMatches) {
  const labels = new Map();
  const ensure = (round) => {
    if (!labels.has(round)) labels.set(round, new Set());
    return labels.get(round);
  };
  ensure(1).add("winners");

  for (let pass = 0; pass < rawMatches.length + 2; pass++) {
    let changed = false;
    for (const m of rawMatches) {
      const srcLabels = ensure(m.round);
      if (srcLabels.size === 0) continue;
      if (m.win) {
        const dest = ensure(m.win.round);
        for (const l of srcLabels) {
          if (!dest.has(l)) {
            dest.add(l);
            changed = true;
          }
        }
      }
      if (m.loss) {
        const dest = ensure(m.loss.round);
        if (!dest.has("losers")) {
          dest.add("losers");
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  const result = new Map();
  for (const [round, set] of labels.entries()) {
    if (set.has("winners") && set.has("losers")) result.set(round, "grand_final");
    else if (set.has("losers")) result.set(round, "losers");
    else result.set(round, "winners");
  }
  return result;
}

// `seeded`: when true, `teams` is used in the given order (best seed first) instead
// of being shuffled -- used for playoff brackets seeded by round-1 standings, so top
// seeds get the byes.
//
// Rather than padding up to the next power of two (which forces byes -- teams
// that skip round 1 entirely for a free walkover), this uses a preliminary
// "play-in" round: only just enough teams play an extra game to trim the field
// down to the next power of two *below* the team count. Every match here is a
// real game; nobody auto-advances without playing. Total matches always comes
// out to exactly teams.length - 1, the theoretical minimum for a knockout of
// that size (byes-based padding always creates more match nodes than that).
export function buildSingleElimination(teams, { seeded = false } = {}) {
  if (teams.length < 2) {
    throw new ApiError(400, "Need at least 2 teams for single elimination");
  }
  const ordered = seeded ? teams : shuffleArray(teams);

  const lowerSize = previousPowerOfTwo(ordered.length);
  const excess = ordered.length - lowerSize;

  if (excess === 0) {
    const raw = SingleElimination(toPairingIds(ordered), 1, false, true);
    return raw.map((m) => ({
      teamA: m.player1 || null,
      teamB: m.player2 || null,
      round: m.round,
      slot: m.match,
      winTarget: m.win ? { round: m.win.round, match: m.win.match } : null,
      lossTarget: null,
      stage: "round1",
      bracketSide: null,
      bracketGroup: null,
      isBye: false,
    }));
  }

  // Lowest-ranked (or, unseeded, arbitrary since already shuffled) `2*excess`
  // teams play the preliminary round; the rest skip straight to the main bracket.
  const byeTeams = ordered.slice(0, lowerSize - excess);
  const prelimTeams = ordered.slice(lowerSize - excess);

  const prelimDocs = [];
  for (let i = 0; i < prelimTeams.length; i += 2) {
    prelimDocs.push({
      teamA: prelimTeams[i]._id,
      teamB: prelimTeams[i + 1]._id,
      round: 0,
      slot: i / 2 + 1,
      winTarget: null, // filled in below once we know which main-bracket slot consumes it
      lossTarget: null,
      stage: "round1",
      bracketSide: null,
      bracketGroup: null,
      isBye: false,
    });
  }

  // Seed the main bracket with placeholder tokens: bye teams fill their slots
  // directly, "PRELIM_n" marks a slot that must wait for preliminary match n.
  const placeholders = [
    ...byeTeams.map((t) => t._id.toString()),
    ...prelimDocs.map((_, i) => `PRELIM_${i + 1}`),
  ];
  const raw = SingleElimination(placeholders, 1, false, true);

  const mainDocs = raw.map((m) => {
    const resolve = (playerToken) => {
      if (playerToken == null) return null;
      if (playerToken.startsWith("PRELIM_")) {
        const idx = Number(playerToken.slice("PRELIM_".length)) - 1;
        prelimDocs[idx].winTarget = { round: m.round, match: m.match };
        return null;
      }
      return playerToken;
    };

    return {
      teamA: resolve(m.player1),
      teamB: resolve(m.player2),
      round: m.round,
      slot: m.match,
      winTarget: m.win ? { round: m.win.round, match: m.win.match } : null,
      lossTarget: null,
      stage: "round1",
      bracketSide: null,
      bracketGroup: null,
      isBye: false,
    };
  });

  return [...prelimDocs, ...mainDocs];
}

export function buildDoubleElimination(teams) {
  if (teams.length < 4) {
    throw new ApiError(400, "Double elimination needs at least 4 teams");
  }
  const shuffled = shuffleArray(teams);
  const raw = DoubleElimination(paddedIds(shuffled), 1, true);
  const sideByRound = classifyBracketSides(raw);
  const { analyze } = analyzeBracket(raw);

  return raw
    .map((m) => {
      const a = analyze(m);
      if (a.count === 0) return null; // phantom slot -- nothing will ever occupy it

      const doc = {
        teamA: m.player1 || null,
        teamB: m.player2 || null,
        round: m.round,
        slot: m.match,
        winTarget: m.win ? { round: m.win.round, match: m.win.match } : null,
        // A bye (or pass-through) never produces a loser, so it never sends
        // anyone to the losers bracket even though the pairing library still
        // assigns it a loss target.
        lossTarget: a.count === 1 ? null : m.loss ? { round: m.loss.round, match: m.loss.match } : null,
        stage: "round1",
        bracketSide: sideByRound.get(m.round) || "winners",
        bracketGroup: null,
        isBye: a.count === 1,
      };
      if (a.count === 1 && a.winner) {
        doc.status = "completed";
        doc.winner = a.winner;
        doc.completedAt = new Date();
      }
      return doc;
    })
    .filter(Boolean);
}

export function buildRoundRobin(teams) {
  if (teams.length < 2) {
    throw new ApiError(400, "Need at least 2 teams for round robin");
  }
  const shuffled = shuffleArray(teams);
  const raw = RoundRobin(toPairingIds(shuffled), 1, true);

  // A null player in round-robin output means "sits out this round" (a bye) --
  // there is no game to play and no winner/loser, so we simply don't create a match.
  return raw
    .filter((m) => m.player1 && m.player2)
    .map((m) => ({
      teamA: m.player1,
      teamB: m.player2,
      round: m.round,
      slot: m.match,
      winTarget: null,
      lossTarget: null,
      stage: "round1",
      bracketSide: null,
      bracketGroup: null,
    }));
}

// Splits teams into pools and runs a round robin within each. Returns one entry per
// pool so the caller can create a BracketGroup doc per pool and stamp its id onto
// each match before insertion.
export function buildMesh(teams, groupCount) {
  if (teams.length < 4) {
    throw new ApiError(400, "Mesh format needs at least 4 teams");
  }
  const shuffled = shuffleArray(teams);
  const maxGroups = Math.max(1, Math.floor(shuffled.length / 2));
  let count = groupCount && groupCount >= 2 ? groupCount : Math.max(2, Math.round(shuffled.length / 5));
  count = Math.min(count, maxGroups);

  const groups = Array.from({ length: count }, () => []);
  shuffled.forEach((team, i) => groups[i % count].push(team));

  return groups.map((groupTeams, index) => ({
    groupIndex: index,
    groupName: `Group ${String.fromCharCode(65 + index)}`,
    teams: groupTeams,
    matches: buildRoundRobin(groupTeams),
  }));
}

function rankByWinsThenDiff(statsList) {
  return statsList.sort((x, y) => {
    if (y.wins !== x.wins) return y.wins - x.wins;
    return y.pointsFor - y.pointsAgainst - (x.pointsFor - x.pointsAgainst);
  });
}

function tallyStandings(matches, teamIds) {
  const stats = new Map(
    teamIds.map((id) => [id, { teamId: id, wins: 0, pointsFor: 0, pointsAgainst: 0 }])
  );
  for (const m of matches) {
    if (m.status !== "completed" || !m.teamA || !m.teamB) continue;
    const aId = m.teamA.toString();
    const bId = m.teamB.toString();
    const a = stats.get(aId);
    const b = stats.get(bId);
    if (!a || !b) continue;
    a.pointsFor += m.teamAScore || 0;
    a.pointsAgainst += m.teamBScore || 0;
    b.pointsFor += m.teamBScore || 0;
    b.pointsAgainst += m.teamAScore || 0;
    if (m.winner?.toString() === aId) a.wins += 1;
    else if (m.winner?.toString() === bId) b.wins += 1;
  }
  return rankByWinsThenDiff([...stats.values()]);
}

export function computeStandingsRoundRobin(matches, teams) {
  return tallyStandings(matches, teams.map((t) => t._id.toString()));
}

// Ranks within each pool (grouped by bracketGroup id on the match docs), then
// interleaves pool standings snake-style: all pool rank-1s, then all rank-2s, etc.
export function computeStandingsMesh(matches, teams) {
  const teamById = new Map(teams.map((t) => [t._id.toString(), t]));
  const matchesByGroup = new Map();
  for (const m of matches) {
    const groupId = m.bracketGroup?.toString();
    if (!groupId) continue;
    if (!matchesByGroup.has(groupId)) matchesByGroup.set(groupId, []);
    matchesByGroup.get(groupId).push(m);
  }

  const perGroupStandings = [...matchesByGroup.values()].map((groupMatches) => {
    const teamIds = new Set();
    groupMatches.forEach((m) => {
      if (m.teamA) teamIds.add(m.teamA.toString());
      if (m.teamB) teamIds.add(m.teamB.toString());
    });
    return tallyStandings(groupMatches, [...teamIds]);
  });

  const maxLen = Math.max(0, ...perGroupStandings.map((g) => g.length));
  const interleaved = [];
  for (let rank = 0; rank < maxLen; rank++) {
    for (const group of perGroupStandings) {
      if (group[rank]) interleaved.push(group[rank]);
    }
  }
  return interleaved.filter((s) => teamById.has(s.teamId));
}
