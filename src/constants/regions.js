// Team / player region classification system.
//
// Every team gets a Display ID of the form `RR-TTT`:
//   RR  = 2-digit region (or classification) code
//   TTT = 3-digit team number, sequential *within that region code*
//
// e.g. `06-012` = Cincinnati region, team #12.  `40-001` = first hybrid team.
//
// This is a shared constant (safe to import on client and server) so the same
// region table drives profile selectors, admin UI, and server-side numbering.

// Standard geographic regions (codes 00-19). Order/codes come straight from the
// tournament numbering legend. Codes 20-39 are reserved for future regions.
// Names here match the signup region dropdown (USLocationsData.json `regionList`)
// exactly; codes come from the tournament numbering legend. This is the single
// source of truth for both the selector and RR-TTT numbering.
export const GEOGRAPHIC_REGIONS = [
  { code: "00", name: "Other" },
  { code: "01", name: "NY/NJ" },
  { code: "02", name: "DMV/BAL" },
  { code: "03", name: "Detroit, MI" },
  { code: "04", name: "Atlanta, GA" },
  { code: "05", name: "Columbus, OH" },
  { code: "06", name: "Cincinnati, OH" },
  { code: "07", name: "Chicago, IL" },
  { code: "08", name: "Dallas, TX" },
  { code: "09", name: "Austin, TX" },
  { code: "10", name: "Houston, TX" },
  { code: "11", name: "San Antonio, TX" },
  { code: "12", name: "New Orleans, LA" },
  { code: "13", name: "Las Vegas, NV" },
  { code: "14", name: "7-Cities / Richmond" },
  { code: "15", name: "Los Angeles, CA" },
  { code: "16", name: "Florida" },
  { code: "17", name: "CT/MAS/NH/VT (NE)" },
  { code: "18", name: "Birmingham, AL" },
  { code: "19", name: "PHIL / PA CITIES / DE" },
];

// Non-geographic classification buckets. `HYBRID` is a range (40-89) reserved
// for cross-region "alliance" teams; a team that mixes two regions is stamped
// with the range's base code and keeps its primary/secondary regions on record.
export const CLASSIFICATIONS = {
  GEOGRAPHIC: "geographic", // 00-39
  ALLIANCE: "alliance", //     40-89 (cross-region / hybrid)
  TEMPORARY: "temporary", //   90    (one-event partnerships)
  INTERNATIONAL: "international", // 91
  INVITATIONAL: "invitational", //  92 (guest / sponsor / celebrity / exhibition)
  HOUSE: "house", //           93    (tournament-created fill-in)
  PROVISIONAL: "provisional", //    94 (awaiting permanent regional assignment)
  ADMIN: "admin", //           99    (internal test / demo / admin)
};

// Base codes for the non-geographic buckets.
export const CLASSIFICATION_CODES = {
  [CLASSIFICATIONS.ALLIANCE]: "40",
  [CLASSIFICATIONS.TEMPORARY]: "90",
  [CLASSIFICATIONS.INTERNATIONAL]: "91",
  [CLASSIFICATIONS.INVITATIONAL]: "92",
  [CLASSIFICATIONS.HOUSE]: "93",
  [CLASSIFICATIONS.PROVISIONAL]: "94",
  [CLASSIFICATIONS.ADMIN]: "99",
};

export const DEFAULT_REGION_CODE = "00"; // "Other" — fallback when unset

const GEOGRAPHIC_CODES = new Set(GEOGRAPHIC_REGIONS.map((r) => r.code));
const REGION_NAME_BY_CODE = new Map(
  GEOGRAPHIC_REGIONS.map((r) => [r.code, r.name])
);

// Normalizes a name for tolerant matching: lowercased, punctuation/whitespace
// collapsed. Lets "PHIL / PA CITIES", "phil/pa cities", etc. all resolve alike.
function normalizeName(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

const CODE_BY_REGION_NAME = new Map(
  GEOGRAPHIC_REGIONS.map((r) => [normalizeName(r.name), r.code])
);

// Accepts a region value that may be either an already-canonical 2-digit code
// or a human region name (as older accounts / the signup dropdown may store),
// and returns the 2-digit code. Falls back to "00" (Other) when unrecognized.
export function resolveRegionCode(value) {
  if (value == null) return DEFAULT_REGION_CODE;
  const raw = String(value).trim();
  if (!raw) return DEFAULT_REGION_CODE;
  // Already a code (any 2+ digit numeric classification code).
  if (/^\d{2,}$/.test(raw)) return raw.padStart(2, "0");
  const byName = CODE_BY_REGION_NAME.get(normalizeName(raw));
  return byName ?? DEFAULT_REGION_CODE;
}

export function pad2(n) {
  return String(n).padStart(2, "0");
}

export function pad3(n) {
  return String(n).padStart(3, "0");
}

// A code counts as "geographic" if it's one of the known 00-19 regions or falls
// in the reserved-future geographic band (20-39).
export function isGeographicCode(code) {
  if (GEOGRAPHIC_CODES.has(code)) return true;
  const n = Number(code);
  return Number.isInteger(n) && n >= 0 && n <= 39;
}

export function regionName(code) {
  if (REGION_NAME_BY_CODE.has(code)) return REGION_NAME_BY_CODE.get(code);
  const n = Number(code);
  if (n >= 40 && n <= 89) return "Alliance / Hybrid";
  if (code === "90") return "Temporary Partnership";
  if (code === "91") return "International";
  if (code === "92") return "Invitational / Sponsored";
  if (code === "93") return "House Team";
  if (code === "94") return "Provisional";
  if (code === "99") return "Administrative / Test";
  return "Unknown";
}

// `RR-TTT`
export function formatDisplayId(regionCode, teamNumber) {
  return `${pad2(regionCode)}-${pad3(teamNumber)}`;
}
