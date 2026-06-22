"use client";

import Link from "next/link";
import TournamentGameList from "./TournamentGameList";

export default function TournamentCard({
  _id,
  name,
  games,
  startDate,
  endDate,
  location,
  bannerUrl,
  description,
  status,
  selectedId,
  onSelect,
}) {
  const isSelected = selectedId === _id;

  const getStatusColor = () => {
    switch (status) {
      case "completed":
        return "var(--success-color)";
      case "ongoing":
        return "var(--info-color)";
      case "upcoming":
        return "var(--accent-color)";
      // default:
      //   return "var(--accent-color)";
    }
  };

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString() : "N/A";
  const formatTime = (date) =>
    date
      ? new Date(date).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "N/A";

  return (
    <div
      className=" flex flex-col sm:flex-row rounded-xl overflow-hidden shadow-lg hover:scale-[1.01] transition-transform border border-gray-700"
      style={{ backgroundColor: "var(--card-background)" }}
    >
      {/* Image */}
      <img
        src={bannerUrl}
        alt={name || "Tournament banner"}
        className="w-full sm:w-1/3 h-48 sm:h-full object-cover"
      />

      {/* Content */}
      <div className="flex-1 p-6 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start flex-wrap gap-2">
            <h2 className="text-xl font-bold">{name}</h2>
            <span
              className="inline-block mt-1 px-3 py-1 text-xs rounded-full font-semibold"
              style={{
                backgroundColor: getStatusColor(),
                color: "var(--background)",
              }}
            >
              {status?.toUpperCase()}
            </span>

        </div>

        {/* Description */}
        {description && (
          <p className="text-gray-400 text-sm line-clamp-3">{description}</p>
        )}

        {/* Details */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm text-gray-300">
          <p>
            📍 <strong>Location:</strong> {location || ""}
          </p>
          <p>
            📅 <strong>Start:</strong> {formatDate(startDate)}
          </p>
          <p>
            📅 <strong>End:</strong> {formatDate(endDate)}
          </p>
        </div>

        {/* Games */}
        <TournamentGameList games={games || []} />

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-3">
          {status === "upcoming" ? (
            // ✅ Show Register Now only for upcoming
            <Link
              href={`/dashboard/game-registration/${_id}`}
              className="flex-1"
            >
              <button
                onClick={() => onSelect(_id)}
                className="w-full py-2 rounded-lg font-semibold transition hover:scale-[1.01]"
                style={{
                  backgroundColor: isSelected
                    ? "var(--primary-hover)"
                    : "var(--accent-color)",
                  color: isSelected ? "var(--foreground)" : "var(--background)",
                }}
              >
                Register Now
              </button>
            </Link>
          ) : status === "ongoing" ? (
            // ✅ Show Play Tournament for ongoing
            <div className="w-full">
              <Link href={`/dashboard/game-play/${_id}`} className="flex-1">
                <button
                  onClick={() => onSelect(_id)}
                  className="w-full py-2 rounded-lg font-semibold transition hover:scale-[1.01] hover:bg[]"
                  style={{
                    backgroundColor: "var(--info-color)",
                    color: "white",
                  }}
                >
                  Play Tournament
                </button>
              </Link>

              <p className="mt-3 text-sm text-center text-[var(--accent-color)]">
                Online registration is closed. Please Contact to the tournament
                director.
              </p>
            </div>
          ) : (
            // ✅ Default: View Tournament
            <Link href={`/dashboard/game-score/${_id}`} className="flex-1">
              <button
                onClick={() => onSelect(_id)}
                className="w-full py-2 rounded-lg font-semibold transition hover:scale-[1.01]"
                style={{
                  backgroundColor: "var(--success-color)",
                  color: "white",
                }}
              >
                View ScoreBoard
              </button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
