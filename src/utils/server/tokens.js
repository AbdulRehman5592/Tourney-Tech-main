// src\utils\server\tokens.js

import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET;

const ACCESS_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRY || "15m";
const REFRESH_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRY || "7d";

/**
 * Generate a JWT access token for the user
 *
 * @param {string} user
 */
export function generateAccessToken(user) {
  return jwt.sign(
    {
      _id: user._id,
      email: user.email,
      username: user.username,
    },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
}

/**
 * Generate a JWT refresh token for the user
 *
 * @param {string} user
 */
export function generateRefreshToken(user) {
  return jwt.sign({ _id: user._id }, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN,
  });
}

/**
 * Verify a JWT access token
 *
 * @param {string} token
 */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, ACCESS_SECRET);
  } catch (err) {
    console.log("Access Token Varification Error ", err);
    return null;
  }
}

/**
 * Verify a JWT refresh token
 *
 * @param {string} token
 */
export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch (err) {
    console.log("Refresh Token Verification Error", err);
    return null;
  }
}

/**
 * Sets access and refresh tokens as secure HTTP-only cookies
 *
 * @param {string} accessToken
 * @param {string} refreshToken
 */
export function setAuthCookies(response, accessToken, refreshToken) {
  // const cookieStore = cookies();

  response.cookies.set("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: ACCESS_EXPIRES_IN,
    path: "/",
  });

  response.cookies.set("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: REFRESH_EXPIRES_IN,
    path: "/",
  });

  return response;
}

/**
 * Clears access and refresh tokens as secure HTTP-only cookies
 *
 * @param {string} accessToken
 * @param {string} refreshToken
 */
export async function clearAuthCookies() {
  const cookieStore = await cookies();

  cookieStore.delete("accessToken");
  cookieStore.delete("refreshToken");
}

/*
Example usage after login/register


import { generateAccessToken, generateRefreshToken } from "@/utils/server/tokens";

const accessToken = generateAccessToken(user);
const refreshToken = generateRefreshToken(user);
*/
