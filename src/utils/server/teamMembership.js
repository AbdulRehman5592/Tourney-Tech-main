import { Team } from "@/models/Team";

// Removes a player from any team formed for the given game(s) in this
// tournament. A now-empty or now-solo team (the player was its only member)
// is deleted outright; a doubles team just loses that member, leaving the
// partner on record for the organizer to sort out -- callers are
// responsible for surfacing that (e.g. the cancellation email alert, or a
// UI warning on an admin-initiated move) rather than automated re-matching.
export async function removeFromTeams(tournamentId, userId, gameConfigIds) {
  if (!gameConfigIds?.length) return;

  const teams = await Team.find({
    tournament: tournamentId,
    gameConfigId: { $in: gameConfigIds },
    members: userId,
  });

  for (const team of teams) {
    const remainingMembers = team.members.filter((m) => m.toString() !== userId.toString());
    if (remainingMembers.length === 0) {
      await Team.findByIdAndDelete(team._id);
    } else {
      team.members = remainingMembers;
      await team.save();
    }
  }
}
