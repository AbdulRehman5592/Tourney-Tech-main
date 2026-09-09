"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import api from "@/utils/axios";
import { toast } from "react-hot-toast";
import GameScheduleBadge from "@/components/ui/tournaments/GameScheduleBadge";
import { compareByScheduledAt } from "@/utils/gameSchedule";

export default function GameRegistrationPage() {
  const params = useParams();
  const tournamentId = params?.tournamentId;

  const [games, setGames] = useState([]);
  const [tournamentGames, setTournamentGames] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [registeredGameIds, setRegisteredGameIds] = useState([]);
  const [formData, setFormData] = useState({
    game: [], // array for multi-select
    paymentType: "",
    bankAccount: "",
    transactionId: "",
    accountName: "",
    cashMemo: "",
  });
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  // Confirm-before-submit step -- registrations always start "pending" and
  // unpaid on the backend regardless of what's picked here, so this is the
  // one place we get to make sure the player actually paid before the admin
  // has to find out (and reject) the hard way.
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!tournamentId) return;

    async function fetchData() {
      try {
        const res = await api.get(`/api/tournaments/${tournamentId}`);
        const fetchBankDetails = await api.get("/api/bankDetails");
        const myRegistration = await api.get(
          `/api/tournamentRegister?tournamentId=${tournamentId}`
        );
        const registrationData = res.data;

        // Which specific scheduled slot(s) this player already registered
        // for -- keyed by gameConfigId (Tournament.games[]._id), not the
        // catalog game id, since the same game can be scheduled more than
        // once as fully independent competitions.
        const myRegisteredGameConfigIds =
          myRegistration?.data?.data?.gameRegistrationDetails?.gameConfigIds || [];
        setRegisteredGameIds(
          myRegisteredGameConfigIds.map((id) => id.toString())
        );

        // Registered games -- earliest scheduled first, TBA last
        const registeredGames = [...(registrationData?.games || [])].sort(
          compareByScheduledAt
        );
        setGames(
          registeredGames.map((g) => ({
            _id: g?._id,
            name: g?.eventTitle || g?.game?.name,
            scheduledAt: g?.scheduledAt,
          }))
        );

        // Tournament games details
        setTournamentGames(
          registeredGames.map((g) => ({
            _id: g._id,
            entryFee: g.entryFee,
            scheduledAt: g.scheduledAt,
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

  // Live running total for whatever's currently checked -- shown next to the
  // game list and again in the confirmation step so the player always knows
  // exactly what they're committing to pay.
  const selectedGameDetails = formData.game
    .map((gameId) => tournamentGames.find((g) => g._id === gameId))
    .filter(Boolean);
  const totalFee = selectedGameDetails.reduce(
    (sum, g) => sum + (Number(g.entryFee) || 0),
    0
  );

  const openConfirm = (e) => {
    e.preventDefault();
    if (!tournamentId) return toast.error("Tournament ID is required!");
    if (!formData.game.length) return toast.error("Select at least one game!");
    if (!formData.paymentType) return toast.error("Select a payment method!");
    if (
      formData.paymentType === "online" &&
      (!formData.bankAccount || !formData.accountName || !formData.transactionId)
    ) {
      return toast.error("Fill in all online payment details!");
    }
    if (formData.paymentType === "online" && !receiptFile) {
      return toast.error("Upload a screenshot of the transfer receipt!");
    }
    setShowConfirm(true);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      let res;
      if (formData.paymentType === "online") {
        // Multipart so the receipt screenshot can ride along with the rest
        // of the registration in one request.
        const form = new FormData();
        form.append("tournamentId", tournamentId);
        form.append("gameIds", JSON.stringify(formData.game));
        form.append("paymentMethod", formData.paymentType);
        form.append(
          "paymentDetails",
          JSON.stringify({
            bankId: formData.bankAccount,
            accountName: formData.accountName,
            transactionId: formData.transactionId,
          })
        );
        if (receiptFile) form.append("receipt", receiptFile);

        res = await api.post("/api/tournamentRegister", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        const payload = {
          tournamentId,
          gameIds: formData.game, // send array of selected games
          paymentMethod: formData.paymentType,
        };

        if (formData.cashMemo.trim()) {
          payload.paymentDetails = { note: formData.cashMemo.trim() };
        }

        res = await api.post("/api/tournamentRegister", payload, {
          headers: { "Content-Type": "application/json" },
        });
      }

      toast.success("Registration successful!");
      setRegisteredGameIds((prev) => [
        ...new Set([...prev, ...formData.game]),
      ]);
      setFormData({
        game: [],
        paymentType: "",
        bankAccount: "",
        transactionId: "",
        accountName: "",
        cashMemo: "",
      });
      setReceiptFile(null);
      setReceiptPreview(null);
      setShowConfirm(false);
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
      className="max-w-xl mx-auto rounded-2xl p-8 shadow-lg border"
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

      <form onSubmit={openConfirm} className="space-y-5">
        {/* Game Selection with Checkboxes */}
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: "var(--foreground)" }}
          >
            Select Games
          </label>

          <div className="space-y-2">
            {games.map((g) => {
              const config = tournamentGames.find((tg) => tg._id === g._id);
              const teamTypeLabel =
                config?.tournamentTeamType === "double_player"
                  ? "Double Player"
                  : "Single Player";

              return (
                <label
                  key={g._id}
                  className="flex flex-col gap-2 cursor-pointer rounded-lg border px-3 py-2"
                  style={{
                    color: "var(--foreground)",
                    borderColor: "var(--border-color)",
                  }}
                >
                  <span className="flex items-center gap-2 flex-wrap">
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
                      className="w-4 h-4 shrink-0 accent-[var(--accent-color)]"
                    />
                    <span>{g.name}</span>
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{
                        background: "var(--secondary-color)",
                        color: "var(--foreground)",
                        border: "1px solid var(--border-color)",
                      }}
                    >
                      {teamTypeLabel}
                    </span>
                    {registeredGameIds.includes(g._id) && (
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{
                          background: "var(--accent-color)",
                          color: "var(--background)",
                        }}
                      >
                        Registered
                      </span>
                    )}
                  </span>
                  <GameScheduleBadge
                    value={g.scheduledAt}
                    className="self-end"
                  />
                </label>
              );
            })}
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
                  <strong>Entry Fee:</strong> ${game.entryFee ?? 0}
                </p>

                <GameScheduleBadge
                  value={game.scheduledAt}
                  variant="stacked"
                  className="my-2"
                />

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

          {/* Running total -- updates live as games are checked/unchecked so
              the player always sees what they'll owe before they even get to
              payment method. */}
          {selectedGameDetails.length > 0 && (
            <div
              className="mt-3 flex items-center justify-between rounded-lg px-3 py-2 font-semibold"
              style={{
                background: "var(--accent-color)",
                color: "var(--background)",
              }}
            >
              <span>
                Total for {selectedGameDetails.length} game
                {selectedGameDetails.length === 1 ? "" : "s"}
              </span>
              <span>${totalFee}</span>
            </div>
          )}
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

        {/* Cash Payment Memo -- optional note the player can leave for the
            organizer, e.g. "paid Sarah in cash at check-in", to help them
            track/verify the payment. */}
        {formData.paymentType === "cash" && (
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--foreground)" }}
            >
              Memo (optional)
            </label>
            <textarea
              name="cashMemo"
              value={formData.cashMemo}
              onChange={(e) =>
                setFormData({ ...formData, cashMemo: e.target.value })
              }
              placeholder="e.g. Paid Sarah in cash at check-in"
              rows={2}
              className="w-full rounded-lg px-3 py-2"
              style={{
                background: "var(--secondary-color)",
                borderColor: "var(--border-color)",
                color: "var(--foreground)",
              }}
            />
          </div>
        )}

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

            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--foreground)" }}
              >
                Receipt Screenshot
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setReceiptFile(file);
                  setReceiptPreview(file ? URL.createObjectURL(file) : null);
                }}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{
                  background: "var(--secondary-color)",
                  borderColor: "var(--border-color)",
                  color: "var(--foreground)",
                }}
                required
              />
              <p
                className="mt-1 text-xs opacity-75"
                style={{ color: "var(--foreground)" }}
              >
                Upload a screenshot of the transfer so the organizer can
                verify it against the transaction ID above.
              </p>
              {receiptPreview && (
                <img
                  src={receiptPreview}
                  alt="Receipt preview"
                  className="mt-2 max-h-40 rounded-lg border"
                  style={{ borderColor: "var(--border-color)" }}
                />
              )}
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

      {/* Confirm-you've-paid step -- registration is submitted as "pending,
          unpaid" either way, so this is the last chance to make sure the
          player isn't about to get rejected for a payment that never
          happened. */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !loading && setShowConfirm(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-lg"
            style={{
              background: "var(--card-background)",
              border: "1px solid var(--border-color)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="text-lg font-bold mb-3"
              style={{ color: "var(--accent-color)" }}
            >
              Confirm Your Payment
            </h3>

            <div
              className="mb-4 space-y-1 rounded-lg p-3 text-sm"
              style={{
                background: "var(--secondary-color)",
                color: "var(--foreground)",
              }}
            >
              {selectedGameDetails.map((g) => (
                <div key={g._id} className="flex justify-between">
                  <span>{games.find((game) => game._id === g._id)?.name}</span>
                  <span>${g.entryFee ?? 0}</span>
                </div>
              ))}
              <div
                className="mt-2 flex justify-between border-t pt-2 font-bold"
                style={{ borderColor: "var(--border-color)" }}
              >
                <span>Total</span>
                <span>${totalFee}</span>
              </div>
              <p className="pt-1 text-xs opacity-75 capitalize">
                Paying via {formData.paymentType}
                {formData.paymentType === "online" &&
                  ` — ${bankAccounts.find((b) => b._id === formData.bankAccount)?.bankName || ""}, txn ${formData.transactionId}`}
              </p>
              {formData.paymentType === "cash" && formData.cashMemo.trim() && (
                <p className="pt-1 text-xs opacity-75 normal-case">
                  Memo: {formData.cashMemo.trim()}
                </p>
              )}
              {formData.paymentType === "online" && receiptPreview && (
                <img
                  src={receiptPreview}
                  alt="Receipt preview"
                  className="mt-2 max-h-32 rounded-lg border"
                  style={{ borderColor: "var(--border-color)" }}
                />
              )}
            </div>

            <p
              className="mb-5 text-sm"
              style={{ color: "var(--foreground)" }}
            >
              By confirming, you're stating that you have or will pay{" "}
              <strong>${totalFee}</strong> for the game(s) above. Your
              registration will be marked <strong>pending</strong> until the
              tournament admin verifies it —{" "}
              <span style={{ color: "var(--error-color)" }}>
                if payment wasn't actually made, the admin will reject this
                registration.
              </span>
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-lg border py-2 px-4 font-semibold disabled:opacity-50"
                style={{ borderColor: "var(--border-color)", color: "var(--foreground)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleSubmit}
                className="flex-1 rounded-lg py-2 px-4 font-semibold disabled:opacity-50"
                style={{ background: "var(--accent-color)", color: "black" }}
              >
                {loading ? "Registering..." : "Yes, I've Paid — Register"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
