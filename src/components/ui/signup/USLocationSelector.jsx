"use client";

import { useState, useEffect } from "react";
import { regionList, statesByRegion, stateList, citiesByState } from "@/constants/USLocationsData.json";

/**
 * US Location Selector with Region → State → City cascade
 * Ponytail: Simple JSON-based dropdowns, no complex state management
 */
export default function USLocationSelector({
  region,
  setRegion,
  stateCode,
  setStateCode,
  city,
  setCity,
  club,
  setClub,
}) {
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  // Load states when region changes
  useEffect(() => {
    if (region) {
      const stateCodes = statesByRegion[region] || [];
      const regionStates = stateList.filter(s => stateCodes.includes(s.isoCode));
      setStates(regionStates);
      setStateCode("");
      setCity("");
      setCities([]);
    } else {
      setStates([]);
      setStateCode("");
      setCity("");
      setCities([]);
    }
  }, [region]);

  // Load cities when state changes
  useEffect(() => {
    if (stateCode) {
      const cityList = citiesByState[stateCode] || [];
      setCities(cityList);
      setCity("");
    } else {
      setCities([]);
      setCity("");
    }
  }, [stateCode]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Region */}
      <div>
        <label className="block mb-2 text-sm font-medium">Region</label>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          required
          className="w-full px-4 py-2 rounded-md border"
          style={{
            backgroundColor: "var(--secondary-color)",
            borderColor: "var(--border-color)",
            color: "var(--foreground)",
          }}
        >
          <option value="">Select Region</option>
          {regionList.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* State */}
      <div>
        <label className="block mb-2 text-sm font-medium">State</label>
        <select
          value={stateCode}
          onChange={(e) => setStateCode(e.target.value)}
          required
          disabled={!region}
          className="w-full px-4 py-2 rounded-md border disabled:opacity-50"
          style={{
            backgroundColor: "var(--secondary-color)",
            borderColor: "var(--border-color)",
            color: "var(--foreground)",
          }}
        >
          <option value="">Select State</option>
          {states.map((s) => (
            <option key={s.isoCode} value={s.isoCode}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* City */}
      <div>
        <label className="block mb-2 text-sm font-medium">City</label>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          required
          disabled={!stateCode}
          className="w-full px-4 py-2 rounded-md border disabled:opacity-50"
          style={{
            backgroundColor: "var(--secondary-color)",
            borderColor: "var(--border-color)",
            color: "var(--foreground)",
          }}
        >
          <option value="">Select City</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Club */}
      <div>
        <label className="block mb-2 text-sm font-medium">Club</label>
        <select
          value={club}
          onChange={(e) => setClub(e.target.value)}
          required
          className="w-full px-4 py-2 rounded-md border"
          style={{
            backgroundColor: "var(--secondary-color)",
            borderColor: "var(--border-color)",
            color: "var(--foreground)",
          }}
        >
          <option value="">Select Club</option>
          {["7NO PLAYERS", "ALAMO 7NO", "AWC", "BEST OF THE WEST", "Other", "None"].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
