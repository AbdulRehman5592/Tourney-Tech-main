"use client";

import { useState, useEffect } from "react";
import { regionList, stateList, stateCitiesMap, clubList } from "@/constants/RegionData";

export default function CitySelector({
  stateCode,
  setStateCode,
  city,
  setCity,
  subCity,
  setSubCity,
  club,
  setClub,
}) {
  const [regions, setRegions] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  // Load all regions & states once
  useEffect(() => {
    setRegions(regionList);
    setStates(stateList);
  }, []);

  // 🔥 Load cities when stateCode changes
  useEffect(() => {
    if (stateCode) {
      const cityList = stateCitiesMap[stateCode] || [];
      setCities(cityList.map((c) => ({ code: c, name: c })));
    } else {
      setCities([]);
      setSubCity("");
    }
  }, [stateCode]);

  // ✅ Sync values when user is in edit mode and props change
  useEffect(() => {
    if (city && regions.includes(city) === false) setRegions((prev) => [...prev, city]);
    if (stateCode && !states.find((s) => s.isoCode === stateCode)) {
      setStates((prev) => [...prev, { isoCode: stateCode, name: stateCode }]);
    }

    // If editing and we already have a stateCode, ensure city dropdown loads
    if (stateCode) {
      const cityList = stateCitiesMap[stateCode] || [];
      setCities(cityList.map((c) => ({ code: c, name: c })));
    }
  }, [city, stateCode, subCity, club]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Region */}
      <div>
        <label className="block mb-2 text-sm font-medium text-white">Region</label>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          required
          className="w-full px-4 py-2 rounded-md border"
          style={{
            backgroundColor: "var(--secondary-color)",
            borderColor: "var(--border-color)",
            color: "var(--foreground)",
          }}
        >
          <option value="">Select Region</option>
          {regions.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
      </div>

      {/* State */}
      <div>
        <label className="block mb-2 text-sm font-medium text-white">State</label>
        <select
          value={stateCode}
          onChange={(e) => setStateCode(e.target.value)}
          required
          className="w-full px-4 py-2 rounded-md border"
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
        <label className="block mb-2 text-sm font-medium text-white">City</label>
        <select
          value={subCity}
          onChange={(e) => setSubCity(e.target.value)}
          required
          disabled={!cities.length}
          className="w-full px-4 py-2 rounded-md border"
          style={{
            backgroundColor: "var(--secondary-color)",
            borderColor: "var(--border-color)",
            color: "var(--foreground)",
          }}
        >
          <option value="">Select City</option>
          {cities.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Club */}
      <div>
        <label className="block mb-2 text-sm font-medium text-white">Club</label>
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
          {clubList.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
