"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import api from "@/utils/axios";

const initialForm = {
  userId: "",
  tournamentId: "",
  gameIds: [],
  paymentMethod: "cash",
  bankAccount: "",
  transactionId: "",
  accountName: "",
};

export default function AdminRegisterPlayerPage() {
  const [players, setPlayers] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [formData, setFormData] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setFetching(true);
        const [playersRes, tournamentsRes, bankAccountsRes] = await Promise.all([
          api.get("/api/users"),
          api.get("/api/tournaments"),
          api.get("/api/bankDetails"),
        ]);

        const allPlayers = playersRes?.data?.data || [];
        setPlayers(allPlayers.filter((player) => player.role === "player"));
        setTournaments(tournamentsRes?.data?.data || []);
        setBankAccounts(bankAccountsRes?.data?.data || []);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load players or tournaments");
      } finally {
        setFetching(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!formData.tournamentId) {
      setSelectedTournament(null);
      setFormData((prev) => ({ ...prev, gameIds: [] }));
      return;
    }

    const tournament = tournaments.find((item) => item._id === formData.tournamentId);
    setSelectedTournament(tournament || null);

    setFormData((prev) => ({
      ...prev,
      gameIds: prev.gameIds.filter((gameId) =>
        (tournament?.games || []).some((entry) => {
          const id = entry?.game?._id || entry?._id;
          return id === gameId;
        })
      ),
    }));
  }, [formData.tournamentId, tournaments]);

  const tournamentGames = (selectedTournament?.games || []).map((entry) => ({
    id: entry?.game?._id || entry?._id,
    name: entry?.game?.name || entry?.name,
  }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleGame = (gameId) => {
    setFormData((prev) => ({
      ...prev,
      gameIds: prev.gameIds.includes(gameId)
        ? prev.gameIds.filter((id) => id !== gameId)
        : [...prev.gameIds, gameId],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.userId) {
      toast.error("Please select a player");
      return;
    }

    if (!formData.tournamentId) {
      toast.error("Please select a tournament");
      return;
    }

    if (!formData.gameIds.length) {
      toast.error("Select at least one game");
      return;
    }

    if (formData.paymentMethod === "online") {
      if (!formData.bankAccount || !formData.accountName || !formData.transactionId) {
        toast.error("Bank account, account name, and transaction ID are required for online payment");
        return;
      }
    }

    try {
      setLoading(true);
      const payload = {
        userId: formData.userId,
        tournamentId: formData.tournamentId,
        gameIds: formData.gameIds,
        paymentMethod: formData.paymentMethod,
      };

      if (formData.paymentMethod === "online") {
        payload.paymentDetails = {
          bankId: formData.bankAccount,
          accountName: formData.accountName,
          transactionId: formData.transactionId,
        };
      }

      await api.post("/api/tournamentRegister", payload, {
        headers: { "Content-Type": "application/json" },
      });

      toast.success("Player registered successfully");
      setFormData(initialForm);
      setSelectedTournament(null);
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-background)] p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Register Player for Tournament</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Register an existing player account directly for a tournament and its games.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-background)] p-6 shadow-sm space-y-6"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">Player</label>
            <select
              name="userId"
              value={formData.userId}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--secondary-color)] px-3 py-2 text-[var(--foreground)]"
            >
              <option value="">Select player</option>
              {players.map((player) => (
                <option key={player._id} value={player._id}>
                  {player.firstname} {player.lastname} ({player.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">Tournament</label>
            <select
              name="tournamentId"
              value={formData.tournamentId}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--secondary-color)] px-3 py-2 text-[var(--foreground)]"
            >
              <option value="">Select tournament</option>
              {tournaments.map((tournament) => (
                <option key={tournament._id} value={tournament._id}>
                  {tournament.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedTournament && (
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--secondary-color)] p-4">
            <label className="mb-3 block text-sm font-semibold text-[var(--foreground)]">Select Games</label>
            <div className="grid gap-2 sm:grid-cols-2">
              {tournamentGames.map((game) => (
                <label key={game.id} className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--foreground)]">
                  <input
                    type="checkbox"
                    checked={formData.gameIds.includes(game.id)}
                    onChange={() => toggleGame(game.id)}
                    className="h-4 w-4 accent-[var(--accent-color)]"
                  />
                  <span>{game.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">Payment Method</label>
            <select
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleChange}
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--secondary-color)] px-3 py-2 text-[var(--foreground)]"
            >
              <option value="cash">Cash</option>
              <option value="online">Online</option>
            </select>
          </div>

          {formData.paymentMethod === "online" && (
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--secondary-color)] p-4 space-y-3 md:col-span-2">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">Bank Account</label>
                  <select
                    name="bankAccount"
                    value={formData.bankAccount}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--card-background)] px-3 py-2 text-[var(--foreground)]"
                  >
                    <option value="">Select bank account</option>
                    {bankAccounts.map((account) => (
                      <option key={account._id} value={account._id}>
                        {account.accountName || account.bankName || account._id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">Account Name</label>
                  <input
                    name="accountName"
                    value={formData.accountName}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--card-background)] px-3 py-2 text-[var(--foreground)]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">Transaction ID</label>
                <input
                  name="transactionId"
                  value={formData.transactionId}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--card-background)] px-3 py-2 text-[var(--foreground)]"
                />
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || fetching}
          className="w-full rounded-lg bg-[var(--primary-color)] px-4 py-3 font-semibold text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Registering..." : "Register Player"}
        </button>
      </form>
    </div>
  );
}
