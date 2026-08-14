// Player-facing tournament listings always show completed tournaments last --
// they're view-only/archived (see TournamentCard's grey-out), so upcoming and
// ongoing tournaments (still actionable) surface first. Anything unrecognized
// (e.g. "draft") ranks alongside "upcoming" rather than breaking the sort.
const STATUS_ORDER = { upcoming: 0, ongoing: 1, completed: 2 };

export function sortTournamentsCompletedLast(tournaments) {
  return [...tournaments].sort(
    (a, b) => (STATUS_ORDER[a.status] ?? 0) - (STATUS_ORDER[b.status] ?? 0)
  );
}
