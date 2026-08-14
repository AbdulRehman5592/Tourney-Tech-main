"use client";

import { CalendarClock, Clock } from "lucide-react";
import { formatGameSchedule } from "@/utils/gameSchedule";

/**
 * Shows when a tournament game is played.
 *
 * variant:
 *  - "chip"    compact pill, good next to a game name
 *  - "inline"  one muted line, good inside dense lists / tables
 *  - "stacked" boxed date + time block, good on detail pages and cards
 */
export default function GameScheduleBadge({
  value,
  variant = "chip",
  fallback = "Schedule TBA",
  className = "",
}) {
  const schedule = formatGameSchedule(value);

  // Nothing scheduled yet -- say so plainly rather than rendering an empty gap.
  if (!schedule) {
    if (variant === "stacked") {
      return (
        <div
          className={`flex items-center gap-3 rounded-lg border border-dashed px-3 py-2 text-sm text-gray-400 ${className}`}
          style={{ borderColor: "var(--border-color)" }}
        >
          <CalendarClock size={16} className="shrink-0" />
          <span>{fallback}</span>
        </div>
      );
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs text-gray-400 ${className}`}
      >
        <CalendarClock size={13} className="shrink-0" />
        {fallback}
      </span>
    );
  }

  // Played dates stay readable but step back visually so the next game pops.
  const accent = schedule.isPast ? "var(--border-color)" : "var(--accent-color)";

  if (variant === "inline") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs whitespace-nowrap ${className}`}
        style={{ color: schedule.isPast ? "#9CA3AF" : "var(--accent-color)" }}
        title={schedule.full}
      >
        <CalendarClock size={13} className="shrink-0" />
        {schedule.weekday}, {schedule.date} · {schedule.time}
      </span>
    );
  }

  if (variant === "stacked") {
    return (
      <div
        className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${className}`}
        style={{
          borderColor: accent,
          backgroundColor: "color-mix(in srgb, var(--accent-color) 8%, transparent)",
        }}
        title={schedule.full}
      >
        <div
          className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-md text-[10px] font-bold uppercase leading-none"
          style={{ backgroundColor: accent, color: "var(--background)" }}
        >
          <span>{schedule.date.split(" ")[0]}</span>
          <span className="mt-0.5 text-sm leading-none">
            {schedule.date.split(" ")[1]}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-gray-400">
            {schedule.isPast ? "Played" : "Scheduled"}
          </p>
          <p className="truncate text-sm font-semibold">
            {schedule.weekday}, {schedule.dateWithYear}
          </p>
          <p className="flex items-center gap-1 text-xs text-gray-300">
            <Clock size={12} className="shrink-0" />
            {schedule.time}
          </p>
        </div>
      </div>
    );
  }

  // "chip"
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap ${className}`}
      style={{
        borderColor: accent,
        color: schedule.isPast ? "#9CA3AF" : "var(--accent-color)",
        backgroundColor:
          "color-mix(in srgb, var(--accent-color) 10%, transparent)",
      }}
      title={schedule.full}
    >
      <CalendarClock size={13} className="shrink-0" />
      {schedule.weekday}, {schedule.date} · {schedule.time}
    </span>
  );
}
