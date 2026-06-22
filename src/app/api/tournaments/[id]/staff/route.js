import { Tournament } from "@/models/Tournament";
import { requireAuth } from "@/utils/server/auth";
// import { requireTournamentStaff } from "@/utils/server/tournamentPermissions";
import { ApiError } from "@/utils/server/ApiError";
import { asyncHandler } from "@/utils/server/asyncHandler";
import { User } from "@/models/User";
import { parseForm } from "@/utils/server/parseForm";
import { ApiResponse } from "@/utils/server/ApiResponse";

const allowedRoles = ["owner", "organizer", "manager", "support"];

// POST /api/tournaments/[id]/staff
export const PATCH = asyncHandler(async (req, context) => {
  const authUser = await requireAuth(req);
  const { id: tournamentId } = await context.params;
  const { fields } = await parseForm(req);

  const userId = fields?.userId?.toString();
  const role = fields?.role?.toString();

  if (!userId || !role) throw new ApiError(400, "userId and role are required");
  if (!allowedRoles.includes(role)) throw new ApiError(400, "Invalid role");

  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw new ApiError(404, "Tournament not found");

  const requester = await User.findById(authUser._id).lean();
  const isAdmin = requester?.roles?.includes("admin");

  const requesterStaffRole = tournament.staff.find(
    (m) => m.user.toString() === authUser._id.toString()
  )?.role;

  if (!isAdmin) {
    if (requesterStaffRole === "owner") {
      if (role === "owner") {
        throw new ApiError(403, "Owner cannot assign another owner");
      }
    } else if (requesterStaffRole === "organizer") {
      if (["owner", "organizer"].includes(role)) {
        throw new ApiError(
          403,
          "Organizer cannot assign owner or other organizers"
        );
      }
    } else {
      throw new ApiError(403, "You are not allowed to modify staff");
    }
  }

  const existing = tournament.staff.find((m) => m.user.toString() === userId);

  if (existing) {
    existing.role = role;
  } else {
    if (role === "owner" && tournament.staff.some((m) => m.role === "owner")) {
      throw new ApiError(400, "Tournament already has an owner");
    }

    tournament.staff.push({ user: userId, role });
  }

  await tournament.save();

  return Response.json(
    new ApiResponse(200, tournament, "Tournament staff updated successfully")
  );
});

// DELETE /api/tournaments/[id]/staff?userId=<id>
export const DELETE = asyncHandler(async (req, context) => {
  const authUser = await requireAuth(req);
  const { id: tournamentId } = await context.params;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) throw new ApiError(400, "Missing userId");

  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw new ApiError(404, "Tournament not found");

  const requester = await User.findById(authUser._id).lean();
  const isAdmin = requester?.roles?.includes("admin");

  const targetMember = tournament.staff.find(
    (m) => m.user.toString() === userId
  );
  if (!targetMember) throw new ApiError(404, "User is not a staff member");

  const requesterStaffRole = tournament.staff.find(
    (m) => m.user.toString() === authUser._id.toString()
  )?.role;

  if (targetMember.role === "owner") {
    const ownerCount = tournament.staff.filter(
      (m) => m.role === "owner"
    ).length;
    if (ownerCount === 1) {
      throw new ApiError(400, "Cannot remove the only owner");
    }
  }

  if (!isAdmin) {
    if (requesterStaffRole === "owner") {
      if (userId === authUser._id.toString()) {
        throw new ApiError(403, "Owner cannot remove themselves");
      }
      if (targetMember.role === "owner") {
        throw new ApiError(403, "Owner cannot remove another owner");
      }
    } else if (requesterStaffRole === "organizer") {
      if (userId === authUser._id.toString()) {
        throw new ApiError(403, "Organizer cannot remove themselves");
      }
      if (["owner", "organizer"].includes(targetMember.role)) {
        throw new ApiError(
          403,
          "Organizer cannot remove owner or other organizers"
        );
      }
    } else {
      throw new ApiError(403, "You are not allowed to remove staff");
    }
  }

  tournament.staff = tournament.staff.filter(
    (m) => m.user.toString() !== userId
  );

  await tournament.save();

  return Response.json({
    message: "Staff member removed",
    staff: tournament.staff,
  });
});

// GET /api/tournaments/[id]/staff
export const GET = asyncHandler(async (req, context) => {
  const authUser = await requireAuth(req);
  const { id: tournamentId } = await context.params;

  const tournament = await Tournament.findById(tournamentId)
    .populate("staff.user", "name email")
    .lean();

  if (!tournament) throw new ApiError(404, "Tournament not found");

  const requester = await User.findById(authUser._id).lean();
  const isAdmin = requester?.roles?.includes("admin");

  const requesterStaffRole = tournament.staff.find(
    (m) => m.user._id.toString() === authUser._id.toString()
  )?.role;

  if (!isAdmin && !["owner", "organizer"].includes(requesterStaffRole)) {
    throw new ApiError(403, "You are not authorized to view staff");
  }

  return Response.json({
    staff: tournament.staff.map((member) => ({
      _id: member.user._id,
      name: member.user.name,
      email: member.user.email,
      role: member.role,
    })),
  });
});
