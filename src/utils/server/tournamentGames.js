// A tournament can hold more than one config for the same underlying Game
// only when each has its own distinct, explicitly scheduled time -- two
// entries that are both still TBA, or that land on the exact same date/time,
// can't be told apart by admins or players, so those count as a duplicate.
export function findSchedulingConflict(existingGames, gameId, scheduledAt) {
  const targetId = gameId?.toString();
  return (
    existingGames.find((g) => {
      if (g.game?.toString() !== targetId) return false;
      if (!scheduledAt || !g.scheduledAt) return true;
      return new Date(g.scheduledAt).getTime() === new Date(scheduledAt).getTime();
    }) || null
  );
}
