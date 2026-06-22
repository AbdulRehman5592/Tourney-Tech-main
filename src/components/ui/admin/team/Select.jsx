"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";

export default function SearchableSelect({
  label,
  options = [],
  value,
  onChange,
  placeholder,
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // ✅ Sync query with selected value
  useEffect(() => {
    if (value) {
      setQuery(value.label || "");
    } else {
      setQuery("");
    }
  }, [value]);

  // ✅ Guard against missing labels
  const filtered = (options || []).filter((opt) =>
    (opt?.label || "").toLowerCase().includes(query.toLowerCase())
  );

  const handleClear = () => {
    setQuery("");
    onChange(null);
    setIsOpen(false);
  };

  return (
    <div className="w-full">
      <label className="block text-sm mb-1">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true); // open while typing
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)} // close after blur
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-8 rounded-lg bg-[var(--secondary-color)] border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
        />

        {/* ❌ Clear button */}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
          >
            <X size={16} />
          </button>
        )}

        {isOpen && (
          <ul className="absolute z-10 w-full max-h-40 overflow-y-auto bg-[var(--card-background)] border border-[var(--border-color)] rounded-lg mt-1 shadow-lg scrollbar">
            {filtered.length > 0 ? (
              filtered.map((opt) => (
                <li
                  key={opt.value}
                  onClick={() => {
                    onChange(opt);
                    setQuery(opt.label || "");
                    setIsOpen(false);
                  }}
                  className="px-3 py-2 cursor-pointer hover:bg-[var(--card-hover)]"
                >
                  {opt.label}
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-gray-400">No results</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
