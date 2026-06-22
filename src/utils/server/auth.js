// src/utils/server/auth.js

import { cookies } from "next/headers";
import { verifyAccessToken } from "@/utils/server/tokens";
import { ApiError } from "@/utils/server/ApiError";
import { User } from "@/models/User";

export async function requireAuth({ populateUser = true } = {}) {
  // const token = await cookies().get("accessToken")?.value;
  
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) throw new ApiError(401, "Access token missing");

  const decoded = verifyAccessToken(token);
  if (!decoded || !decoded._id) {
    throw new ApiError(401, "Invalid or expired access token");
  }

  if (!populateUser) return decoded;

  const user = await User.findById(decoded._id)
    .select("-password -refreshToken -__v")
    .lean();
  if (!user) throw new ApiError(401, "User not found");

  return user;
}

export function requireRole(user, allowedRoles = []) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!user?.role || !roles.includes(user.role)) {
    throw new ApiError(403, "Access denied: insufficient permissions");
  }
}
