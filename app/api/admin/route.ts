import { z } from "zod";
import { HttpError, ok, readJson, route } from "@/lib/server/api";
import { fullReset, resetSeededContent, restoreRoadmap } from "@/lib/server/seed";

export const dynamic = "force-dynamic";

const body = z.object({ action: z.enum(["restore-roadmap", "reset-seeded", "full-reset"]), confirm: z.string().optional() });

export const POST = route(async (req) => {
  const { action, confirm } = body.parse(await readJson(req));
  if (action === "full-reset") {
    if (confirm !== "DELETE ALL DATA") throw new HttpError(400, 'Type "DELETE ALL DATA" to confirm a full reset');
    await fullReset();
  } else if (action === "restore-roadmap") {
    await restoreRoadmap();
  } else {
    await resetSeededContent();
  }
  return ok({ done: true, action });
});
