"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "@/utils/axios";
import TournamentGameList from "./TournamentGameList";

// `gameConfigId` + `gameLabel` narrow this to cancelling just that one game
// instead of the whole tournament registration -- both the request payload
// and the copy shown adjust accordingly.
function CancelRegistrationModal({
  tournamentId,
  tournamentName,
  gameConfigId,
  gameLabel,
  onClose,
  onCancelled,
}) {
  const [submitting, setSubmitting] = useState(false);
  const isSingleGame = Boolean(gameConfigId);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const { data } = await api.post("/api/tournamentRegister/cancel", {
        tournamentId,
        ...(isSingleGame ? { gameConfigId } : {}),
      });
      const fullyCancelled = data?.data?.fullyCancelled ?? true;
      const refunded = data?.data?.registration?.refundStatus === "requested";
      toast.success(
        refunded
          ? "Registration cancelled. Your refund request has been sent to the organizers."
          : isSingleGame
            ? `Cancelled your registration for ${gameLabel}.`
            : "Registration cancelled."
      );
      onCancelled(fullyCancelled);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to cancel registration");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ backgroundColor: "var(--card-background)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-[var(--warning-color)]" />
            <h3 className="text-lg font-bold">
              {isSingleGame ? "Cancel This Game?" : "Cancel Registration?"}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-gray-300 mb-4">
          {isSingleGame ? (
            <>
              This will cancel your registration for <strong>{gameLabel}</strong> in{" "}
              <strong>{tournamentName}</strong>. Your registration for any other games in this
              tournament is not affected.
            </>
          ) : (
            <>This will cancel your registration for <strong>{tournamentName}</strong>, every game included.</>
          )}{" "}
          If you&apos;ve already paid, the organizers will be notified to sort out a refund.
          This cannot be undone from here -- you&apos;d need to register again while
          registration is still open.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-2 rounded-lg font-semibold disabled:opacity-60"
            style={{ backgroundColor: "var(--secondary-color)", color: "var(--foreground)" }}
          >
            Keep Registration
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-1 py-2 rounded-lg font-semibold disabled:opacity-60"
            style={{ backgroundColor: "var(--error-color)", color: "white" }}
          >
            {submitting ? "Cancelling..." : "Confirm Cancellation"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Payment-verification badge is a second, separate indicator from the
// tournament lifecycle badge above it -- see the "My Tournaments -
// Registration Status Design" spec. Only meaningful for a player's own
// registration, not for staff/organizer views.
function PaymentStatusBadge({ paymentStatus }) {
  if (!["pending", "paid", "rejected"].includes(paymentStatus)) return null;
  const bg =
    paymentStatus === "pending"
      ? "var(--error-color)"
      : paymentStatus === "rejected"
        ? "var(--warning-color)"
        : "var(--success-color)";
  const label =
    paymentStatus === "pending"
      ? "PENDING VERIFICATION"
      : paymentStatus === "rejected"
        ? "REGISTRATION REJECTED"
        : "PAID IN FULL";
  return (
    <span
      className="inline-block px-3 py-1 text-xs rounded-full font-semibold"
      style={{ backgroundColor: bg, color: "white" }}
    >
      {label}
    </span>
  );
}

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
  userRole, // New prop to indicate if user is organizer/owner/admin
  paymentStatus, // "pending" | "paid" -- player registrations only
  registeredGameConfigIds, // Which tournament games this player signed up for -- player registrations only
  registrationCancelled, // Seeds the cancelled state from the server
  onCancelled, // Optional: parent can refetch its list after a cancellation
}) {
  const isSelected = selectedId === _id;
  // null = no modal open. {} = cancelling the whole tournament registration.
  // { gameConfigId, gameLabel } = cancelling just that one game.
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelled, setCancelled] = useState(!!registrationCancelled);
  const isPlayerRole = userRole === "player";
  const isCompleted = status === "completed";
  // Completed tournaments are archived/view-only for staff/public viewers:
  // greyed out and fully non-interactive, pointer-events-none belt-and-braces
  // on top of not rendering any action buttons. Players get an active "View
  // Results" button instead (handled in the player branch below), since
  // that's still a real thing they'd want to click.
  const greyOutCompleted = isCompleted && !isPlayerRole;

  const getStatusColor = () => {
    switch (status) {
      case "completed":
        return "var(--success-color)";
      case "ongoing":
        return "var(--info-color)";
      case "upcoming":
        return "var(--accent-color)";
      case "registration_closed":
        return "var(--warning-color)";
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

  const handleCancelled = (fullyCancelled) => {
    setCancelTarget(null);
    // Only the whole card flips to "Registration Cancelled" when nothing is
    // left registered -- dropping one game out of several just needs the
    // parent to refetch so the per-game tags below update.
    if (fullyCancelled) setCancelled(true);
    onCancelled?.(_id);
  };

  return (
    <div
      className={`flex flex-col sm:flex-row rounded-xl overflow-hidden shadow-lg transition-transform border border-gray-700 ${
        greyOutCompleted
          ? "opacity-60 grayscale pointer-events-none select-none"
          : "hover:scale-[1.01]"
      }`}
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
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-block mt-1 px-3 py-1 text-xs rounded-full font-semibold"
                style={{
                  backgroundColor: getStatusColor(),
                  color: "var(--background)",
                }}
              >
                {status?.toUpperCase()}
              </span>
              {isPlayerRole && !cancelled && <PaymentStatusBadge paymentStatus={paymentStatus} />}
            </div>

        </div>

        {isPlayerRole && !cancelled && paymentStatus === "rejected" && (
          <p className="text-xs text-[var(--muted-foreground)]">
            Contact your tournament director for next steps.
          </p>
        )}

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
        <TournamentGameList
          games={games || []}
          // Once the whole registration is cancelled, none of these games
          // are actually registered anymore -- don't keep showing stale
          // "Registered" tags from before the cancellation.
          registeredGameConfigIds={isPlayerRole && !cancelled ? registeredGameConfigIds : null}
          paymentStatus={isPlayerRole && !cancelled ? paymentStatus : null}
          onCancelGame={
            isPlayerRole && !cancelled && status === "upcoming"
              ? (gameConfigId, gameLabel) => setCancelTarget({ gameConfigId, gameLabel })
              : null
          }
        />

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-3">
          {cancelled ? (
            <div className="w-full flex flex-col sm:flex-row gap-3">
              <div
                className="flex-1 py-2 rounded-lg font-semibold text-center"
                style={{ backgroundColor: "var(--border-color)", color: "var(--foreground)" }}
              >
                Registration Cancelled
              </div>
              {/* Cancelling starts a clean slate server-side (see
                  createOrUpdateRegistration) -- submitting here always comes
                  back as a fresh "pending" registration for whatever games
                  are picked, never merged with the cancelled ones. Only
                  offered while the tournament is still open for signups. */}
              {status === "upcoming" && (
                <Link href={`/dashboard/game-registration/${_id}`} className="flex-1">
                  <button
                    className="w-full py-2 rounded-lg font-semibold transition hover:scale-[1.01]"
                    style={{ backgroundColor: "var(--accent-color)", color: "var(--background)" }}
                  >
                    Register Again
                  </button>
                </Link>
              )}
            </div>
          ) : greyOutCompleted ? (
            <div
              className="w-full py-2 rounded-lg font-semibold text-center"
              style={{
                backgroundColor: "var(--border-color)",
                color: "var(--foreground)",
              }}
            >
              🏁 Tournament Completed
            </div>
          ) : userRole && userRole !== "player" ? (
            // ✅ Show View Details for organizers/admins/staff
            <>
              <Link href={`/dashboard/tournament-details/${_id}`} className="flex-1">
                <button
                  onClick={() => onSelect(_id)}
                  className="w-full py-2 rounded-lg font-semibold transition hover:scale-[1.01]"
                  style={{
                    backgroundColor: "var(--info-color)",
                    color: "white",
                  }}
                >
                  View Details
                </button>
              </Link>

              {status === "ongoing" && (
                // ✅ Staff/admins can also play & manually score any game
                <Link href={`/dashboard/game-play/${_id}`} className="flex-1">
                  <button
                    onClick={() => onSelect(_id)}
                    className="w-full py-2 rounded-lg font-semibold transition hover:scale-[1.01]"
                    style={{
                      backgroundColor: "var(--success-color)",
                      color: "white",
                    }}
                  >
                    Play / Manage Scores
                  </button>
                </Link>
              )}
            </>
          ) : isPlayerRole ? (
            // Player button behavior keys off BOTH tournament status and
            // payment-verification status, per the "Player-facing button
            // behavior" table in the design spec.
            status === "completed" ? (
              <Link href={`/dashboard/game-score/${_id}`} className="flex-1">
                <button
                  onClick={() => onSelect(_id)}
                  className="w-full py-2 rounded-lg font-semibold transition hover:scale-[1.01]"
                  style={{
                    backgroundColor: "var(--success-color)",
                    color: "white",
                  }}
                >
                  View Results
                </button>
              </Link>
            ) : status === "ongoing" ? (
              <Link href={`/dashboard/game-play/${_id}`} className="flex-1">
                <button
                  onClick={() => onSelect(_id)}
                  className="w-full py-2 rounded-lg font-semibold transition hover:scale-[1.01]"
                  style={{
                    backgroundColor: "var(--info-color)",
                    color: "white",
                  }}
                >
                  Enter Tournament
                </button>
              </Link>
            ) : paymentStatus === "rejected" ? (
              // Rejected registrations don't get the pending/upcoming
              // "register for more games" flow -- the badge and note above
              // already explain what happened, this is just a way back to
              // the tournament itself.
              <Link href={`/dashboard/tournament-details/${_id}`} className="flex-1">
                <button
                  className="w-full py-2 rounded-lg font-semibold transition hover:scale-[1.01]"
                  style={{ backgroundColor: "var(--secondary-color)", color: "var(--foreground)" }}
                >
                  View Tournament
                </button>
              </Link>
            ) : paymentStatus === "pending" ? (
              <div className="w-full flex flex-col gap-2">
                <Link href={`/dashboard/game-registration/${_id}`} className="w-full">
                  <button
                    className="w-full py-2 rounded-lg font-semibold transition hover:scale-[1.01]"
                    style={{ backgroundColor: "var(--secondary-color)", color: "var(--foreground)" }}
                  >
                    View / Register for Games
                  </button>
                </Link>
                {status === "upcoming" && (
                  <button
                    onClick={() => setCancelTarget({})}
                    className="text-xs text-center text-[var(--muted-foreground)] hover:text-[var(--error-color)] underline"
                  >
                    Cancel Registration
                  </button>
                )}
              </div>
            ) : status === "upcoming" ? (
              <div className="w-full flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href={`/dashboard/tournament-details/${_id}`} className="flex-1">
                    <button
                      className="w-full py-2 rounded-lg font-semibold transition hover:scale-[1.01]"
                      style={{ backgroundColor: "var(--success-color)", color: "white" }}
                    >
                      View Tournament
                    </button>
                  </Link>
                  {/* Registration stays open for additional games right up until
                      the tournament starts, no matter this player's existing
                      games are already approved -- this is the only way back to
                      that page once payment on the first batch is verified. */}
                  <Link href={`/dashboard/game-registration/${_id}`} className="flex-1">
                    <button
                      className="w-full py-2 rounded-lg font-semibold transition hover:scale-[1.01]"
                      style={{ backgroundColor: "var(--secondary-color)", color: "var(--foreground)" }}
                    >
                      Register for More Games
                    </button>
                  </Link>
                </div>
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="text-xs text-center text-[var(--muted-foreground)] hover:text-[var(--error-color)] underline"
                >
                  Cancel Registration
                </button>
              </div>
            ) : (
              // registration_closed -- past the point of self-service cancel
              <div className="w-full">
                <Link href={`/dashboard/tournament-details/${_id}`} className="w-full">
                  <button
                    className="w-full py-2 rounded-lg font-semibold transition hover:scale-[1.01]"
                    style={{ backgroundColor: "var(--success-color)", color: "white" }}
                  >
                    View Tournament
                  </button>
                </Link>
                <p className="mt-2 text-xs text-center text-[var(--muted-foreground)]">
                  Registration is closed. Contact the tournament director for changes.
                </p>
              </div>
            )
          ) : status === "upcoming" ? (
            // ✅ Show Register Now only for upcoming regular users
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
          ) : status === "ongoing" || status === "registration_closed" ? (
            // ✅ Registration closed -- for ongoing/registration_closed tournaments the user isn't part of
            <div className="w-full">
              <button
                disabled
                className="w-full py-2 rounded-lg font-semibold cursor-not-allowed opacity-50"
                style={{
                  backgroundColor: "var(--info-color)",
                  color: "white",
                }}
              >
                {status === "ongoing" ? "Play Tournament" : "Registration Closed"}
              </button>

              <p className="mt-3 text-sm text-center text-[var(--accent-color)]">
                Online registration is closed. Please contact the tournament
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

      {cancelTarget && (
        <CancelRegistrationModal
          tournamentId={_id}
          tournamentName={name}
          gameConfigId={cancelTarget.gameConfigId}
          gameLabel={cancelTarget.gameLabel}
          onClose={() => setCancelTarget(null)}
          onCancelled={handleCancelled}
        />
      )}
    </div>
  );
}
