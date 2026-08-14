import { ApiError } from "./ApiError";

// A tournament game's scheduledAt arrives as an ISO string from the admin form.
// Blank/null is a legitimate value -- it means "not scheduled yet" -- but a
// malformed date must fail loudly instead of being cast into an Invalid Date.
export function parseScheduledAt(value) {
  if (value === undefined || value === null || value === "") return null;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, "Invalid game date and time");
  }

  return date;
}
