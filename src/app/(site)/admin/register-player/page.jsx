"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import api from "@/utils/axios";
import USLocationSelector from "@/components/ui/signup/USLocationSelector";

const initialForm = {
  userId: "",
  tournamentId: "",
  gameIds: [],
  paymentMethod: "cash",
  bankAccount: "",
  transactionId: "",
  accountName: "",
};

// Same fields the public signup form collects.
const initialNewPlayer = {
  firstname: "",
  lastname: "",
  username: "",
  email: "",
  password: "",
  phone: "",
  gender: "",
  dob: "",
  region: "",
  stateCode: "",
  city: "",
  club: "",
};

export default function AdminRegisterPlayerPage() {
  // "existing" registers an account that is already in Tourney Tech;
  // "new" creates the account and registers it in the same submit.
  const [mode, setMode] = useState("existing");

  const [players, setPlayers] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [formData, setFormData] = useState(initialForm);
  const [newPlayer, setNewPlayer] = useState(initialNewPlayer);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [createdPlayer, setCreatedPlayer] = useState(null);

  // Bulk registration -- only applies to "existing" mode: register the same
  // tournament/games/payment for many players in one submit instead of one.
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState([]);
  const [playerSearch, setPlayerSearch] = useState("");
  const [bulkResult, setBulkResult] = useState(null);

  const fetchPlayers = async () => {
    const playersRes = await api.get("/api/users");
    const allPlayers = playersRes?.data?.data || [];
    setPlayers(allPlayers.filter((player) => player.role === "player"));
  };

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
        (tournament?.games || []).some((entry) => entry?._id === gameId)
      ),
    }));
  }, [formData.tournamentId, tournaments]);

  // Selection is keyed by the specific scheduled instance (Tournament.games[]._id),
  // not the catalog game id -- the same catalog game can be scheduled more than
  // once in one tournament as fully independent competitions.
  const tournamentGames = (selectedTournament?.games || []).map((entry) => ({
    id: entry?._id,
    name: entry?.game?.name || entry?.name,
  }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNewPlayerChange = (e) => {
    const { name, value } = e.target;
    setNewPlayer((prev) => ({
      ...prev,
      [name]: name === "phone" ? value.replace(/\D/g, "") : value,
    }));
  };

  const setNewPlayerField = (name) => (value) =>
    setNewPlayer((prev) => ({ ...prev, [name]: value }));

  const togglePlayerSelection = (playerId) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  };

  const filteredPlayers = players.filter((player) => {
    if (!playerSearch.trim()) return true;
    const q = playerSearch.trim().toLowerCase();
    return (
      `${player.firstname || ""} ${player.lastname || ""}`.toLowerCase().includes(q) ||
      player.email?.toLowerCase().includes(q) ||
      player.username?.toLowerCase().includes(q)
    );
  });

  const selectAllFiltered = () => {
    setSelectedPlayerIds((prev) => [
      ...new Set([...prev, ...filteredPlayers.map((p) => p._id)]),
    ]);
  };

  const clearSelectedPlayers = () => setSelectedPlayerIds([]);

  const toggleGame = (gameId) => {
    setFormData((prev) => ({
      ...prev,
      gameIds: prev.gameIds.includes(gameId)
        ? prev.gameIds.filter((id) => id !== gameId)
        : [...prev.gameIds, gameId],
    }));
  };

  const switchMode = (nextMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    setCreatedPlayer(null);
    setBulkResult(null);
    // Clear whichever player selection doesn't apply to the new mode, so a
    // leftover value can't be submitted invisibly.
    if (nextMode === "new") {
      setFormData((prev) => ({ ...prev, userId: "" }));
      setBulkMode(false);
      setSelectedPlayerIds([]);
    } else {
      setNewPlayer(initialNewPlayer);
    }
  };

  // Everything the two modes share: tournament, games and payment.
  const validateShared = () => {
    if (!formData.tournamentId) {
      toast.error("Please select a tournament");
      return false;
    }

    if (!formData.gameIds.length) {
      toast.error("Select at least one game");
      return false;
    }

    if (formData.paymentMethod === "online") {
      if (!formData.bankAccount || !formData.accountName || !formData.transactionId) {
        toast.error("Bank account, account name, and transaction ID are required for online payment");
        return false;
      }
    }

    return true;
  };

  const validateNewPlayer = () => {
    const required = [
      ["firstname", "First name"],
      ["lastname", "Last name"],
      ["email", "Email"],
      ["phone", "Phone"],
      ["gender", "Gender"],
      ["dob", "Date of birth"],
      ["stateCode", "State"],
      ["city", "City"],
      ["region", "Playing region"],
      ["club", "Club"],
    ];

    for (const [key, label] of required) {
      if (!newPlayer[key]) {
        toast.error(`${label} is required`);
        return false;
      }
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newPlayer.email)) {
      toast.error("Please enter a valid email address");
      return false;
    }

    if (!/^\d{10}$/.test(newPlayer.phone)) {
      toast.error("Phone number must be exactly 10 digits");
      return false;
    }

    return true;
  };

  const buildPaymentPayload = () => {
    const payload = {
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

    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreatedPlayer(null);
    setBulkResult(null);

    if (mode === "existing" && bulkMode && !selectedPlayerIds.length) {
      toast.error("Select at least one player");
      return;
    }

    if (mode === "existing" && !bulkMode && !formData.userId) {
      toast.error("Please select a player");
      return;
    }

    if (!validateShared()) return;
    if (mode === "new" && !validateNewPlayer()) return;

    try {
      setLoading(true);

      if (mode === "new") {
        const res = await api.post(
          "/api/admin/register-player",
          { ...buildPaymentPayload(), newUser: newPlayer },
          { headers: { "Content-Type": "application/json" } }
        );

        const data = res?.data?.data;
        setCreatedPlayer({
          name: `${data?.user?.firstname || ""} ${data?.user?.lastname || ""}`.trim(),
          email: data?.user?.email,
          username: data?.user?.username,
          password: data?.password,
        });

        toast.success(res?.data?.message || "Player created and registered");
        setNewPlayer(initialNewPlayer);
        // Pull the new account into the existing-player dropdown.
        fetchPlayers().catch(() => {});
      } else if (bulkMode) {
        const payload = buildPaymentPayload();
        const results = await Promise.allSettled(
          selectedPlayerIds.map((userId) =>
            api.post(
              "/api/tournamentRegister",
              { ...payload, userId },
              { headers: { "Content-Type": "application/json" } }
            )
          )
        );

        const succeeded = [];
        const failed = [];
        results.forEach((result, i) => {
          const player = players.find((p) => p._id === selectedPlayerIds[i]);
          const label = player
            ? `${player.firstname} ${player.lastname}`.trim() || player.email
            : selectedPlayerIds[i];
          if (result.status === "fulfilled") {
            succeeded.push(label);
          } else {
            failed.push({
              label,
              message: result.reason?.response?.data?.message || "Registration failed",
            });
          }
        });

        setBulkResult({ succeeded, failed });

        if (failed.length === 0) {
          toast.success(`Registered ${succeeded.length} player(s) successfully`);
        } else if (succeeded.length === 0) {
          toast.error(`Failed to register ${failed.length} player(s)`);
        } else {
          toast(
            `${succeeded.length} registered, ${failed.length} failed — see details below`,
            { icon: "⚠️" }
          );
        }

        setSelectedPlayerIds([]);
      } else {
        await api.post(
          "/api/tournamentRegister",
          { ...buildPaymentPayload(), userId: formData.userId },
          { headers: { "Content-Type": "application/json" } }
        );

        toast.success("Player registered successfully");
      }

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
          Register a player for a tournament and its games — either an existing account,
          or a new player who isn&apos;t in Tourney Tech yet.
        </p>

        {/* Mode switch */}
        <div className="mt-4 inline-flex rounded-lg border border-[var(--border-color)] p-1 bg-[var(--secondary-color)]">
          {[
            { key: "existing", label: "Existing Player" },
            { key: "new", label: "New Player" },
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => switchMode(option.key)}
              className="rounded-md px-4 py-2 text-sm font-semibold transition"
              style={
                mode === option.key
                  ? { backgroundColor: "var(--primary-color)", color: "white" }
                  : { color: "var(--foreground)" }
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {createdPlayer && (
        <div
          className="rounded-2xl border p-5 text-sm"
          style={{
            borderColor: "var(--success-color)",
            backgroundColor: "var(--card-background)",
          }}
        >
          <p className="font-semibold" style={{ color: "var(--success-color)" }}>
            {createdPlayer.name} was created and registered.
          </p>
          <p className="mt-2 text-[var(--foreground)]">
            Login email: <strong>{createdPlayer.email}</strong>
            <br />
            Nickname: <strong>{createdPlayer.username}</strong>
            <br />
            Password: <strong>{createdPlayer.password}</strong>
          </p>
          <p className="mt-2 text-[var(--muted-foreground)]">
            Share these with the player — the password can&apos;t be shown again once you
            leave this page.
          </p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-background)] p-6 shadow-sm space-y-6"
      >
        {mode === "existing" ? (
          <div className="space-y-4">
            <label className="flex w-fit items-center gap-2 text-sm font-medium text-[var(--foreground)]">
              <input
                type="checkbox"
                checked={bulkMode}
                onChange={(e) => {
                  setBulkMode(e.target.checked);
                  setBulkResult(null);
                  setFormData((prev) => ({ ...prev, userId: "" }));
                  setSelectedPlayerIds([]);
                }}
                className="h-4 w-4 accent-[var(--accent-color)]"
              />
              Register multiple players at once
            </label>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                  {bulkMode ? `Players (${selectedPlayerIds.length} selected)` : "Player"}
                </label>

                {bulkMode ? (
                  <div className="rounded-lg border border-[var(--border-color)] bg-[var(--secondary-color)] p-2">
                    <input
                      type="text"
                      value={playerSearch}
                      onChange={(e) => setPlayerSearch(e.target.value)}
                      placeholder="Search by name, email, or nickname"
                      className="mb-2 w-full rounded-md border border-[var(--border-color)] bg-[var(--card-background)] px-3 py-2 text-sm text-[var(--foreground)]"
                    />
                    <div className="mb-2 flex gap-3 text-xs">
                      <button
                        type="button"
                        onClick={selectAllFiltered}
                        className="font-semibold text-[var(--accent-color)] hover:underline"
                      >
                        Select all{playerSearch.trim() ? " (filtered)" : ""}
                      </button>
                      <button
                        type="button"
                        onClick={clearSelectedPlayers}
                        className="font-semibold text-[var(--muted-foreground)] hover:underline"
                      >
                        Clear selection
                      </button>
                    </div>
                    <div className="max-h-56 overflow-y-auto rounded-md border border-[var(--border-color)]">
                      {filteredPlayers.map((player) => (
                        <label
                          key={player._id}
                          className="flex items-center gap-2 border-b border-[var(--border-color)] px-3 py-2 text-sm text-[var(--foreground)] last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPlayerIds.includes(player._id)}
                            onChange={() => togglePlayerSelection(player._id)}
                            className="h-4 w-4 accent-[var(--accent-color)]"
                          />
                          <span>
                            {player.firstname} {player.lastname} ({player.email})
                          </span>
                        </label>
                      ))}
                      {filteredPlayers.length === 0 && (
                        <p className="px-3 py-2 text-sm text-[var(--muted-foreground)]">
                          No players match your search.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
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
                )}
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
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--secondary-color)] p-4 space-y-4">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">New Player Details</h2>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="First Name" name="firstname" value={newPlayer.firstname} onChange={handleNewPlayerChange} required />
                <Field label="Last Name" name="lastname" value={newPlayer.lastname} onChange={handleNewPlayerChange} required />
                <Field
                  label="Nickname (optional)"
                  name="username"
                  value={newPlayer.username}
                  onChange={handleNewPlayerChange}
                />
                <Field
                  label="Email"
                  name="email"
                  type="email"
                  value={newPlayer.email}
                  onChange={handleNewPlayerChange}
                  required
                  pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                  title="Please enter a valid email address"
                />
                <Field
                  label="Phone"
                  name="phone"
                  value={newPlayer.phone}
                  onChange={handleNewPlayerChange}
                  required
                  maxLength={10}
                  pattern="^[0-9]{10}$"
                  title="Phone number must be exactly 10 digits"
                />

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">Gender</label>
                  <select
                    name="gender"
                    value={newPlayer.gender}
                    onChange={handleNewPlayerChange}
                    required
                    className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--card-background)] px-3 py-2 text-[var(--foreground)]"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">Date of Birth</label>
                  <DatePicker
                    selected={
                      newPlayer.dob && newPlayer.dob.includes("/")
                        ? (() => {
                            const [month, day] = newPlayer.dob.split("/").map(Number);
                            if (isNaN(month) || isNaN(day)) return null;
                            const d = new Date();
                            d.setMonth(month - 1);
                            d.setDate(day);
                            return d;
                          })()
                        : null
                    }
                    onChange={(date) => {
                      if (date instanceof Date && !isNaN(date)) {
                        const formatted = `${String(date.getMonth() + 1).padStart(2, "0")}/${String(
                          date.getDate()
                        ).padStart(2, "0")}`;
                        setNewPlayer((prev) => ({ ...prev, dob: formatted }));
                      } else {
                        setNewPlayer((prev) => ({ ...prev, dob: "" }));
                      }
                    }}
                    dateFormat="MM/dd"
                    showMonthDropdown
                    showDayDropdown
                    showYearDropdown={false}
                    placeholderText="Select month and day"
                    className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--card-background)] px-3 py-2 text-[var(--foreground)]"
                    calendarClassName="custom-calendar"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                    Password (optional)
                  </label>
                  <input
                    name="password"
                    value={newPlayer.password}
                    onChange={handleNewPlayerChange}
                    placeholder="Leave blank for nickname12345"
                    className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--card-background)] px-3 py-2 text-[var(--foreground)]"
                  />
                </div>
              </div>

              <USLocationSelector
                region={newPlayer.region}
                setRegion={setNewPlayerField("region")}
                stateCode={newPlayer.stateCode}
                setStateCode={setNewPlayerField("stateCode")}
                city={newPlayer.city}
                setCity={setNewPlayerField("city")}
                club={newPlayer.club}
                setClub={setNewPlayerField("club")}
              />
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
          </>
        )}

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

              {tournamentGames.length === 0 && (
                <p className="text-sm text-[var(--muted-foreground)]">
                  This tournament has no games yet.
                </p>
              )}
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
          {loading
            ? mode === "new"
              ? "Creating & Registering..."
              : bulkMode
                ? `Registering ${selectedPlayerIds.length} player(s)...`
                : "Registering..."
            : mode === "new"
              ? "Create & Register Player"
              : bulkMode
                ? `Register ${selectedPlayerIds.length || ""} Player(s)`
                : "Register Player"}
        </button>
      </form>

      {bulkResult && (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-background)] p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Bulk Registration Results</h2>

          {bulkResult.succeeded.length > 0 && (
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--success-color)" }}>
                Registered ({bulkResult.succeeded.length})
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                {bulkResult.succeeded.join(", ")}
              </p>
            </div>
          )}

          {bulkResult.failed.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-red-500">
                Failed ({bulkResult.failed.length})
              </p>
              <ul className="mt-1 space-y-1 text-sm text-[var(--muted-foreground)]">
                {bulkResult.failed.map((item, i) => (
                  <li key={i}>
                    <strong className="text-[var(--foreground)]">{item.label}</strong>: {item.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, name, value, onChange, type = "text", required = false, ...rest }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--card-background)] px-3 py-2 text-[var(--foreground)]"
        {...rest}
      />
    </div>
  );
}
