"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import api from "@/utils/axios";
import { toast } from "react-hot-toast";
import { ArrowLeft, Calendar, MapPin, Users, Trophy } from "lucide-react";
import GameScheduleBadge from "@/components/ui/tournaments/GameScheduleBadge";
import { compareByScheduledAt } from "@/utils/gameSchedule";

export default function TournamentDetailsPage() {
  const params = useParams();
  const tournamentId = params?.tournamentId;

  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) return;

    async function fetchTournamentDetails() {
      try {
        const res = await api.get(`/api/tournaments/${tournamentId}`);
        setTournament(res.data);
      } catch (error) {
        toast.error("Failed to load tournament details");
        console.error("Error fetching tournament:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTournamentDetails();
  }, [tournamentId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--accent-color)]"></div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-lg">Tournament not found</p>
      </div>
    );
  }

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString() : "N/A";
  const formatTime = (date) =>
    date
      ? new Date(date).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "N/A";

  const getStatusColor = () => {
    switch (tournament.status) {
      case "completed":
        return "var(--success-color)";
      case "ongoing":
        return "var(--info-color)";
      case "upcoming":
        return "var(--accent-color)";
      default:
        return "var(--accent-color)";
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "owner":
        return "bg-purple-600";
      case "organizer":
        return "bg-blue-600";
      case "manager":
        return "bg-green-600";
      case "support":
        return "bg-gray-600";
      default:
        return "bg-gray-600";
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => window.history.back()}
        className="flex items-center gap-2 mb-6 text-[var(--accent-color)] hover:underline"
      >
        <ArrowLeft size={20} />
        Back to Dashboard
      </button>

      {/* Tournament Banner */}
      {tournament.bannerUrl && (
        <div className="relative w-full h-64 md:h-80 rounded-xl overflow-hidden mb-8">
          <img
            src={tournament.bannerUrl}
            alt={tournament.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex items-start justify-between">
              <div>
                <h1
                  className="text-3xl md:text-4xl font-bold text-white mb-2"
                  style={{ color: "white" }}
                >
                  {tournament.name}
                </h1>
                <span
                  className="inline-block px-4 py-2 text-sm rounded-full font-semibold text-white"
                  style={{ backgroundColor: getStatusColor() }}
                >
                  {tournament.status?.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tournament Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Description */}
          {tournament.description && (
            <div
              className="p-6 rounded-xl"
              style={{ backgroundColor: "var(--card-background)" }}
            >
              <h2
                className="text-xl font-bold mb-4"
                style={{ color: "var(--accent-color)" }}
              >
                About Tournament
              </h2>
              <p className="text-gray-300">{tournament.description}</p>
            </div>
          )}

          {/* Games Section */}
          {tournament.games && tournament.games.length > 0 && (
            <div
              className="p-6 rounded-xl"
              style={{ backgroundColor: "var(--card-background)" }}
            >
              <h2
                className="text-xl font-bold mb-4 flex items-center gap-2"
                style={{ color: "var(--accent-color)" }}
              >
                <Trophy size={24} />
                Games & Competitions
              </h2>
              <div className="space-y-4">
                {[...tournament.games]
                  .sort(compareByScheduledAt)
                  .map((game, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg border border-gray-700 hover:border-[var(--accent-color)] transition"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {game.game?.name || `Game ${index + 1}`}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {game.game?.icon || "No icon"}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-3 py-1 text-xs rounded bg-[var(--info-color)] text-white">
                          {game.tournamentTeamType || "N/A"}
                        </span>
                      </div>
                    </div>

                    {/* When this game is played */}
                    <GameScheduleBadge
                      value={game.scheduledAt}
                      variant="stacked"
                      className="mb-3"
                    />

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-400">Format:</span>{" "}
                        <span className="font-semibold">
                          {game.format
                            ? game.format
                                .split("_")
                                .map((w) => w[0].toUpperCase() + w.slice(1))
                                .join(" ")
                            : "N/A"}
                        </span>
                      </div>
                      {game.format === "mesh" && (
                        <div>
                          <span className="text-gray-400">Rounds:</span>{" "}
                          <span className="font-semibold">
                            {game.meshRounds || "N/A"}
                          </span>
                        </div>
                      )}
                      {game.format === "standard" && (
                        <>
                          <div>
                            <span className="text-gray-400">Rounds:</span>{" "}
                            <span className="font-semibold">
                              {game.standardRounds || "Indefinite"}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Away moves:</span>{" "}
                            <span className="font-semibold">
                              {game.standardDirection === "down" ? "Down" : "Up"}
                            </span>
                          </div>
                        </>
                      )}
                      {["round_robin", "mesh", "standard"].includes(game.format) && (
                        <div>
                          <span className="text-gray-400">Ranked by:</span>{" "}
                          <span className="font-semibold">
                            {game.winCriteria === "hands"
                              ? "Most Hands"
                              : game.winCriteria === "points"
                              ? "Most Points"
                              : "Most Wins"}
                          </span>
                        </div>
                      )}
                      {game.format === "single_elimination" &&
                        game.rewardByeType &&
                        game.rewardByeType !== "none" && (
                          <div>
                            <span className="text-gray-400">Reward Bye:</span>{" "}
                            <span className="font-semibold">
                              {game.rewardByeType
                                .split("_")
                                .map((w) => w[0].toUpperCase() + w.slice(1))
                                .join(" ")}
                            </span>
                          </div>
                        )}
                      <div>
                        <span className="text-gray-400">Team Based:</span>{" "}
                        <span className="font-semibold">
                          {game.teamBased ? "Yes" : "No"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Status:</span>{" "}
                        <span className="font-semibold">
                          {game.status || "Active"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tournament Staff */}
          {tournament.staff && tournament.staff.length > 0 && (
            <div
              className="p-6 rounded-xl"
              style={{ backgroundColor: "var(--card-background)" }}
            >
              <h2
                className="text-xl font-bold mb-4 flex items-center gap-2"
                style={{ color: "var(--accent-color)" }}
              >
                <Users size={24} />
                Tournament Staff
              </h2>
              <div className="space-y-3">
                {tournament.staff.map((member) => (
                  <div
                    key={member.user?._id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--accent-color)] flex items-center justify-center font-bold">
                        {member.user?.name?.charAt(0) || "U"}
                      </div>
                      <div>
                        <h4 className="font-semibold">{member.user?.name || "Unknown"}</h4>
                        <p className="text-sm text-gray-400">{member.user?.email || ""}</p>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs rounded-full font-semibold text-white ${getRoleBadgeColor(
                        member.role
                      )}`}
                    >
                      {member.role?.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Info */}
          <div
            className="p-6 rounded-xl"
            style={{ backgroundColor: "var(--card-background)" }}
          >
            <h2
              className="text-xl font-bold mb-4"
              style={{ color: "var(--accent-color)" }}
            >
              Tournament Info
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin size={20} className="text-[var(--accent-color)] mt-1" />
                <div>
                  <p className="text-sm text-gray-400">Location</p>
                  <p className="font-semibold">{tournament.location || "N/A"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar size={20} className="text-[var(--accent-color)] mt-1" />
                <div>
                  <p className="text-sm text-gray-400">Start Date</p>
                  <p className="font-semibold">{formatDate(tournament.startDate)}</p>
                  <p className="text-sm text-gray-500">{formatTime(tournament.startDate)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar size={20} className="text-[var(--accent-color)] mt-1" />
                <div>
                  <p className="text-sm text-gray-400">End Date</p>
                  <p className="font-semibold">{formatDate(tournament.endDate)}</p>
                  <p className="text-sm text-gray-500">{formatTime(tournament.endDate)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users size={20} className="text-[var(--accent-color)] mt-1" />
                <div>
                  <p className="text-sm text-gray-400">Visibility</p>
                  <p className="font-semibold">
                    {tournament.isPublic ? "Public" : "Private"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              className="w-full py-3 rounded-lg font-semibold transition hover:scale-[1.01]"
              style={{
                backgroundColor: "var(--accent-color)",
                color: "var(--background)",
              }}
            >
              Contact Support
            </button>
            <button
              className="w-full py-3 rounded-lg font-semibold border border-[var(--accent-color)] text-[var(--accent-color)] hover:bg-[var(--accent-color)] hover:text-[var(--background)] transition"
            >
              View Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
