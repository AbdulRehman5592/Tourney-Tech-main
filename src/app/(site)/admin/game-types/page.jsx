"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import api from "@/utils/axios";
import { STANDARD_SCORE_COMPONENTS, buildScoreFields } from "@/constants/scoreComponents";

const emptyField = () => ({
  key: "",
  label: "",
  input: "number",
  min: 0,
  max: 10,
  isPrimary: false,
  required: true,
});

export default function GameTypesPage() {
  const [gameTypes, setGameTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingCell, setSavingCell] = useState(null); // `${gameTypeId}:${componentKey}`
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [form, setForm] = useState(null); // advanced editor modal, null = closed

  const fetchGameTypes = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/game-types");
      setGameTypes(res.data?.data || []);
    } catch {
      toast.error("Failed to load game types");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGameTypes();
  }, []);

  const hasComponent = (gt, key) => (gt.scoreFields || []).some((f) => f.key === key);

  const toggleComponent = async (gt, comp) => {
    if (comp.locked) return; // Points always required, can't be unchecked
    const cellId = `${gt._id}:${comp.key}`;
    const currentKeys = (gt.scoreFields || []).map((f) => f.key);
    const nextKeys = hasComponent(gt, comp.key)
      ? currentKeys.filter((k) => k !== comp.key)
      : [...currentKeys, comp.key];

    // Preserve any custom (non-standard) fields already on this type.
    const standardKeys = new Set(STANDARD_SCORE_COMPONENTS.map((c) => c.key));
    const customFields = (gt.scoreFields || []).filter((f) => !standardKeys.has(f.key));
    const scoreFields = [...buildScoreFields(nextKeys), ...customFields];

    setSavingCell(cellId);
    try {
      const res = await api.patch(`/api/game-types/${gt._id}`, { scoreFields });
      setGameTypes((prev) => prev.map((g) => (g._id === gt._id ? res.data.data : g)));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update");
    } finally {
      setSavingCell(null);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return toast.error("Name is required");
    try {
      await api.post("/api/game-types", {
        name: newName.trim(),
        scoreFields: buildScoreFields(["score"]),
      });
      toast.success("Game type added");
      setNewName("");
      setCreating(false);
      fetchGameTypes();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create game type");
    }
  };

  const handleDelete = async (gt) => {
    if (!confirm(`Delete game type "${gt.name}"?`)) return;
    try {
      await api.delete(`/api/game-types/${gt._id}`);
      toast.success("Game type deleted");
      fetchGameTypes();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete");
    }
  };

  // ---- Advanced editor (rename / description / custom extra fields) ----

  const openEdit = (gt) =>
    setForm({
      _id: gt._id,
      name: gt.name,
      description: gt.description || "",
      scoreFields: (gt.scoreFields || []).map((f) => ({ ...emptyField(), ...f })),
    });

  const updateField = (idx, patch) => {
    setForm((prev) => {
      const scoreFields = prev.scoreFields.map((f, i) => (i === idx ? { ...f, ...patch } : f));
      if (patch.isPrimary) {
        scoreFields.forEach((f, i) => {
          if (i !== idx) f.isPrimary = false;
        });
      }
      return { ...prev, scoreFields };
    });
  };

  const addField = () =>
    setForm((prev) => ({ ...prev, scoreFields: [...prev.scoreFields, emptyField()] }));

  const removeField = (idx) =>
    setForm((prev) => ({ ...prev, scoreFields: prev.scoreFields.filter((_, i) => i !== idx) }));

  const [saving, setSaving] = useState(false);

  const handleSaveAdvanced = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.scoreFields.length) return toast.error("Add at least one score field");
    if (form.scoreFields.filter((f) => f.isPrimary).length !== 1)
      return toast.error("Mark exactly one field as primary (the one that decides the winner)");
    for (const f of form.scoreFields) {
      if (!f.key.trim() || !f.label.trim())
        return toast.error("Every score field needs a key and a label");
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      scoreFields: form.scoreFields.map((f) => ({
        key: f.key.trim(),
        label: f.label.trim(),
        input: f.input,
        min: Number(f.min) || 0,
        max: f.input === "select" ? Number(f.max) || 0 : undefined,
        isPrimary: !!f.isPrimary,
        required: !!f.required,
      })),
    };

    try {
      setSaving(true);
      await api.patch(`/api/game-types/${form._id}`, payload);
      toast.success("Game type updated");
      setForm(null);
      fetchGameTypes();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save game type");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Game Types &amp; Scoring Matrix</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Check which scoring components apply to each game. Points is always on --
            it's the value that decides the winner.
          </p>
        </div>
        {creating ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="New game type name"
              className="rounded-lg border border-[var(--border-color)] bg-[var(--secondary-color)] px-3 py-2 text-sm"
            />
            <button
              onClick={handleCreate}
              className="rounded-lg bg-[var(--primary-color)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
            >
              Add
            </button>
            <button
              onClick={() => {
                setCreating(false);
                setNewName("");
              }}
              className="rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 rounded-lg bg-[var(--primary-color)] px-4 py-2 font-semibold text-white hover:bg-[var(--primary-hover)]"
          >
            <Plus size={18} /> New Game Type
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-[var(--muted-foreground)]">Loading…</p>
      ) : gameTypes.length === 0 ? (
        <p className="text-[var(--muted-foreground)]">No game types yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border-color)]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[var(--secondary-color)]">
                <th className="sticky left-0 z-10 bg-[var(--secondary-color)] px-4 py-3 text-left font-semibold border-b border-[var(--border-color)]">
                  Scoring Component
                </th>
                {gameTypes.map((gt) => (
                  <th
                    key={gt._id}
                    className="px-4 py-3 text-center font-semibold border-b border-l border-[var(--border-color)] min-w-[140px]"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span>{gt.name}</span>
                      <button
                        onClick={() => openEdit(gt)}
                        title="Advanced edit"
                        className="text-blue-500 hover:text-blue-400"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(gt)}
                        title="Delete game type"
                        className="text-red-500 hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-[var(--card-background)]">
              {STANDARD_SCORE_COMPONENTS.map((comp) => (
                <tr key={comp.key}>
                  <td className="sticky left-0 z-10 bg-[var(--card-background)] px-4 py-2.5 border-b border-[var(--border-color)] font-medium">
                    {comp.label}
                    {comp.locked && (
                      <span className="ml-1 text-xs text-[var(--muted-foreground)]">
                        (always on)
                      </span>
                    )}
                  </td>
                  {gameTypes.map((gt) => {
                    const checked = hasComponent(gt, comp.key);
                    const cellId = `${gt._id}:${comp.key}`;
                    return (
                      <td
                        key={gt._id}
                        className="px-4 py-2.5 text-center border-b border-l border-[var(--border-color)]"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={comp.locked || savingCell === cellId}
                          onChange={() => toggleComponent(gt, comp)}
                          className="h-4 w-4 accent-[var(--accent-color)] disabled:opacity-50"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--card-background)] p-6 shadow-lg scrollbar">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Advanced: {form.name}</h2>
              <button onClick={() => setForm(null)} className="text-gray-400 hover:text-gray-200">
                <X size={20} />
              </button>
            </div>
            <p className="mb-4 text-xs text-[var(--muted-foreground)]">
              Rename, describe, or add a custom field beyond the standard scoring
              matrix. Exactly one field must stay marked Primary.
            </p>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--secondary-color)] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Description</label>
                  <input
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Optional"
                    className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--secondary-color)] px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-semibold">Score Fields</label>
                  <button
                    onClick={addField}
                    className="flex items-center gap-1 text-sm text-[var(--accent-color)] hover:opacity-80"
                  >
                    <Plus size={16} /> Add custom field
                  </button>
                </div>

                <div className="space-y-3">
                  {form.scoreFields.map((f, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-[var(--border-color)] bg-[var(--secondary-color)] p-3"
                    >
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          value={f.label}
                          onChange={(e) => updateField(idx, { label: e.target.value })}
                          placeholder="Label (e.g. Rubber Bonus)"
                          className="rounded-lg border border-[var(--border-color)] bg-[var(--card-background)] px-3 py-2 text-sm"
                        />
                        <input
                          value={f.key}
                          onChange={(e) =>
                            updateField(idx, {
                              key: e.target.value.replace(/\s+/g, "").toLowerCase(),
                            })
                          }
                          placeholder="key (e.g. rubberbonus)"
                          className="rounded-lg border border-[var(--border-color)] bg-[var(--card-background)] px-3 py-2 text-sm font-mono"
                        />
                        <select
                          value={f.input}
                          onChange={(e) => updateField(idx, { input: e.target.value })}
                          className="rounded-lg border border-[var(--border-color)] bg-[var(--card-background)] px-3 py-2 text-sm"
                        >
                          <option value="number">Number input</option>
                          <option value="select">Dropdown (min–max)</option>
                        </select>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={f.min}
                            onChange={(e) => updateField(idx, { min: e.target.value })}
                            placeholder="min"
                            className="w-1/2 rounded-lg border border-[var(--border-color)] bg-[var(--card-background)] px-3 py-2 text-sm"
                          />
                          {f.input === "select" && (
                            <input
                              type="number"
                              value={f.max}
                              onChange={(e) => updateField(idx, { max: e.target.value })}
                              placeholder="max"
                              className="w-1/2 rounded-lg border border-[var(--border-color)] bg-[var(--card-background)] px-3 py-2 text-sm"
                            />
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="primary"
                            checked={!!f.isPrimary}
                            onChange={() => updateField(idx, { isPrimary: true })}
                          />
                          Primary (decides winner)
                        </label>
                        <button
                          onClick={() => removeField(idx)}
                          className="text-red-500 hover:text-red-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setForm(null)}
                className="rounded-lg border border-[var(--border-color)] px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAdvanced}
                disabled={saving}
                className="rounded-lg bg-[var(--primary-color)] px-5 py-2 font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
