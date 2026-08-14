// Helpers for a tournament game's scheduled date/time
// (Tournament.games[].scheduledAt). Kept plain so the admin tables, the player
// cards and the registration screens all format the same value identically.

const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// "2026-08-09T18:30" -- exactly what <input type="datetime-local"> expects.
// Built from local parts rather than toISOString() so the admin always sees
// back the wall-clock time they typed in.
export function toDateTimeLocalInput(value) {
  const date = toDate(value);
  if (!date) return "";

  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

// Returns null when nothing is scheduled, so callers can render their own
// "TBA" placeholder instead of a fake date.
export function formatGameSchedule(value) {
  const date = toDate(value);
  if (!date) return null;

  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const day = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return {
    date: day,
    dateWithYear: date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    weekday: date.toLocaleDateString(undefined, { weekday: "short" }),
    time,
    short: `${day} · ${time}`,
    full: `${date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })} · ${time}`,
    isPast: date.getTime() < Date.now(),
    iso: date.toISOString(),
  };
}

// Sort comparator for a tournament's games: scheduled ones first, earliest to
// latest, with anything still unscheduled pushed to the end.
export function compareByScheduledAt(a, b) {
  const aTime = toDate(a?.scheduledAt)?.getTime() ?? Infinity;
  const bTime = toDate(b?.scheduledAt)?.getTime() ?? Infinity;
  return aTime - bTime;
}

// One-line text version for tables / tooltips / plain lists.
export function formatGameScheduleText(value, fallback = "Schedule TBA") {
  return formatGameSchedule(value)?.full || fallback;
}
