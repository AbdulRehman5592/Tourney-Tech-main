import { User } from "@/models/User";
import { connectDB } from "@/lib/mongoose";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { parseForm } from "@/utils/server/parseForm";
import { requireAdmin } from "@/utils/server/roleGuards";
import { resolveRegionCodeAsync } from "@/utils/server/regionLookup";
import {
  buildImportRow,
  isBlankRow,
  validateImportRow,
  warnUnknownRegion,
  slugify,
} from "@/utils/userImport";

// Guards against an accidental 50k-row upload timing the request out. The
// preview screen enforces the same cap before it ever posts.
const MAX_ROWS = 2000;

// Bulk-create users from an admin-uploaded spreadsheet.
//
// The client parses the workbook and posts the raw rows; every row is
// re-normalised and re-validated here, so nothing trusts the browser. Rows are
// saved one at a time (never insertMany) because the User model hashes
// passwords in a pre("save") hook that bulk inserts would bypass.
export const POST = asyncHandler(async (req) => {
  const admin = await requireAdmin();
  await connectDB();

  const { fields } = await parseForm(req);
  const rawRows = fields?.rows;

  if (!Array.isArray(rawRows)) {
    throw new ApiError(400, "No rows received. Upload an Excel file and try again.");
  }
  if (rawRows.length === 0) {
    throw new ApiError(400, "The uploaded sheet has no data rows.");
  }
  if (rawRows.length > MAX_ROWS) {
    throw new ApiError(
      400,
      `Too many rows (${rawRows.length}). Import at most ${MAX_ROWS} users per file.`
    );
  }

  // ── Normalise + validate ────────────────────────────────────────────────
  const prepared = [];
  rawRows.forEach((raw, index) => {
    // Trust the client's row number only as a display hint; fall back to the
    // sheet position (header occupies row 1, so data starts at row 2).
    const rowNumber = Number(raw?._row) || index + 2;
    const row = buildImportRow(raw, rowNumber);
    if (isBlankRow(row)) return; // trailing empty row in the sheet
    prepared.push({ row, errors: validateImportRow(row) });
  });

  if (prepared.length === 0) {
    throw new ApiError(400, "The uploaded sheet has no usable data rows.");
  }

  // ── One round-trip to find everything that already exists ───────────────
  const valid = prepared.filter((p) => p.errors.length === 0).map((p) => p.row);
  const emails = [...new Set(valid.map((r) => r.email).filter(Boolean))];
  const usernames = [...new Set(valid.map((r) => r.username).filter(Boolean))];
  const phones = [...new Set(valid.map((r) => r.phone).filter(Boolean))];

  const takenEmails = new Set();
  const takenUsernames = new Set();
  const takenPhones = new Set();

  if (emails.length || usernames.length || phones.length) {
    const orConditions = [];
    if (emails.length) orConditions.push({ email: { $in: emails } });
    if (usernames.length) orConditions.push({ username: { $in: usernames } });
    if (phones.length) orConditions.push({ phone: { $in: phones } });

    const existing = await User.find({ $or: orConditions })
      .select("email username phone")
      .lean();

    for (const user of existing) {
      if (user.email) takenEmails.add(user.email.toLowerCase());
      if (user.username) takenUsernames.add(user.username.toLowerCase());
      if (user.phone) takenPhones.add(user.phone);
    }
  }

  // Values consumed by earlier rows of *this* file, so two identical rows in
  // one sheet can't both be created.
  const seenEmails = new Set();
  const seenUsernames = new Set();
  const seenPhones = new Set();

  // Picks a free username. A nickname the admin typed is used as-is (a clash is
  // reported as a duplicate); an auto-derived one gets a numeric suffix instead,
  // since the admin never chose it and shouldn't lose the row over it.
  const deriveUsername = (row) => {
    const base = slugify(`${row.firstname}${row.lastname}`) || "user";
    let candidate = base;
    let suffix = 1;
    while (takenUsernames.has(candidate) || seenUsernames.has(candidate)) {
      suffix += 1;
      candidate = `${base}${suffix}`;
    }
    return candidate;
  };

  // ── Create ──────────────────────────────────────────────────────────────
  const results = [];
  let created = 0;
  let skipped = 0;
  let failed = 0;

  const record = (row, status, message, extra = {}) => {
    results.push({
      row: row._row,
      name: `${row.firstname} ${row.lastname}`.trim(),
      email: row.email,
      status,
      message,
      ...extra,
    });
    if (status === "created") created += 1;
    else if (status === "skipped") skipped += 1;
    else failed += 1;
  };

  for (const { row, errors } of prepared) {
    if (errors.length) {
      record(row, "failed", errors.join("; "));
      continue;
    }

    if (takenEmails.has(row.email)) {
      record(row, "skipped", `A user with email ${row.email} already exists`);
      continue;
    }
    if (seenEmails.has(row.email)) {
      record(row, "skipped", `Duplicate email ${row.email} earlier in this sheet`);
      continue;
    }
    if (row.username && (takenUsernames.has(row.username) || seenUsernames.has(row.username))) {
      record(row, "skipped", `Nickname "${row.username}" is already taken`);
      continue;
    }
    if (row.phone && takenPhones.has(row.phone)) {
      record(row, "skipped", `A user with phone ${row.phone} already exists`);
      continue;
    }
    if (row.phone && seenPhones.has(row.phone)) {
      record(row, "skipped", `Duplicate phone ${row.phone} earlier in this sheet`);
      continue;
    }

    const username = row.username || deriveUsername(row);
    const region = await resolveRegionCodeAsync(row.region);

    try {
      const user = new User({
        firstname: row.firstname,
        lastname: row.lastname,
        email: row.email,
        username,
        password: row.password, // hashed by the User pre("save") hook
        phone: row.phone,
        gender: row.gender,
        city: row.city,
        subCity: row.subCity || undefined,
        stateCode: row.stateCode,
        dob: row.dob,
        club: row.club,
        region,
        role: "player",
        isVerified: true,
        createdBy: admin._id,
      });

      await user.save();

      takenEmails.add(row.email);
      seenEmails.add(row.email);
      takenUsernames.add(username);
      seenUsernames.add(username);
      if (row.phone) {
        takenPhones.add(row.phone);
        seenPhones.add(row.phone);
      }

      const notes = [];
      const regionWarning = warnUnknownRegion(row);
      if (regionWarning) notes.push(`${regionWarning} — saved as region ${region}`);
      if (username !== row.username && row.username) notes.push(`Nickname set to "${username}"`);

      record(row, "created", notes.join("; ") || "Created", {
        username,
        password: row.password,
      });
    } catch (err) {
      // A unique-index race (another import or signup landing mid-loop) reads
      // as a duplicate, not a failure the admin needs to fix in the sheet.
      if (err?.code === 11000) {
        const field = Object.keys(err.keyPattern || {})[0] || "value";
        record(row, "skipped", `A user with this ${field} already exists`);
      } else {
        record(row, "failed", err?.message || "Could not create user");
      }
    }
  }

  return Response.json(
    new ApiResponse(
      201,
      {
        summary: { total: results.length, created, skipped, failed },
        results,
      },
      `Import finished — ${created} created, ${skipped} skipped, ${failed} failed`
    )
  );
});
