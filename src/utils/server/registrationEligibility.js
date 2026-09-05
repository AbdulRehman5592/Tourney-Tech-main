import { Registration } from "@/models/Registration";

// True if any of these users has a REJECTED registration covering this
// specific game. A rejected registrant should never end up teamed up,
// checked in, or seeded into a bracket -- regardless of how fast staff need
// to move. Deliberately does NOT require "approved" -- a still-"pending"
// registration (e.g. a fresh bulk-import, or a cash payer not yet ticked
// off) is allowed through, since gating on full approval would break the
// bulk-register -> form-teams -> approve workflow and slow down door
// check-in for legitimate late payers.
export async function hasRejectedRegistration({ tournamentId, gameConfigId, userIds }) {
  const rejected = await Registration.findOne({
    tournament: tournamentId,
    user: { $in: userIds },
    "gameRegistrationDetails.gameConfigIds": gameConfigId,
    "gameRegistrationDetails.status": "rejected",
  }).select("_id");
  return !!rejected;
}
