// The fixed catalog of scoring components card games are built from (Points,
// Hands Won, Bostons, Nil, Sandbags, Penalty, Bonus). Admins configure each
// GameType by checking which of these apply -- a matrix of component x game
// type, matching how these games are actually scored -- rather than building
// fields from scratch every time.
//
// `key` matches the legacy Match columns ("score", "hands", "boston") where one
// exists, so old matches/displays keep working unchanged; the rest are new and
// only ever live in the dynamic teamAScores/teamBScores maps.
//
// `locked` marks the one component that can't be unchecked -- it's always the
// primary field that decides the match winner and feeds standings.
export const STANDARD_SCORE_COMPONENTS = [
  { key: "score", label: "Points", input: "number", min: 0, isPrimary: true, required: true, locked: true },
  { key: "hands", label: "Hands Won", input: "select", min: 0, max: 13 },
  { key: "boston", label: "Bostons", input: "select", min: 0, max: 13 },
  { key: "nil", label: "Nil", input: "select", min: 0, max: 13 },
  { key: "sandbags", label: "Sandbags", input: "number", min: 0 },
  { key: "penalty", label: "Penalty (-)", input: "number", min: 0, sign: -1 },
  { key: "bonus", label: "Bonus (+)", input: "number", min: 0, sign: 1 },
];

// Builds a scoreFields array (in standard order) from a list of component keys.
export function buildScoreFields(keys) {
  const set = new Set(keys);
  return STANDARD_SCORE_COMPONENTS.filter((c) => set.has(c.key)).map((c) => ({
    key: c.key,
    label: c.label,
    input: c.input,
    min: c.min,
    max: c.max,
    isPrimary: !!c.isPrimary,
    required: !!c.isPrimary || !!c.required,
  }));
}
