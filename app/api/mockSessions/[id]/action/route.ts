import { Types } from "mongoose";
import { ChallengeAttempt, MockChallengeResult, MockSession } from "@/lib/db/models";
import { applyAction, type TimerAction, type TimerState } from "@/lib/mock/timer";
import { HttpError, ok, readJson, route } from "@/lib/server/api";
import { toDto } from "@/lib/server/serialize";
import { zId } from "@/lib/validation/schemas";
import { z } from "zod";

export const dynamic = "force-dynamic";

const body = z.object({ action: z.enum(["start", "pause", "resume", "finish", "discard"]) });

/** Timer transitions use the server clock; remaining time is always derived from the stored timestamps. */
export const POST = route<{ id: string }>(async (req, { id }) => {
  zId.parse(id);
  const { action } = body.parse(await readJson(req));
  const mock = await MockSession.findById(id).lean();
  if (!mock) throw new HttpError(404, "Not found");
  const state: TimerState = {
    status: mock.status, durationMinutes: mock.durationMinutes,
    startedAt: mock.startedAt?.toISOString() ?? null, pausedAt: mock.pausedAt?.toISOString() ?? null,
    pausedTotalMs: mock.pausedTotalMs, endedAt: mock.endedAt?.toISOString() ?? null,
  };
  if (action === "start") {
    const other = await MockSession.findOne({ status: "active", _id: { $ne: mock._id } }).lean();
    if (other) throw new HttpError(409, `Another mock ("${other.title}") is already active. Finish or discard it first.`);
  }
  let patch: Partial<TimerState>;
  try {
    patch = applyAction(state, action as TimerAction);
  } catch (e) {
    throw new HttpError(409, (e as Error).message);
  }
  const set: Record<string, unknown> = { ...patch };
  for (const k of ["startedAt", "endedAt", "pausedAt"] as const) if (typeof set[k] === "string") set[k] = new Date(set[k] as string);
  const doc = await MockSession.findByIdAndUpdate(id, { $set: set }, { new: true }).lean();

  if (action === "start") {
    // make sure there is a result row per selected challenge
    const existing = new Set((await MockChallengeResult.find({ mockSessionId: mock._id }).select("challengeId").lean()).map((r) => String(r.challengeId)));
    const missing = mock.challengeIds.filter((c) => !existing.has(String(c)));
    if (missing.length) await MockChallengeResult.insertMany(missing.map((c) => ({ mockSessionId: mock._id, challengeId: c })));
  }
  if (action === "finish") await syncAttempts(mock._id, doc?.endedAt ?? new Date());
  return ok(toDto(doc));
});

/** On finish: turn mock results into challenge attempts (idempotent) so analytics reflect them. */
async function syncAttempts(mockId: Types.ObjectId, endedAt: Date) {
  await ChallengeAttempt.deleteMany({ mockSessionId: mockId });
  const results = await MockChallengeResult.find({ mockSessionId: mockId, status: { $ne: "not_started" } }).lean();
  const mock = await MockSession.findById(mockId).lean();
  for (const r of results) {
    const prior = await ChallengeAttempt.countDocuments({ challengeId: r.challengeId });
    const minutes = r.startedAt && r.completedAt ? Math.max(1, Math.round((r.completedAt.getTime() - r.startedAt.getTime()) / 60000)) : null;
    await ChallengeAttempt.create({
      challengeId: r.challengeId, mockSessionId: mockId, attemptedAt: r.completedAt ?? r.startedAt ?? endedAt,
      status: r.status === "solved" ? "solved" : r.status === "skipped" ? "skipped" : "attempted",
      durationMinutes: minutes, attemptNumber: prior + 1, pointsAvailable: r.pointsAvailable, scoreAwarded: r.pointsAwarded,
      notes: `Recorded in mock: ${mock?.title ?? ""}. ${r.notes ?? ""}`.trim(),
    });
  }
}
