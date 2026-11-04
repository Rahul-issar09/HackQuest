import "server-only";
import mongoose from "mongoose";

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const g = globalThis as unknown as { __hqMongoose?: Cache };
const cache: Cache = (g.__hqMongoose ??= { conn: null, promise: null });

export class ConfigError extends Error {}

/** Cached connection (survives Next.js dev hot reloads). Never logs the connection string. */
export async function connectDb(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new ConfigError(
      "MONGODB_URI is not set. Copy .env.example to .env.local and set your MongoDB connection string.",
    );
  }
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, {
        dbName: process.env.MONGODB_DB || "hackquest_prep",
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000,
        maxPoolSize: 10,
        bufferCommands: false,
      })
      .catch((err) => {
        cache.promise = null; // allow retry
        throw new ConfigError(`Could not connect to MongoDB (${(err as Error).message.split("\n")[0]})`);
      });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}
