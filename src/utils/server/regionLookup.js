import { Region } from "@/models/Region";
import { resolveRegionCode, DEFAULT_REGION_CODE } from "@/constants/regions";

// Async, DB-aware region name -> code resolution. Tries the fast synchronous
// path first (covers the 20 built-in regions with zero DB hit, and passes
// already-numeric codes through untouched); falls back to looking up
// admin-added regions (codes 20-39, see src/models/Region.js) by name.
// Defaults to "00" if still unmatched, same as the sync resolveRegionCode.
export async function resolveRegionCodeAsync(value) {
  if (value == null) return DEFAULT_REGION_CODE;
  const raw = String(value).trim();
  if (!raw) return DEFAULT_REGION_CODE;
  if (/^\d{2,}$/.test(raw)) return raw.padStart(2, "0");

  const syncCode = resolveRegionCode(raw);
  if (syncCode !== DEFAULT_REGION_CODE) return syncCode;

  const region = await Region.findOne({ name: raw });
  return region?.code || DEFAULT_REGION_CODE;
}
