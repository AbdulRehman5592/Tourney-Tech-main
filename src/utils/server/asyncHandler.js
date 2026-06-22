// src\utils\server\asyncHandler.js

import { connectDB } from "@/lib/mongoose";
import { NextResponse } from "next/server";

export const asyncHandler = (handler) => {
  return async (req, context) => {
    try {
      await connectDB();
      return await handler(req, context);
    } catch (error) {
      console.error("🔥 Unhandled API Error:", error);

      const status = error.statusCode || 500;

      return NextResponse.json(
        {
          success: false,
          message: error.message || "Internal Server Error",
          errors: error.errors || [],
        },
        { status }
      );
    }
  };
};
