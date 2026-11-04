/**
 * Idempotent seed: `npm run seed`. Safe to run repeatedly; it only seeds when settings.seedVersion < SEED_VERSION.
 * (The app also seeds once automatically on its first API request.)
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

async function main() {
  const { connectDb } = await import("../lib/db/mongodb");
  const { ensureSeeded } = await import("../lib/server/seed");
  const { RoadmapDay, Resource, Challenge } = await import("../lib/db/models");
  const mongoose = await connectDb();
  await ensureSeeded();
  const [d, r, c] = await Promise.all([RoadmapDay.countDocuments(), Resource.countDocuments(), Challenge.countDocuments()]);
  console.log(`Seed complete: ${d} roadmap days, ${r} resources, ${c} challenges.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
