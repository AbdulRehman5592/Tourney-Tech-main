import { User } from "@/models/User";
import { connectDB } from "@/lib/mongoose";
import { ApiResponse } from "@/utils/server/ApiResponse";
import { ApiError } from "@/utils/server/ApiError";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { parseForm } from "@/utils/server/parseForm";
import { requireAdmin } from "@/utils/server/roleGuards";
import { resolveRegionCodeAsync } from "@/utils/server/regionLookup";
import { createOrUpdateRegistration } from "@/utils/server/tournamentRegistration";
import { buildImportRow, validateImportRow, slugify } from "@/utils/userImport";

// Creates a brand-new player account AND registers it for a tournament's games
// in one admin action — the case a tournament director hits when a walk-in
// player has no Tourney Techs account yet.
//
// The two steps are treated as one unit: if the registration fails, the account
// created moments earlier is removed again, so a retry doesn't collide with a
// half-registered user left behind by the previous attempt.
export const POST = asyncHandler(async (req) => {
  const admin = await requireAdmin();
  await connectDB();

  const { fields } = await parseForm(req);

  const {
    newUser,
    tournamentId,
    gameIds,
    paymentMethod,
    paymentDetails: rawPaymentDetails,
  } = fields || {};

  if (!newUser || typeof newUser !== "object") {
    throw new ApiError(400, "Player details are required.");
  }

  const paymentDetails =
    typeof rawPaymentDetails === "string"
      ? JSON.parse(rawPaymentDetails)
      : rawPaymentDetails;

  // Same normalisation and field rules as the Excel import, so a player added
  // by hand and one added from a sheet end up stored identically.
  const row = buildImportRow(newUser, 0);
  const errors = validateImportRow(row);
  if (errors.length) {
    throw new ApiError(400, errors.join("; "));
  }

  // ── Reject collisions before touching anything ──────────────────────────
  const dupConditions = [{ email: row.email }];
  if (row.username) dupConditions.push({ username: row.username });
  if (row.phone) dupConditions.push({ phone: row.phone });

  const clash = await User.findOne({ $or: dupConditions })
    .select("email username phone")
    .lean();

  if (clash) {
    if (clash.email === row.email) {
      throw new ApiError(
        409,
        `A player with email ${row.email} already exists — register them from the "Existing Player" tab instead.`
      );
    }
    if (row.username && clash.username === row.username) {
      throw new ApiError(409, `The nickname "${row.username}" is already taken.`);
    }
    throw new ApiError(409, `A player with phone ${row.phone} already exists.`);
  }

  // An admin-typed nickname is used as-is (a clash was rejected above); an
  // auto-derived one gets a numeric suffix so it can't fail on the unique index.
  let username = row.username;
  if (!username) {
    const base = slugify(`${row.firstname}${row.lastname}`) || "player";
    username = base;
    let suffix = 1;
    // eslint-disable-next-line no-await-in-loop
    while (await User.exists({ username })) {
      suffix += 1;
      username = `${base}${suffix}`;
    }
  }

  const region = await resolveRegionCodeAsync(row.region);

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

  // ── Register the freshly created account ────────────────────────────────
  let registration;
  try {
    ({ registration } = await createOrUpdateRegistration({
      tournamentId,
      userId: user._id.toString(),
      gameIds,
      paymentMethod,
      paymentDetails,
    }));
  } catch (err) {
    // Roll back the account so the admin can correct the form and retry
    // without tripping over "email already exists".
    await User.deleteOne({ _id: user._id }).catch((cleanupError) => {
      console.error(
        "Failed to roll back user after registration error:",
        cleanupError
      );
    });
    throw err;
  }

  return Response.json(
    new ApiResponse(
      201,
      {
        user: {
          _id: user._id,
          firstname: user.firstname,
          lastname: user.lastname,
          email: user.email,
          username: user.username,
          role: user.role,
        },
        password: row.password,
        registration,
      },
      `${user.firstname} ${user.lastname} was created and registered successfully`
    )
  );
});
