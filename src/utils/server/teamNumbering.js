// Server-side team-number assignment.
//
// Given the region code(s) of a team's player(s), decides the team's
// classification + region code, pulls the next sequential 3-digit team number
// for that code, and returns the pieces the caller stamps onto the Team doc.
//
// Rules (from the tournament numbering legend):
//   - single player, or two players from the SAME region  -> geographic team,
//     region = that shared region, e.g. `06-012`.
//   - two players from DIFFERENT regions                   -> hybrid/alliance
//     team, code `40`, with primary + secondary home regions recorded,
//     e.g. `40-001`.
//
// The 3-digit sequence is maintained per region code via the shared Counter, so
// two geographic teams from Cincinnati get `06-001`, `06-002`, ... while hybrids
// get `40-001`, `40-002`, ... independently.

import { getNextSequence } from "@/lib/utils";
import {
  CLASSIFICATIONS,
  CLASSIFICATION_CODES,
  DEFAULT_REGION_CODE,
  formatDisplayId,
  isGeographicCode,
  resolveRegionCode,
} from "@/constants/regions";

// Accepts a code or a legacy region name and yields the canonical 2-digit code.
function normalizeRegion(code) {
  return resolveRegionCode(code);
}

// `memberRegions`: array of region codes, one per player on the team (length 1
// for single-player teams, 2 for double). Returns the numbering fields; does NOT
// persist anything except advancing the per-code counter.
export async function assignTeamNumber(memberRegions) {
  const regions = (memberRegions || []).map(normalizeRegion);

  let classification;
  let regionCode;
  let primaryRegion = null;
  let secondaryRegion = null;

  const [first, second] = regions;

  if (regions.length < 2 || first === second) {
    // Single player, or a same-region pairing -> geographic team.
    classification = CLASSIFICATIONS.GEOGRAPHIC;
    regionCode = first || DEFAULT_REGION_CODE;
    primaryRegion = regionCode;
  } else {
    // Mixed regions -> hybrid / alliance team.
    classification = CLASSIFICATIONS.ALLIANCE;
    regionCode = CLASSIFICATION_CODES[CLASSIFICATIONS.ALLIANCE];
    primaryRegion = first;
    secondaryRegion = second;
  }

  const teamNumber = await getNextSequence(`team-number-${regionCode}`);

  return {
    classification,
    regionCode,
    teamNumber,
    displayId: formatDisplayId(regionCode, teamNumber),
    primaryRegion,
    secondaryRegion,
  };
}

// The region a team should be treated as "belonging to" for round-1 seating
// (avoid same-region matchups). Geographic teams use their region; hybrid teams
// fall back to their primary home region.
export function seatingRegionOf(team) {
  if (!team) return DEFAULT_REGION_CODE;
  const geographic = isGeographicCode(team.regionCode);
  const region = geographic ? team.regionCode : team.primaryRegion;
  return normalizeRegion(region || team.regionCode);
}
