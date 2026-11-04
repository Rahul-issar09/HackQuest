/**
 * Starts a local, persistent MongoDB for development WITHOUT installing MongoDB or Docker.
 * Data is stored in ./.mongo-data (git-ignored) and survives restarts.
 *   npm run db:dev      -> mongodb://127.0.0.1:27017
 * Alternatives: a local mongod, Docker (`docker run -p 27017:27017 mongo`), or MongoDB Atlas.
 */
import fs from "node:fs";
import path from "node:path";
import { MongoMemoryServer } from "mongodb-memory-server";

async function main() {
  const dbPath = path.resolve(process.cwd(), ".mongo-data");
  fs.mkdirSync(dbPath, { recursive: true });
  const server = await MongoMemoryServer.create({
    instance: { port: 27017, dbPath, storageEngine: "wiredTiger" },
  });
  console.log(`MongoDB running at ${server.getUri()}  (data: ${dbPath})`);
  console.log("Set MONGODB_URI=mongodb://127.0.0.1:27017 in .env.local. Press Ctrl+C to stop.");
  const stop = async () => {
    await server.stop({ doCleanup: false });
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  setInterval(() => undefined, 1 << 30);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
