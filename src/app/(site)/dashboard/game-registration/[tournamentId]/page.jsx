"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import api from "@/utils/axios";
import { toast } from "react-hot-toast";

export default function GameRegistrationPage() {
  const params = useParams();
  const tournamentId = params?.tournamentId;

  const [games, setGames] = useState([]);
  const [tournamentGames, setTournamentGames] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [formData, setFormData] = useState({
    game: [], // array for multi-select
    paymentType: "",
    bankAccount: "",
    transactionId: "",
    accountName: "",
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!tournamentId) return;

    async function fetchData() {
      try {
        const res = await api.get(`/api/tournaments/${tournamentId}`);
        const fetchBankDetails = await api.get("/api/bankDetails");
        const registrationData = res.data;

        // Registered games
        const registeredGames = registrationData?.games || [];
        setGames(
          registeredGames.map((g) => ({
            _id: g?.game?._id,
            name: g?.game?.name,
          }))
        );

        // Tournament games details
        setTournamentGames(
          registeredGames.map((g) => ({
            _id: g.game?._id,
            entryFee: g.entryFee,
            format: g.format,
            teamBased: g.teamBased, // keep original boolean if needed
            tournamentTeamType: g.tournamentTeamType, // preserve actual type string
            minPlayers: g.minPlayers || 1,
            maxPlayers: g.maxPlayers || 1,
          }))
        );

        const bankObj = fetchBankDetails?.data?.data || [];
        setBankAccounts(bankObj);
      } catch (err) {
        console.error("Error fetching data:", err);
        toast.error("Failed to load games or bank accounts.");
      } finally {
        setFetching(false);
      }
    }

    fetchData();
  }, [tournamentId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tournamentId) return toast.error("Tournament ID is required!");
    if (!formData.game.length) return toast.error("Select at least one game!");

    try {
      setLoading(true);
      const payload = {
        tournamentId,
        gameIds: formData.game, // send array of selected games
        paymentMethod: formData.paymentType,
      };

      if (formData.paymentType === "online") {
        payload.paymentDetails = {
          bankId: formData.bankAccount,
          accountName: formData.accountName,
          transactionId: formData.transactionId,
        };
      }

      const res = await api.post("/api/tournamentRegister", payload, {
        headers: { "Content-Type": "application/json" },
      });

      toast.success("Registration successful!");
      setFormData({
        game: [],
        paymentType: "",
        bankAccount: "",
        transactionId: "",
        accountName: "",
      });
    } catch (err) {
      console.error("Error submitting registration:", err);
      toast.error(err.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div
      className="max-w-lg mx-auto rounded-2xl p-8 shadow-lg border"
      style={{
        background: "var(--card-background)",
        borderColor: "var(--border-color)",
      }}
    >
      <h2
        className="text-2xl font-bold text-center mb-6"
        style={{ color: "var(--accent-color)" }}
      >
        Tournament Registration
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Game Selection with Checkboxes */}
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: "var(--foreground)" }}
          >
            Select Games
          </label>

          <div className="space-y-2">
            {games.map((g) => (
              <label
                key={g._id}
                className="flex items-center space-x-2 cursor-pointer"
                style={{ color: "var(--foreground)" }}
              >
                <input
                  type="checkbox"
                  value={g._id}
                  checked={formData.game.includes(g._id)}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      game: prev.game.includes(value)
                        ? prev.game.filter((id) => id !== value)
                        : [...prev.game, value],
                    }));
                  }}
                  className="w-4 h-4 accent-[var(--accent-color)]"
                />
                <span>{g.name}</span>
              </label>
            ))}
          </div>

          {/* Display selected games details */}
          {formData.game.map((gameId) => {
            const game = tournamentGames.find((g) => g._id === gameId);
            if (!game) return null;
            return (
              <div
                key={game._id}
                className="mt-3 p-3 border rounded-lg"
                style={{
                  background: "var(--secondary-color)",
                  borderColor: "var(--border-color)",
                  color: "var(--foreground)",
                }}
              >
                <p>
                  <strong>Game:</strong>{" "}
                  {games.find((g) => g._id === game._id)?.name}
                </p>
                <p>
                  <strong>Entry Fee:</strong> {game.entryFee}
                </p>
               
                <p>
                  <strong>Players Required:</strong>{" "}
                  {game.tournamentTeamType === "double_player"
                    ? "Double Player"
                    : game.tournamentTeamType === "single_player"
                      ? "Single Player"
                      : "Unknown"}
                </p>
              </div>
            );
          })}
        </div>

        {/* Payment Method */}
        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: "var(--foreground)" }}
          >
            Payment Method
          </label>
          <select
            name="paymentType"
            value={formData.paymentType}
            onChange={(e) =>
              setFormData({ ...formData, paymentType: e.target.value })
            }
            required
            className="w-full rounded-lg px-3 py-2"
            style={{
              background: "var(--secondary-color)",
              borderColor: "var(--border-color)",
              color: "var(--foreground)",
            }}
          >
            <option value="">-- Select Payment Type --</option>
            <option value="online">Online</option>
            <option value="cash">Cash</option>
          </select>
        </div>

        {/* Online Payment Details */}
        {formData.paymentType === "online" && (
          <div className="space-y-4">
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--foreground)" }}
              >
                Select Bank Account
              </label>
              <select
                name="bankAccount"
                value={formData.bankAccount}
                onChange={(e) =>
                  setFormData({ ...formData, bankAccount: e.target.value })
                }
                required
                className="w-full rounded-lg px-3 py-2"
                style={{
                  background: "var(--secondary-color)",
                  borderColor: "var(--border-color)",
                  color: "var(--foreground)",
                }}
              >
                <option value="">-- Select Bank Account --</option>
                {bankAccounts.map((bank) => (
                  <option key={bank._id} value={bank._id}>
                    {bank.bankName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--foreground)" }}
              >
                Your Account Name
              </label>
              <input
                type="text"
                name="accountName"
                value={formData.accountName}
                onChange={(e) =>
                  setFormData({ ...formData, accountName: e.target.value })
                }
                className="w-full rounded-lg px-3 py-2"
                style={{
                  background: "var(--secondary-color)",
                  borderColor: "var(--border-color)",
                  color: "var(--foreground)",
                }}
                required
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--foreground)" }}
              >
                Transaction ID
              </label>
              <input
                type="text"
                name="transactionId"
                value={formData.transactionId}
                onChange={(e) =>
                  setFormData({ ...formData, transactionId: e.target.value })
                }
                className="w-full rounded-lg px-3 py-2"
                style={{
                  background: "var(--secondary-color)",
                  borderColor: "var(--border-color)",
                  color: "var(--foreground)",
                }}
                required
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full font-semibold py-2 px-4 rounded-lg shadow-md transition duration-200 disabled:opacity-50"
          style={{
            background: "var(--primary-color)",
            color: "var(--foreground)",
          }}
        >
          {loading ? "Registering..." : "Register"}
        </button>
      </form>
    </div>
  );
}
