"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Trash2 } from "lucide-react";
import api from "@/utils/axios";
import SearchableSelect from "@/components/ui/admin/team/Select";

const PLACEMENTS = [
  { value: 1, label: "1st place" },
  { value: 2, label: "2nd place" },
  { value: 3, label: "3rd place" },
  { value: 4, label: "4th place" },
];

const emptyForm = {
  player: null,
  gameType: "",
  eventName: "",
  eventDate: "",
  tableCount: "",
  placement: 1,
  notes: "",
};

export default function ExternalRankingsPage() {
  const [players, setPlayers] = useState([]);
  const [gameTypes, setGameTypes] = useState([]);
  const [awards, setAwards] = useState([]);
  const [loadingAwards, setLoadingAwards] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchAwards = async () => {
    try {
      setLoadingAwards(true);
      const res = await api.get("/api/rankings/external");
      setAwards(res.data?.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load awards");
    } finally {
      setLoadingAwards(false);
    }
  };

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const res = await api.get("/api/users");
        setPlayers(
          (res.data?.data || []).map((u) => ({
            value: u._id,
            label: `${u.firstname || ""} ${u.lastname || ""} (${u.username || "unknown"})`,
          }))
        );
      } catch {
        toast.error("Failed to load players");
      }
    };

    const fetchGameTypes = async () => {
      try {
        const res = await api.get("/api/game-types");
        const types = res.data?.data || [];
        setGameTypes(types);
        if (types.length) {
          setForm((prev) => ({ ...prev, gameType: types[0].name }));
        }
      } catch {
        toast.error("Failed to load game types");
      }
    };

    fetchPlayers();
    fetchGameTypes();
    fetchAwards();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.player || !form.gameType || !form.eventName.trim() || !form.eventDate || !form.tableCount) {
      toast.error("Fill in every field before adding the award");
      return;
    }

    const tableCount = Number(form.tableCount);
    if (!Number.isInteger(tableCount) || tableCount < 5 || tableCount > 100) {
      toast.error("Table count must be a whole number between 5 and 100");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post("/api/rankings/external", {
        user: form.player.value,
        gameType: form.gameType,
        eventName: form.eventName.trim(),
        eventDate: form.eventDate,
        tableCount,
        placement: form.placement,
        notes: form.notes.trim() || undefined,
      });
      toast.success(data.message || "Award added");
      setForm((prev) => ({ ...emptyForm, gameType: prev.gameType }));
      fetchAwards();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to add award");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (award) => {
    if (!confirm(`Remove ${award.points} pts awarded to ${award.user?.username || "this player"} for "${award.eventName}"?`)) {
      return;
    }
    try {
      await api.delete(`/api/rankings/external/${award._id}`);
      toast.success("Award removed");
      fetchAwards();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to remove award");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Manual Ranking Awards</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          For tournaments played outside Tourney Tech. Points are calculated automatically
          from the table count and placement -- the same schedule used for native events -- so
          they can never be typed in directly.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 sm:grid-cols-2 p-6 rounded-2xl border border-[var(--border-color)]"
        style={{ backgroundColor: "var(--card-background)" }}
      >
        <SearchableSelect
          label="Player"
          options={players}
          value={form.player}
          onChange={(val) => setForm((prev) => ({ ...prev, player: val }))}
          placeholder="Select player"
        />

        <div>
          <label className="block text-sm mb-1">Game Type</label>
          <select
            value={form.gameType}
            onChange={(e) => setForm((prev) => ({ ...prev, gameType: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg bg-[var(--secondary-color)] border border-[var(--border-color)]"
          >
            {gameTypes.map((gt) => (
              <option key={gt._id} value={gt.name}>
                {gt.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Tournament / Event Name</label>
          <input
            type="text"
            value={form.eventName}
            onChange={(e) => setForm((prev) => ({ ...prev, eventName: e.target.value }))}
            placeholder="e.g. Hammer Classic"
            className="w-full px-3 py-2 rounded-lg bg-[var(--secondary-color)] border border-[var(--border-color)]"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Event Date</label>
          <input
            type="date"
            value={form.eventDate}
            onChange={(e) => setForm((prev) => ({ ...prev, eventDate: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg bg-[var(--secondary-color)] border border-[var(--border-color)]"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Number of Tables</label>
          <input
            type="number"
            min={5}
            max={100}
            value={form.tableCount}
            onChange={(e) => setForm((prev) => ({ ...prev, tableCount: e.target.value }))}
            placeholder="5-100"
            className="w-full px-3 py-2 rounded-lg bg-[var(--secondary-color)] border border-[var(--border-color)]"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Placement</label>
          <select
            value={form.placement}
            onChange={(e) => setForm((prev) => ({ ...prev, placement: Number(e.target.value) }))}
            className="w-full px-3 py-2 rounded-lg bg-[var(--secondary-color)] border border-[var(--border-color)]"
          >
            {PLACEMENTS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm mb-1">Notes (optional)</label>
          <input
            type="text"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="e.g. Results confirmed by director via email"
            className="w-full px-3 py-2 rounded-lg bg-[var(--secondary-color)] border border-[var(--border-color)]"
          />
        </div>

        <div className="sm:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 rounded-lg font-semibold text-white bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] disabled:opacity-60"
          >
            {submitting ? "Adding…" : "Add Award"}
          </button>
        </div>
      </form>

      <div>
        <h2 className="text-lg font-semibold mb-3">Recently Added</h2>
        {loadingAwards ? (
          <p className="text-[var(--muted-foreground)]">Loading…</p>
        ) : awards.length === 0 ? (
          <p className="text-[var(--muted-foreground)]">No manual awards added yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[var(--border-color)]">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[var(--secondary-color)]">
                  <th className="px-4 py-3 text-left font-semibold border-b border-[var(--border-color)]">Player</th>
                  <th className="px-4 py-3 text-left font-semibold border-b border-[var(--border-color)]">Game Type</th>
                  <th className="px-4 py-3 text-left font-semibold border-b border-[var(--border-color)]">Event</th>
                  <th className="px-4 py-3 text-left font-semibold border-b border-[var(--border-color)]">Date</th>
                  <th className="px-4 py-3 text-left font-semibold border-b border-[var(--border-color)]">Tables</th>
                  <th className="px-4 py-3 text-left font-semibold border-b border-[var(--border-color)]">Placement</th>
                  <th className="px-4 py-3 text-left font-semibold border-b border-[var(--border-color)]">Points</th>
                  <th className="px-4 py-3 text-left font-semibold border-b border-[var(--border-color)]">Entered By</th>
                  <th className="px-4 py-3 text-center font-semibold border-b border-[var(--border-color)]">Actions</th>
                </tr>
              </thead>
              <tbody style={{ backgroundColor: "var(--card-background)" }}>
                {awards.map((award) => (
                  <tr key={award._id} className="border-b border-[var(--border-color)]">
                    <td className="px-4 py-2.5">
                      {award.user
                        ? `${award.user.firstname || ""} ${award.user.lastname || ""}`.trim() ||
                          award.user.username
                        : "Unknown"}
                    </td>
                    <td className="px-4 py-2.5">{award.gameType}</td>
                    <td className="px-4 py-2.5">{award.eventName}</td>
                    <td className="px-4 py-2.5">{new Date(award.eventDate).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5">{award.tableCount}</td>
                    <td className="px-4 py-2.5">
                      {PLACEMENTS.find((p) => p.value === award.placement)?.label}
                    </td>
                    <td className="px-4 py-2.5 font-semibold" style={{ color: "var(--accent-color)" }}>
                      {award.points}
                    </td>
                    <td className="px-4 py-2.5">
                      {award.enteredBy
                        ? award.enteredBy.username || `${award.enteredBy.firstname || ""}`.trim()
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => handleDelete(award)}
                        className="text-red-500 hover:text-red-400"
                        title="Remove award"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
