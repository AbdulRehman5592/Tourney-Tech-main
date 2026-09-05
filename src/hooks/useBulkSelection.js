"use client";

import { useState, useCallback } from "react";

// Shared "checkbox-select a bunch of rows, then do one bulk action" state --
// the same pattern was being hand-rolled separately on the Register Player,
// Check-In, and team-forming admin screens. `getId` extracts the selection
// key from a row (defaults to `row._id`).
export function useBulkSelection(getId = (row) => row._id) {
  const [selected, setSelected] = useState(new Set());

  const isSelected = useCallback((row) => selected.has(getId(row)), [selected, getId]);

  const toggle = useCallback(
    (row) => {
      const id = getId(row);
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [getId]
  );

  const selectAll = useCallback(
    (rows) => {
      setSelected((prev) => new Set([...prev, ...rows.map(getId)]));
    },
    [getId]
  );

  const clear = useCallback(() => setSelected(new Set()), []);

  return { selected, isSelected, toggle, selectAll, clear, size: selected.size };
}
