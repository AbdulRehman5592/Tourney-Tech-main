// Shared helpers for the admin "Import Users from Excel" feature.
//
// Deliberately free of server-only imports (no mongoose, no node APIs) so the
// upload preview screen and the API route normalise and validate every row by
// exactly the same rules — what the admin sees in the preview is what the
// server will accept.

import { GEOGRAPHIC_REGIONS } from "@/constants/regions";

// Canonical columns, in the order the signup form asks for them. `key` doubles
// as the header name written into the downloadable template.
export const IMPORT_COLUMNS = [
  { key: "firstname", label: "First Name", required: true, example: "John" },
  { key: "lastname", label: "Last Name", required: true, example: "Doe" },
  { key: "username", label: "Nickname (optional)", required: false, example: "johnny" },
  { key: "email", label: "Email", required: true, example: "john.doe@example.com" },
  { key: "password", label: "Password (optional)", required: false, example: "" },
  { key: "dob", label: "Date of Birth (MM/DD)", required: true, example: "05/14" },
  { key: "phone", label: "Phone", required: true, example: "5551234567" },
  { key: "gender", label: "Gender", required: true, example: "male" },
  { key: "region", label: "Region", required: true, example: "Atlanta, GA" },
  { key: "stateCode", label: "State Code", required: true, example: "GA" },
  { key: "city", label: "City", required: true, example: "Atlanta" },
  { key: "subCity", label: "Sub City (optional)", required: false, example: "" },
  { key: "club", label: "Club", required: true, example: "Atlanta Spades Club" },
];

export const IMPORT_FIELD_KEYS = IMPORT_COLUMNS.map((c) => c.key);

// Header spellings an admin might realistically type, beyond the canonical key.
// Matching is done on the normalised header (lowercase, alphanumerics only), so
// "First Name", "first_name" and "FIRSTNAME" all collapse to "firstname".
const HEADER_ALIASES = {
  firstname: ["firstname", "first", "fname", "givenname"],
  lastname: ["lastname", "last", "lname", "surname", "familyname"],
  username: ["username", "nickname", "nick", "usernameoptional", "nicknameoptional", "displayname"],
  email: ["email", "emailaddress", "mail"],
  password: ["password", "pass", "pwd", "passwordoptional"],
  dob: ["dob", "dateofbirth", "birthday", "birthdate", "dobmmdd"],
  phone: ["phone", "phonenumber", "mobile", "mobilenumber", "contact", "contactnumber", "cell"],
  gender: ["gender", "sex"],
  region: ["region", "regionname", "regioncode"],
  stateCode: ["statecode", "state", "st", "stateabbr", "stateabbreviation"],
  city: ["city", "cityname"],
  subCity: ["subcity", "subcityoptional", "area", "locality"],
  club: ["club", "clubname", "teamclub"],
};

const KEY_BY_ALIAS = new Map();
for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
  for (const alias of aliases) KEY_BY_ALIAS.set(alias, key);
}

const GENDERS = ["male", "female", "other"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Mirrors the `dob` match validator on the User model.
const DOB_RE = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])$/;

const KNOWN_REGION_NAMES = new Set(
  GEOGRAPHIC_REGIONS.map((r) => normalizeHeader(r.name))
);

function pad2(n) {
  return String(n).padStart(2, "0");
}

export function normalizeHeader(header) {
  return String(header ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

// Maps a sheet header to a canonical field key, or null when unrecognised.
export function headerToFieldKey(header) {
  return KEY_BY_ALIAS.get(normalizeHeader(header)) ?? null;
}

function text(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

// Excel hands DOB back in several shapes depending on how the cell was typed:
// a real Date (when parsed with cellDates), a serial number, or free text.
// Everything collapses to the "MM/DD" string the User model stores.
export function normalizeDob(value) {
  if (value === null || value === undefined || value === "") return "";

  if (value instanceof Date && !isNaN(value)) {
    return `${pad2(value.getMonth() + 1)}/${pad2(value.getDate())}`;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    // Only treat a number as an Excel date serial when it's big enough to be a
    // real date cell (1000 = 1902-09-26). A bare "14" typed into the column is
    // a mistake, not a date, and must not be silently turned into one.
    if (value < 1000) return "";
    // Excel serial -> epoch ms. 25569 = days between 1899-12-30 and 1970-01-01;
    // read back in UTC so a timezone offset can't shift the day.
    const d = new Date(Math.round((value - 25569) * 86400 * 1000));
    if (isNaN(d)) return "";
    return `${pad2(d.getUTCMonth() + 1)}/${pad2(d.getUTCDate())}`;
  }

  const raw = text(value);
  if (!raw) return "";

  // YYYY-MM-DD (ISO, and what a CSV round-trip often produces)
  const iso = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (iso) return `${pad2(iso[2])}/${pad2(iso[3])}`;

  // MM/DD, MM/DD/YYYY, M-D, M.D.YY ...
  const md = raw.match(/^(\d{1,2})[-/.](\d{1,2})(?:[-/.](\d{2,4}))?$/);
  if (md) return `${pad2(md[1])}/${pad2(md[2])}`;

  return "";
}

export function normalizePhone(value) {
  return text(value).replace(/\D/g, "");
}

export function normalizeGender(value) {
  const raw = text(value).toLowerCase();
  if (raw === "m") return "male";
  if (raw === "f") return "female";
  return raw;
}

// Strips a nickname down to the slug used for auto-generated usernames and for
// the default password.
export function slugify(value) {
  return text(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

// Default password when the sheet leaves the column blank: the user's nickname
// followed by 12345 (e.g. nickname "johnny" -> "johnny12345"). Falls back to
// firstname+lastname when no nickname was supplied.
export function defaultPasswordFor(row) {
  const base =
    slugify(row.username) || slugify(`${row.firstname}${row.lastname}`) || "user";
  return `${base}12345`;
}

// Turns one raw sheet row (keyed by original headers) into a canonical,
// normalised row. `rowNumber` is the 1-based spreadsheet row, so error messages
// point at what the admin sees in Excel.
export function buildImportRow(rawRow, rowNumber) {
  const mapped = {};
  for (const [header, value] of Object.entries(rawRow || {})) {
    const key = headerToFieldKey(header);
    // First header wins, so a stray duplicate column can't silently blank a
    // value that an earlier column already filled.
    if (key && (mapped[key] === undefined || mapped[key] === "")) {
      mapped[key] = value;
    }
  }

  const row = {
    _row: rowNumber,
    firstname: text(mapped.firstname),
    lastname: text(mapped.lastname),
    username: text(mapped.username).toLowerCase(),
    email: text(mapped.email).toLowerCase(),
    password: text(mapped.password),
    dob: normalizeDob(mapped.dob),
    phone: normalizePhone(mapped.phone),
    gender: normalizeGender(mapped.gender),
    region: text(mapped.region),
    stateCode: text(mapped.stateCode).toUpperCase(),
    city: text(mapped.city),
    subCity: text(mapped.subCity),
    club: text(mapped.club),
  };

  row.password = row.password || defaultPasswordFor(row);
  return row;
}

// True when every canonical field is empty — a trailing blank row in the sheet
// rather than a genuine record, so it gets dropped instead of reported failed.
export function isBlankRow(row) {
  return IMPORT_FIELD_KEYS.every((key) => {
    if (key === "password") return true; // always auto-filled
    return !row[key];
  });
}

// Field-level validation. Returns an array of human-readable problems; empty
// means the row is safe to hand to the User model.
export function validateImportRow(row) {
  const errors = [];

  if (!row.firstname) errors.push("First name is required");
  if (!row.lastname) errors.push("Last name is required");
  if (!row.club) errors.push("Club is required");
  if (!row.city) errors.push("City is required");
  if (!row.region) errors.push("Region is required");

  if (!row.email) errors.push("Email is required");
  else if (!EMAIL_RE.test(row.email)) errors.push(`Invalid email "${row.email}"`);

  if (!row.dob) errors.push("Date of birth is required");
  else if (!DOB_RE.test(row.dob))
    errors.push(`Invalid date of birth "${row.dob}" (expected MM/DD)`);

  if (!row.phone) errors.push("Phone is required");
  else if (!/^\d{10,15}$/.test(row.phone))
    errors.push(`Invalid phone "${row.phone}" (10-15 digits)`);

  if (!row.stateCode) errors.push("State code is required");
  else if (!/^[A-Z]{2}$/.test(row.stateCode))
    errors.push(`Invalid state code "${row.stateCode}" (2 letters, e.g. GA)`);

  if (!row.gender) errors.push("Gender is required");
  else if (!GENDERS.includes(row.gender))
    errors.push(`Invalid gender "${row.gender}" (male, female or other)`);

  return errors;
}

// Non-blocking notes shown next to a row. A region the built-in table doesn't
// recognise still imports — the server falls back to admin-added regions and
// finally to "00" (Other) — but the admin should be told it may not have matched.
export function warnUnknownRegion(row) {
  if (!row.region) return null;
  const raw = row.region.trim();
  if (/^\d{2,}$/.test(raw)) return null;
  if (KNOWN_REGION_NAMES.has(normalizeHeader(raw))) return null;
  return `Region "${row.region}" is not one of the standard regions`;
}
