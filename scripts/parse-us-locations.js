/**
 * Parse US locations CSV and generate structured JSON
 * Flow: Region → State → City
 * Run: node scripts/parse-us-locations.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.resolve(__dirname, '../us_cities_states_counties.csv');
const outputPath = path.resolve(__dirname, '../src/constants/USLocationsData.json');

const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n').filter(line => line.trim());

// Parse CSV
const data = lines.slice(1).map(line => {
  const parts = line.split('|');
  if (parts.length < 4) return null;
  return {
    city: parts[0]?.trim(),
    stateShort: parts[1]?.trim(),
    stateFull: parts[2]?.trim(),
    county: parts[3]?.trim(),
    cityAlias: parts[4]?.trim() || null
  };
}).filter(Boolean);

// Custom Regions → States mapping (ponytail: explicit mapping, no magic)
const regionStatesMap = {
  "NY-NJ-DE": ["NY", "NJ", "DE"],
  "PHIL / PA CITIES": ["PA"],
  "CT/MAS/NH/VT (NE)": ["CT", "MA", "NH", "VT"],
  "DMV / BALTIMORE": ["DC", "MD", "VA"],
  "7-Cities / Richmond": ["VA"],
  "Detroit": ["MI"],
  "Atlanta": ["GA"],
  "Birmingham": ["AL"],
  "Columbus": ["OH"],
  "Florida": ["FL"],
  "Cincinnati": ["OH"],
  "Chicago": ["IL"],
  "Dallas": ["TX"],
  "Austin": ["TX"],
  "Houston": ["TX"],
  "San Antonio": ["TX"],
  "New Orleans": ["LA"],
  "Los Angeles": ["CA"],
  "Las Vegas": ["NV"],
  "Other": [] // All states for "Other"
};

// Extract unique states from data
const allStates = new Map();
data.forEach(item => {
  if (!allStates.has(item.stateShort)) {
    allStates.set(item.stateShort, {
      isoCode: item.stateShort,
      name: item.stateFull
    });
  }
});

// Build cities by state (from CSV)
const citiesByState = {};
data.forEach(item => {
  if (!citiesByState[item.stateShort]) {
    citiesByState[item.stateShort] = new Set();
  }
  citiesByState[item.stateShort].add(item.city);
});

// Convert to exportable format
const stateList = Array.from(allStates.values()).sort((a, b) => a.name.localeCompare(b.name));

// Build states by region
const statesByRegion = {};
for (const [region, stateCodes] of Object.entries(regionStatesMap)) {
  if (region === "Other") {
    // "Other" gets all states that aren't in other regions
    const usedStates = new Set(Object.values(regionStatesMap).flat());
    statesByRegion[region] = stateList
      .filter(s => !usedStates.has(s.isoCode))
      .map(s => s.isoCode);
  } else {
    statesByRegion[region] = stateCodes.map(code => {
      const state = stateList.find(s => s.isoCode === code);
      return state ? state.isoCode : code;
    }).filter(Boolean);
  }
}

// Convert cities Set to sorted arrays
const citiesByStateFinal = {};
for (const [state, cities] of Object.entries(citiesByState)) {
  citiesByStateFinal[state] = Array.from(cities).sort();
}

const result = {
  regionList: Object.keys(regionStatesMap),
  statesByRegion,
  stateList,
  citiesByState: citiesByStateFinal
};

fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');

console.log(`✅ Generated US locations data (Region → State → City):`);
console.log(`   - ${result.regionList.length} custom regions`);
console.log(`   - ${result.stateList.length} states`);
console.log(`   - ${Object.keys(result.citiesByState).length} states with city data`);
console.log(`   - Saved to: ${outputPath}`);
