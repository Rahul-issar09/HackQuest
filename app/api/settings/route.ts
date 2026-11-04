import { Settings } from "@/lib/db/models";
import { HttpError, ok, readJson, route } from "@/lib/server/api";
import { toDto } from "@/lib/server/serialize";
import { settingsSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const doc = await Settings.findOne({ key: "singleton" }).lean();
  if (!doc) throw new HttpError(404, "Settings not initialised");
  return ok(toDto(doc));
});

export const PATCH = route(async (req) => {
  const body = settingsSchema.partial().parse(await readJson(req));
  const current = await Settings.findOne({ key: "singleton" }).lean();
  if (!current) throw new HttpError(404, "Settings not initialised");
  const start = body.preparationStartDate ?? current.preparationStartDate;
  const exam = body.examDate ?? current.examDate;
  if (exam < start) throw new HttpError(422, "Validation failed", { examDate: "Exam date must be on or after the preparation start date" });
  if (body.readinessWeights) {
    const w = body.readinessWeights;
    if (w.learning + w.ctf + w.coverage + w.mock + w.reporting <= 0) {
      throw new HttpError(422, "Validation failed", { readinessWeights: "At least one weight must be above zero" });
    }
  }
  const doc = await Settings.findOneAndUpdate({ key: "singleton" }, { $set: body }, { new: true, runValidators: true }).lean();
  return ok(toDto(doc));
});
