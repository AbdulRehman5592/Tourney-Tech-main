"use client";

import { useState, useEffect } from "react";
import { stateList, citiesByState } from "@/constants/USLocationsData.json";
import api from "@/utils/axios";

/**
 * US Location Selector
 * Flow: State → City (cascade), Playing Region (independent), Club
 * Region/Club options come from the admin-managed lists (/api/regions,
 * /api/clubs) so admin-added entries show up here without a redeploy.
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
  const [cities, setCities] = useState([]);
  const [regionList, setRegionList] = useState([]);
  const [clubList, setClubList] = useState([]);

  // Load admin-managed region/club options once.
  useEffect(() => {
    api
      .get("/api/regions")
      .then((res) => setRegionList((res.data?.data || []).map((r) => r.name)))
      .catch(() => setRegionList([]));
    api
      .get("/api/clubs")
      .then((res) => setClubList((res.data?.data || []).map((c) => c.name)))
      .catch(() => setClubList([]));
  }, []);

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
      {/* State */}
      <div>
        <label className="block mb-2 text-sm font-medium">State</label>
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
          {stateList.map((s) => (
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

      {/* Playing Region */}
      <div>
        <label className="block mb-2 text-sm font-medium">Playing Regions</label>
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
          <option value="">Select Playing Region</option>
          {regionList.map((r) => (
            <option key={r} value={r}>
              {r}
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
