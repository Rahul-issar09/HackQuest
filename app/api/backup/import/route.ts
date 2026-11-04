import { ok, readJson, route } from "@/lib/server/api";
import { importBackup } from "@/lib/server/backup";
import { z } from "zod";

export const dynamic = "force-dynamic";

const body = z.object({
  backup: z.unknown(),
  mode: z.enum(["merge", "replace"]),
  dryRun: z.boolean().default(true),
  confirm: z.string().optional(),
});

/** Preview (dryRun: true) validates and returns counts. Applying a replace needs confirm === "REPLACE". */
export const POST = route(async (req) => {
  const b = body.parse(await readJson(req, 50_000_000));
  if (!b.dryRun && b.mode === "replace" && b.confirm !== "REPLACE") {
    return ok({ error: 'Type "REPLACE" to confirm replacing all data' }, 400);
  }
  return ok(await importBackup(b.backup, b.mode, b.dryRun));
});
