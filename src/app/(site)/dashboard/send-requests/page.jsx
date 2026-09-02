"use client";
import { useEffect, useState } from "react";
import api from "@/utils/axios";
import { toast } from "react-hot-toast";
import { GENDER_COLORS } from "@/constants/genderColors";

const MODE_LABELS = { team: "Team Up", doubles: "Doubles", mixed_doubles: "Mixed Doubles" };

function PaymentForm({ req, onSubmitted }) {
  const [method, setMethod] = useState(req.payment?.method || "cash");
  const [transactionId, setTransactionId] = useState(req.payment?.transactionId || "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("method", method);
      if (transactionId) formData.append("transactionId", transactionId);
      await api.patch(`/api/teamup/${req._id}/payment`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Payment submitted, awaiting admin approval");
      onSubmitted?.();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to submit payment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-2 flex flex-col gap-2">
      <select
        value={method}
        onChange={(e) => setMethod(e.target.value)}
        className="p-2 rounded bg-[var(--background)] border border-[var(--border-color)]"
      >
        <option value="cash">Cash</option>
        <option value="online">Online</option>
      </select>
      {method === "online" && (
        <input
          type="text"
          placeholder="Transaction ID"
          value={transactionId}
          onChange={(e) => setTransactionId(e.target.value)}
          className="p-2 rounded bg-[var(--background)] border border-[var(--border-color)]"
        />
      )}
      <button
        type="button"
        disabled={submitting}
        onClick={handleSubmit}
        className="py-2 px-4 rounded-lg font-semibold disabled:opacity-50"
        style={{ background: "var(--accent-color)", color: "black" }}
      >
        {req.payment?.paid ? "Resubmit Payment" : "Submit Payment"}
      </button>
    </div>
  );
}

export default function SentRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  // Filters
  const [selectedTournament, setSelectedTournament] = useState("all");
  const [selectedGame, setSelectedGame] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Load user and requests
  const fetchRequests = async () => {
    try {
      const resUser = await api.get("/api/me");
      const id = resUser.data?.data?.user?._id;
      setUserId(id);

      const res = await api.get("/api/teamup");
      const data = res.data?.data?.requests || [];
      setRequests(data);
    } catch (err) {
      console.error("❌ Failed to fetch requests:", err);
      toast.error("Failed to load requests");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 5000);
    return () => clearInterval(interval);
  }, []);

  const dropPartner = async (id) => {
    if (!window.confirm("Drop this partner? This cannot be undone.")) return;
    try {
      await api.delete(`/api/teamup/${id}`);
      toast.success("Partner dropped");
      setRequests((prev) => prev.filter((req) => req._id !== id));
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to drop partner");
    }
  };

  if (loading || !userId)
    return <p className="p-6 text-center">Loading requests...</p>;

  // Filter only sent requests (where I am "from")
  const sentRequests = requests.filter((r) => r.from?._id === userId);

  // Unique tournaments
  const tournaments = [
    ...new Set(sentRequests.map((r) => r.tournament?.name || "Unknown")),
  ];

  // Unique games
  const games = [
    ...new Set(sentRequests.map((r) => r.game?.name).filter(Boolean)),
  ];

  // Apply filters + search
  const filteredRequests = sentRequests.filter((req) => {
    const tournamentName = req.tournament?.name || "Unknown";

    const matchesTournament =
      selectedTournament === "all" || selectedTournament === tournamentName;

    const matchesGame =
      selectedGame === "all" || req.game?.name === selectedGame;

    const matchesSearch =
      req.to?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tournamentName?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesTournament && matchesGame && matchesSearch;
  });

  const formatDate = (isoString) => new Date(isoString).toLocaleString();

  return (
    <div
      className="min-h-screen p-6"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <h1 className="text-2xl font-bold mb-6">Sent Team Up Requests</h1>

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
              className="p-5 rounded-2xl shadow-md"
              style={{
                background: "var(--card-background)",
                border: `1px solid var(--border-color)`,
              }}
            >
              {/* Recipient */}
              <h3 className="font-semibold text-lg mb-2">
                To:{" "}
                <span style={{ color: GENDER_COLORS[req.to?.gender] || "inherit" }}>
                  {req.to?.firstname} {req.to?.lastname} ({req.to?.username})
                </span>
              </h3>

              {req.mode && (
                <span className="inline-block mb-2 px-2 py-0.5 rounded text-xs font-semibold bg-[var(--secondary-hover)]">
                  {MODE_LABELS[req.mode] || req.mode}
                </span>
              )}

              {/* Tournament */}
              <p className="text-sm mb-1">
                <strong>Tournament: </strong>
                {req.tournament?.name || "Unknown"}
              </p>

              {/* Games */}
              <div className="text-sm mb-2">
                <strong>Games: </strong>
                {req.toGames?.length > 0 ? (
                  <ul className="list-disc list-inside">
                    {req.toGames.map((g) => (
                      <li key={g._id} className="text-[var(--info-color)]">
                        {g.name} ({g.platform})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="opacity-70">No games</span>
                )}
              </div>

              {/* Message */}
              <p className="text-sm mb-1">
                {req.status === "accepted"
                  ? "✅ Request accepted - you are now team members"
                  : req.status === "rejected"
                  ? "❌ Request rejected"
                  : req.message || "Request sent"}
              </p>

              {/* Status */}
              <p className="text-sm capitalize mb-1">
                <span className="font-semibold">Status: </span>
                {req.status || "pending"}
              </p>

              {req.status === "accepted" && req.costOwed > 0 && (
                <div className="text-sm mb-1 p-2 rounded bg-[var(--secondary-color)]">
                  <p>
                    <span className="font-semibold">You owe: </span>${req.costOwed}
                  </p>
                  <p className="capitalize">
                    <span className="font-semibold">Payment: </span>
                    {req.payment?.approved
                      ? "Approved"
                      : req.payment?.paid
                      ? "Submitted, awaiting approval"
                      : "Not submitted"}
                  </p>
                  {!req.payment?.approved && (
                    <PaymentForm req={req} onSubmitted={fetchRequests} />
                  )}
                </div>
              )}

              {req.status === "accepted" && (
                <button
                  className="w-full mt-2 py-2 px-4 rounded-lg font-semibold"
                  style={{ background: "var(--error-color)", color: "white" }}
                  onClick={() => dropPartner(req._id)}
                >
                  Drop Partner
                </button>
              )}

              {/* Sent time */}
              <p className="text-xs opacity-70 mt-3">
                <strong>Sent:</strong> {formatDate(req.createdAt)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="opacity-70 text-sm">No sent requests</p>
      )}
    </div>
  );
}
