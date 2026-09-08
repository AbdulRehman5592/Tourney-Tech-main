import mongoose from "mongoose";
import dotenv from "dotenv";

// Only used when this file is imported directly by a standalone script (the
// Next.js app itself already injects .env.local before any app code runs).
// dotenv never overrides a variable that's already set, so this is a no-op
// there -- it only matters for scripts run via plain `node`.
dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("❌ MONGODB_URI not defined in environment variables");
}

let cached = globalThis._mongoose;

if (!cached) {
  cached = globalThis._mongoose = { conn: null, promise: null };
}

export const connectDB = async () => {
  if (cached.conn) {
    console.log("✅ Using existing MongoDB connection");
    return cached.conn;
  }

  if (!cached.promise) {
    console.log("🔌 Connecting to MongoDB...");
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        dbName: "tourney-techs",
        serverSelectionTimeoutMS: 10000, // 10 second timeout
        socketTimeoutMS: 45000, // 45 second socket timeout
        family: 4, // Use IPv4, skip trying IPv6
      })
      .then((mongoose) => {
        console.log("✅ MongoDB connected:", mongoose.connection.name);
        console.log("✅ Database name:", mongoose.connection.db.namespace);
        return mongoose;
      })
      .catch((err) => {
        console.error("❌ MongoDB connection error:", err);
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};
