"use client";
import { useEffect, useState, useRef } from "react";
import api from "@/utils/axios";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function ReceivedRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [selectedTournament, setSelectedTournament] = useState("all");
  const [selectedGame, setSelectedGame] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const prevRequestsRef = useRef([]);
  const router = useRouter();

  // Load user and requests
  const loadData = async () => {
    try {
      const resUser = await api.get("/api/me");
      const id = resUser.data?.data?.user?._id;
      setUserId(id);

      const resRequests = await api.get("/api/teamup");
      setRequests(resRequests.data?.data?.requests || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  // Periodically load requests
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);


  const updateRequest = async (id, status) => {
    try {
      await api.patch(`/api/teamup/${id}`, { status });
      toast.success(
        status === "accepted" ? "Request accepted!" : "Request rejected"
      );
      setRequests((prev) =>
        prev.map((req) => (req._id === id ? { ...req, status } : req))
      );
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || `Failed to ${status} request`);
    }
  };

  const formatDate = (isoString) => new Date(isoString).toLocaleString();

  if (loading) return <p className="p-6 text-center">Loading requests...</p>;

  // Only requests sent TO the current user
  const receivedRequests = requests.filter((r) => r.to?._id === userId);

  // Unique tournaments and games for filters
  const tournaments = [
    ...new Set(receivedRequests.map((r) => r.tournament?.name || "Unknown")),
  ];
  const games = [
    ...new Set(
      receivedRequests.flatMap((r) => (r.games || []).map((g) => g.name))
    ),
  ];

  // Apply filters
  const filteredRequests = receivedRequests.filter((req) => {
    const tournamentName = req.tournament?.name || "Unknown";
    const gameNames = (req.games || []).map((g) => g.name);

    const matchesTournament =
      selectedTournament === "all" || selectedTournament === tournamentName;
    const matchesGame =
      selectedGame === "all" || gameNames.includes(selectedGame);
    const matchesSearch =
      req.from?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tournamentName.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesTournament && matchesGame && matchesSearch;
  });

  return (
    <div
      className="min-h-screen p-6"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <h1 className="text-2xl font-bold mb-6">Received Team Up Requests</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <select
          className="p-2 rounded bg-[var(--card-background)] border border-[var(--border-color)]"
          value={selectedTournament}
          onChange={(e) => setSelectedTournament(e.target.value)}
        >
          <option value="all">All Tournaments</option>
          {tournaments.map((t, i) => (
            <option key={i} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          className="p-2 rounded bg-[var(--card-background)] border border-[var(--border-color)]"
          value={selectedGame}
          onChange={(e) => setSelectedGame(e.target.value)}
        >
          <option value="all">All Games</option>
          {games.map((g, i) => (
            <option key={i} value={g}>
              {g}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search by username, message or tournament..."
          className="flex-1 p-2 rounded bg-[var(--card-background)] border border-[var(--border-color)]"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredRequests.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRequests.map((req) => (
            <div
              key={req._id}
              className="p-5 rounded-2xl shadow-md transition hover:shadow-lg"
              style={{
                background: "var(--card-background)",
                border: `1px solid var(--border-color)`,
              }}
            >
              <h3 className="font-semibold text-lg mb-2">
                {req.from?.firstname} {req.from?.lastname} ({req.from?.username})
              </h3>

              <p className="text-sm mb-1">
                <strong>Tournament: </strong> {req.tournament?.name || "Unknown"}
              </p>

              <div className="text-sm mb-2">
                <strong>Games: </strong>
                {req.fromGames?.length > 0 ? (
                  <ul className="list-disc list-inside">
                    {req.fromGames.map((g) => (
                      <li key={g._id} className="text-[var(--info-color)]">
                        {g.name} ({g.platform})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="opacity-70">No games</span>
                )}
              </div>

              {req.status === "pending" && (
                <p className="text-sm mb-2 italic">
                  {req.message || "wants to team up with you"}
                </p>
              )}

              <p className="text-sm capitalize mb-1">
                <span className="font-semibold">Status: </span>
                {req.status}
              </p>

              {req.status === "pending" && (
                <div className="flex gap-2 mt-2">
                  <button
                    className="flex-1 py-2 px-4 rounded-lg font-semibold"
                    style={{ background: "var(--success-color)", color: "white" }}
                    onClick={() => updateRequest(req._id, "accepted")}
                  >
                    Accept
                  </button>
                  <button
                    className="flex-1 py-2 px-4 rounded-lg font-semibold"
                    style={{ background: "var(--error-color)", color: "white" }}
                    onClick={() => updateRequest(req._id, "rejected")}
                  >
                    Reject
                  </button>
                </div>
              )}

              <p className="text-xs opacity-70 mt-3">
                <strong>Received:</strong> {formatDate(req.createdAt)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="opacity-70 text-sm">No requests found</p>
      )}
    </div>
  );
}
