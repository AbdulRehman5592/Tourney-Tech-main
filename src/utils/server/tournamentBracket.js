import { SingleElimination, DoubleElimination, RoundRobin } from "tournament-pairings";
import { ApiError } from "@/utils/server/ApiError";
import { seatingRegionOf } from "@/utils/server/teamNumbering";

function shuffleArray(array) {
  return array
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

// Maps every team id (as a string) to its seating region code, for enforcing the
// "no same-region matchup in round 1" rule.
function regionMapOf(teams) {
  return new Map(teams.map((t) => [t._id.toString(), seatingRegionOf(t)]));
}

// Reorders a shuffled team list so same-region teams are spread apart, giving
// downstream sequential/seeded pairing a head start at avoiding same-region
// round-1 matchups. Deals teams out of per-region buckets (largest first) so
// adjacent positions tend to differ in region.
function spreadByRegion(teams, regionMap) {
  const buckets = new Map();
  for (const t of teams) {
    const region = regionMap.get(t._id.toString());
    if (!buckets.has(region)) buckets.set(region, []);
    buckets.get(region).push(t);
  }
  const ordered = [];
  const groups = [...buckets.values()];
  while (ordered.length < teams.length) {
    groups.sort((a, b) => b.length - a.length);
    for (const g of groups) {
      if (g.length) ordered.push(g.shift());
    }
  }
  return ordered;
}

// Post-processes generated round-1 matches so no match pairs two same-region
// teams, when a clash-free arrangement is achievable. Only "first playable"
// matches are touched: those with both team slots already filled and not a bye
// (in an elimination bracket, exactly the round-1 / prelim games). Swapping the
// occupants of two such slots is structurally safe -- progression targets are
// fixed to slots, not teams, so winners still advance correctly.
function fixRound1RegionClashes(matchDocs, regionMap) {
  const regionOf = (teamId) =>
    teamId ? regionMap.get(teamId.toString()) : undefined;
  const clash = (m) =>
    m.teamA && m.teamB && regionOf(m.teamA) === regionOf(m.teamB);

  const playable = matchDocs.filter(
    (m) => m.teamA && m.teamB && !m.isBye && m.status !== "completed"
  );

  for (const m of playable) {
    if (!clash(m)) continue;
    for (const n of playable) {
      if (n === m) continue;
      // Try swapping m.teamB with each slot of n; keep the first swap that
      // leaves both matches clash-free.
      for (const slot of ["teamA", "teamB"]) {
        const mB = m.teamB;
        const nX = n[slot];
        const otherOfN = slot === "teamA" ? n.teamB : n.teamA;
        if (regionOf(m.teamA) === regionOf(nX)) continue; // would still clash in m
        if (regionOf(mB) === regionOf(otherOfN)) continue; // would clash in n
        m.teamB = nX;
        n[slot] = mB;
        break;
      }
      if (!clash(m)) break;
    }
  }
  return matchDocs;
}

function toPairingIds(teams) {
  return teams.map((t) => t._id.toString());
}

// Stamps sequential table numbers (starting at 1) onto the playable matches, just
// like the printed bracket charts. Ordering: the whole winner's bracket first,
// then the entire elimination (loser's) bracket, then the grand final -- and
// within each, by round then slot. So a 16-team double-elim numbers the winner's
// bracket Tables 1-15, the loser's bracket 16-30, and the grand final 31.
// Structural byes/walkovers (never played at a table) are skipped.
const BRACKET_SIDE_ORDER = { winners: 0, losers: 1, grand_final: 2 };

export function assignTableNumbers(matchDocs) {
  const sideRank = (m) => BRACKET_SIDE_ORDER[m.bracketSide] ?? 0;
  const sorted = [...matchDocs].sort(
    (a, b) =>
      sideRank(a) - sideRank(b) ||
      (a.round || 0) - (b.round || 0) ||
      (a.slot || 0) - (b.slot || 0)
  );
  let table = 1;
  for (const m of sorted) {
    if (m.isBye || m.status === "completed") continue;
    m.tableNumber = table++;
  }
  return matchDocs;
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
  // Playoff brackets keep their standings seed; initial round-1 brackets are
  // shuffled, then region-spread so the first round avoids same-region matchups.
  const regionMap = regionMapOf(teams);
  const ordered = seeded
    ? teams
    : spreadByRegion(shuffleArray(teams), regionMap);

  const lowerSize = previousPowerOfTwo(ordered.length);
  const excess = ordered.length - lowerSize;

  if (excess === 0) {
    const raw = SingleElimination(toPairingIds(ordered), 1, false, true);
    const docs = raw.map((m) => ({
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
    return seeded ? docs : fixRound1RegionClashes(docs, regionMap);
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

  const docs = [...prelimDocs, ...mainDocs];
  return seeded ? docs : fixRound1RegionClashes(docs, regionMap);
}

// Single-elimination bracket with one team exempted from play until a chosen
// depth ("reward bye" / "protected seed"): Championship (bye straight to the
// final), Semifinal / Final Four (bye to the final four), Quarterfinal (bye
// to the quarterfinals), or First Round (bye through just round 1).
// `byeDepth: "none"` (or no protectedTeamId) is just a normal bracket.
//
// Mechanically: the other N-1 teams are split into (slots-1) independent
// groups -- Championship=1 group, Semifinal/FinalFour=3, Quarterfinal=7,
// First Round=half the padded field minus 1 -- each playing its own ordinary
// buildSingleElimination down to a single group champion. Those champions
// plus the protected seed then form the "final stage" bracket, built the same
// way this file already resolves preliminary/excess teams above: placeholder
// tokens stand in for "TBD, winner of group N" until that group's own final
// match is known, at which point its winTarget is pointed at the resolved
// slot in the final stage. Because routeIntoTarget looks a match up purely by
// (round, slot), a group's champion can arrive at any real-world time --
// rounds don't need to run in lockstep across groups.
//
// Scoped to single-elimination only; double-elimination's winners/losers
// structure would need its own (more involved) surgery.
export function buildSingleEliminationWithProtectedSeed(
  teams,
  { protectedTeamId, byeDepth = "none", seeded = false } = {}
) {
  if (!protectedTeamId || byeDepth === "none") {
    return buildSingleElimination(teams, { seeded });
  }

  const protectedTeam = teams.find((t) => t._id.toString() === protectedTeamId.toString());
  if (!protectedTeam) {
    throw new ApiError(400, "Protected seed is not one of this game's teams");
  }
  const fieldTeams = teams.filter((t) => t._id.toString() !== protectedTeamId.toString());
  if (fieldTeams.length < 1) {
    throw new ApiError(400, "Need at least one other team to build a protected-seed bracket");
  }

  const paddedSize = nextPowerOfTwo(teams.length);
  const slotsAtEntry = {
    championship: 2,
    semifinal: 4,
    final_four: 4,
    quarterfinal: 8,
    first_round: Math.max(2, paddedSize / 2),
  }[byeDepth];
  if (!slotsAtEntry) {
    throw new ApiError(400, `Unknown reward bye depth: ${byeDepth}`);
  }
  if (slotsAtEntry > paddedSize) {
    throw new ApiError(
      400,
      `Bracket is too small for a "${byeDepth}" reward bye (needs at least ${slotsAtEntry} teams)`
    );
  }

  const groupCount = slotsAtEntry - 1;
  const regionMap = regionMapOf(fieldTeams);
  const spreadField = spreadByRegion(shuffleArray(fieldTeams), regionMap);
  const groups = Array.from({ length: groupCount }, () => []);
  spreadField.forEach((team, i) => groups[i % groupCount].push(team));

  // Each group's own buildSingleElimination call numbers its slots fresh
  // starting at 1, which would collide with every other group's slot numbers
  // at the same round (routeIntoTarget addresses matches purely by round+slot
  // per game). Give every group a private slot range via a large per-group
  // offset, applied consistently to both each doc's own slot and any
  // winTarget/lossTarget that points to a sibling within the same group.
  const SLOT_STRIDE = 10000;
  const groupDocs = [];
  const groupFinals = groups.map((groupTeams, gIndex) => {
    if (groupTeams.length === 1) {
      // A "group" of one is already decided -- no match needed.
      return { isDecided: true, winner: groupTeams[0]._id, lastRound: 0 };
    }
    const offset = gIndex * SLOT_STRIDE;
    const docs = buildSingleElimination(groupTeams, { seeded: false });
    docs.forEach((d) => {
      d.groupIndex = gIndex;
      d.slot += offset;
      if (d.winTarget) d.winTarget.match += offset;
      if (d.lossTarget) d.lossTarget.match += offset;
    });
    groupDocs.push(...docs);
    const final = docs.reduce((max, d) => (d.round > (max?.round ?? 0) ? d : max), null);
    return { isDecided: false, matchRef: final, lastRound: final.round };
  });

  const maxGroupRound = Math.max(0, ...groupFinals.map((g) => g.lastRound));
  const finalStageStartRound = maxGroupRound + 1;

  const placeholders = [
    protectedTeam._id.toString(),
    ...groupFinals.map((_, i) => `GROUP_${i}`),
  ];
  const rawFinal = SingleElimination(placeholders, 1, false, true);

  const finalDocs = rawFinal.map((m) => {
    const resolve = (token) => {
      if (token == null) return null;
      if (token.startsWith("GROUP_")) {
        const gIndex = Number(token.slice("GROUP_".length));
        const group = groupFinals[gIndex];
        if (group.isDecided) return group.winner.toString();
        group.matchRef.winTarget = {
          round: finalStageStartRound + (m.round - 1),
          match: m.match,
        };
        return null;
      }
      return token;
    };
    return {
      teamA: resolve(m.player1),
      teamB: resolve(m.player2),
      round: finalStageStartRound + (m.round - 1),
      slot: m.match,
      winTarget: m.win
        ? { round: finalStageStartRound + (m.win.round - 1), match: m.win.match }
        : null,
      lossTarget: null,
      stage: "round1",
      bracketSide: null,
      bracketGroup: null,
      isBye: false,
    };
  });

  return [...groupDocs, ...finalDocs];
}

export function buildDoubleElimination(teams) {
  if (teams.length < 4) {
    throw new ApiError(400, "Double elimination needs at least 4 teams");
  }
  const regionMap = regionMapOf(teams);
  const shuffled = spreadByRegion(shuffleArray(teams), regionMap);
  const raw = DoubleElimination(paddedIds(shuffled), 1, true);
  const sideByRound = classifyBracketSides(raw);
  const { analyze } = analyzeBracket(raw);

  const docs = raw
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

  return fixRound1RegionClashes(docs, regionMap);
}

export function buildRoundRobin(teams) {
  if (teams.length < 2) {
    throw new ApiError(400, "Need at least 2 teams for round robin");
  }
  const regionMap = regionMapOf(teams);
  const shuffled = spreadByRegion(shuffleArray(teams), regionMap);
  const raw = RoundRobin(toPairingIds(shuffled), 1, true);

  // A null player in round-robin output means "sits out this round" (a bye) --
  // there is no game to play and no winner/loser, so we simply don't create a match.
  const docs = raw
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

  // The "no same-region matchup" rule only applies to round 1 -- every team
  // plays every other team over the course of a full round robin anyway, so
  // later rounds necessarily re-pair some same-region teams eventually.
  const round1Docs = docs.filter((d) => d.round === 1);
  fixRound1RegionClashes(round1Docs, regionMap);
  return docs;
}

// Mesh ("movement") format: every round, the winner of each table moves UP
// toward the top table and the loser moves DOWN toward table 1; nobody is
// ever eliminated, everyone plays every round. The whole `rounds`-deep shell
// is pre-built up front (round 1 seeded, later rounds empty) exactly like the
// elimination builders, and reuses the SAME progression mechanism: each
// match's winTarget/lossTarget names a {round, table} in the next round's
// shell, and the existing routeIntoTarget() (bracketProgression.js) drops the
// winner/loser into that slot as soon as the match completes.
//
// The winner/loser destination-table formula is derived from the reference
// movement chart (30 teams / 15 tables / 4 rounds): for N tables,
//   loser of table i   -> table ceil(i / 2)              (funnels toward 1)
//   winner of table i  -> table ceil((i + N) / 2)         (funnels toward N)
// This is a clean bijection: every destination table receives exactly one
// winner-arrival and one loser-arrival (they coincide at a single "pivot"
// table when N is odd), so no round ever over- or under-fills a table.
export function buildMesh(teams, { rounds } = {}) {
  if (!rounds || rounds < 1) {
    throw new ApiError(400, "Number of rounds is required for the mesh format");
  }
  if (teams.length < 4) {
    throw new ApiError(400, "Mesh format needs at least 4 teams");
  }

  const regionMap = regionMapOf(teams);
  const seeded = spreadByRegion(shuffleArray(teams), regionMap);
  const tableCount = Math.ceil(seeded.length / 2);

  const loserTarget = (table) => Math.ceil(table / 2);
  const winnerTarget = (table) => Math.ceil((table + tableCount) / 2);

  const docs = [];
  for (let round = 1; round <= rounds; round++) {
    const isLastRound = round === rounds;
    for (let table = 1; table <= tableCount; table++) {
      docs.push({
        round,
        slot: table,
        teamA: null,
        teamB: null,
        winTarget: isLastRound ? null : { round: round + 1, match: winnerTarget(table) },
        lossTarget: isLastRound ? null : { round: round + 1, match: loserTarget(table) },
        stage: "round1",
        bracketSide: null,
        bracketGroup: null,
        isBye: false,
      });
    }
  }

  // Seed round 1 two teams per table off the region-spread order. An odd
  // field leaves the last table's second slot empty -- that team gets a bye
  // this round and auto-advances via the winner route, same as an elimination
  // bracket bye.
  const round1 = docs.filter((d) => d.round === 1);
  let i = 0;
  for (const match of round1) {
    match.teamA = seeded[i++]?._id ?? null;
    match.teamB = seeded[i++]?._id ?? null;
    if (match.teamA && !match.teamB) {
      match.isBye = true;
      match.lossTarget = null; // a bye never produces a loser
      match.status = "completed";
      match.winner = match.teamA;
      match.completedAt = new Date();
    }
  }
  fixRound1RegionClashes(round1, regionMap);

  return docs;
}

// "Standard" rotation format: the simplest preliminary format. Home teams are
// fixed permanently to their table; the away team shifts by one table every
// round (direction admin-configurable), wrapping around at the ends (e.g. a
// 15-table event shifting "up": table 15's away team goes to table 1 next).
// Movement is purely mechanical -- it never depends on who wins -- so, unlike
// mesh, a round's pairing is a pure function of the round number and can be
// computed directly without any winTarget/lossTarget routing.
//
// Because the total round count isn't always known up front (the format can
// run "indefinitely" until the admin declines "another round?"), this builds
// exactly the rounds requested (`fromRound`..`fromRound + count - 1`) rather
// than a whole fixed shell -- called once for `rounds` rounds at generation
// time when the organizer set a fixed count, or called repeatedly for one
// round at a time when they didn't.
export function buildStandardRotation(teams, { direction = "up", fromRound = 1, count = 1 } = {}) {
  if (teams.length < 4) {
    throw new ApiError(400, "Standard rotation format needs at least 4 teams");
  }
  const step = direction === "down" ? -1 : 1;

  const regionMap = regionMapOf(teams);
  const spread = spreadByRegion(shuffleArray(teams), regionMap);
  const tableCount = Math.ceil(spread.length / 2);
  const homeTeams = spread.slice(0, tableCount);
  const awayTeams = spread.slice(tableCount);

  const docs = [];
  for (let round = fromRound; round < fromRound + count; round++) {
    // Away team originally seeded at index p sits at table
    // (p + (round-1)*step) mod tableCount this round; home teams never move.
    const awayAtTable = new Map();
    awayTeams.forEach((team, p) => {
      const table = (((p + (round - 1) * step) % tableCount) + tableCount) % tableCount;
      awayAtTable.set(table, team);
    });

    for (let table = 0; table < tableCount; table++) {
      const away = awayAtTable.get(table);
      if (!away) continue; // this round's bye table -- no away visitor, no match
      docs.push({
        teamA: homeTeams[table]._id,
        teamB: away._id,
        round,
        slot: table + 1,
        winTarget: null,
        lossTarget: null,
        stage: "round1",
        bracketSide: null,
        bracketGroup: null,
      });
    }
  }

  return docs;
}

const STANDINGS_CRITERIA = {
  wins: (x, y) => y.wins - x.wins || (y.pointsFor - y.pointsAgainst) - (x.pointsFor - x.pointsAgainst),
  points: (x, y) => y.pointsFor - x.pointsFor || y.wins - x.wins,
  hands: (x, y) => y.handsFor - x.handsFor || y.wins - x.wins,
};

function rankByCriteria(statsList, criteria) {
  return statsList.sort(STANDINGS_CRITERIA[criteria] || STANDINGS_CRITERIA.wins);
}

// Reads a dynamic score-map value regardless of whether the match doc is a
// live Mongoose document (Map) or a plain/.lean() object.
function scoreMapValue(scoresField, key) {
  if (!scoresField) return undefined;
  return typeof scoresField.get === "function" ? scoresField.get(key) : scoresField[key];
}

function tallyStandings(matches, teamIds) {
  const stats = new Map(
    teamIds.map((id) => [id, { teamId: id, wins: 0, pointsFor: 0, pointsAgainst: 0, handsFor: 0 }])
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
    a.handsFor += Number(scoreMapValue(m.teamAScores, "hands") ?? m.teamAtotalWon ?? 0);
    b.handsFor += Number(scoreMapValue(m.teamBScores, "hands") ?? m.teamBtotalWon ?? 0);
    if (m.winner?.toString() === aId) a.wins += 1;
    else if (m.winner?.toString() === bId) b.wins += 1;
  }
  return [...stats.values()];
}

export function computeStandingsRoundRobin(matches, teams, criteria = "wins") {
  return rankByCriteria(tallyStandings(matches, teams.map((t) => t._id.toString())), criteria);
}

// Mesh has no pools to group by -- every team plays every round, so standings
// are just a flat tally across all rounds' matches, same as round robin.
export function computeStandingsMesh(matches, teams, criteria = "wins") {
  return computeStandingsRoundRobin(matches, teams, criteria);
}
