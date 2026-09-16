// "Game name — event title" label for one scheduled game instance
// (Tournament.games[] entry) -- the same catalog game can be scheduled more
// than once in a tournament, so the event title is what actually tells two
// entries apart in admin UI (dropdowns, table cells, chips).
export function formatGameConfigLabel(gameConfig) {
  return `${gameConfig?.game?.name || "Unnamed Game"}${
    gameConfig?.eventTitle ? ` — ${gameConfig.eventTitle}` : ""
  }`;
}
