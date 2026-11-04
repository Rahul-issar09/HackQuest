import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

let server: MongoMemoryServer;
type Mods = {
  repo: typeof import("@/lib/server/repository");
  seed: typeof import("@/lib/server/seed");
  backup: typeof import("@/lib/server/backup");
  models: typeof import("@/lib/db/models");
  analytics: typeof import("@/lib/analytics");
  toDto: typeof import("@/lib/server/serialize").toDto;
};
let m: Mods;

beforeAll(async () => {
  server = await MongoMemoryServer.create();
  process.env.MONGODB_URI = server.getUri();
  process.env.MONGODB_DB = "hq_test";
  const { connectDb } = await import("@/lib/db/mongodb");
  await connectDb();
  m = {
    repo: await import("@/lib/server/repository"),
    seed: await import("@/lib/server/seed"),
    backup: await import("@/lib/server/backup"),
    models: await import("@/lib/db/models"),
    analytics: await import("@/lib/analytics"),
    toDto: (await import("@/lib/server/serialize")).toDto,
  };
});
afterAll(async () => {
  await mongoose.disconnect();
  await server?.stop();
});

describe("seeding", () => {
  it("seeds once and is idempotent", async () => {
    await m.seed.ensureSeeded();
    await m.seed.seedAll(); // running again must not duplicate
    expect(await m.models.RoadmapDay.countDocuments()).toBe(31);
    expect(await m.models.Resource.countDocuments()).toBe(11);
    expect(await m.models.NoteFolder.countDocuments()).toBe(11);
    expect(await m.models.MockSession.countDocuments()).toBe(3);
    expect(await m.models.ChallengeAttempt.countDocuments()).toBe(0); // no fake activity
    const s = await m.models.Settings.findOne({ key: "singleton" }).lean();
    expect(s?.examDate.toISOString().slice(0, 10)).toBe("2026-12-05");
    const first = await m.models.RoadmapDay.findOne({ dayNumber: 1 }).lean();
    expect(first?.date.toISOString().slice(0, 10)).toBe("2026-11-04");
  });
});

describe("repository", () => {
  it("validates input and references", async () => {
    await expect(m.repo.create("resources", { title: "", url: "nope", category: "" })).rejects.toThrow();
    await expect(m.repo.create("challengeAttempts", { challengeId: "a".repeat(24), attemptedAt: new Date().toISOString(), status: "solved" })).rejects.toThrow(/not found|Referenced/i);
  });
  it("records multiple attempts per challenge and derives analytics from attempts", async () => {
    const ch = (await m.repo.create("challenges", { title: "T1", category: "Web Security", difficulty: "intermediate" })) as { id: string };
    await m.repo.create("challengeAttempts", { challengeId: ch.id, attemptedAt: "2026-11-10T10:00:00Z", status: "failed", durationMinutes: 40, hintsUsed: 2 });
    await m.repo.create("challengeAttempts", { challengeId: ch.id, attemptedAt: "2026-11-11T10:00:00Z", status: "solved", durationMinutes: 25 });
    const { items } = (await m.repo.list("challengeAttempts", new URLSearchParams({ challengeId: ch.id }))) as { items: { attemptNumber: number; durationMinutes: number }[] };
    expect(items.map((i) => i.attemptNumber).sort()).toEqual([1, 2]);
    const a = m.toDto<import("@/lib/types").AttemptDto[]>(await m.models.ChallengeAttempt.find().lean());
    const c = m.toDto<import("@/lib/types").ChallengeDto[]>(await m.models.Challenge.find().lean());
    const o = m.analytics.overallStats(a);
    expect(o.attempts).toBe(2);
    expect(o.uniqueChallengesAttempted).toBe(1);
    expect(o.firstAttemptSolveRate).toBe(0);
    expect(m.analytics.retryQueue(a, c)).toHaveLength(0); // solved later -> leaves queue, history kept
    expect(await m.models.ChallengeAttempt.countDocuments()).toBe(2);
  });
  it("note optimistic concurrency returns 409 for stale saves", async () => {
    const n = (await m.repo.create("notes", { title: "x", markdownBody: "a" })) as { id: string; lastSavedAt: string };
    const saved = (await m.repo.update("notes", n.id, { markdownBody: "b", expectedLastSavedAt: n.lastSavedAt })) as { lastSavedAt: string };
    await expect(m.repo.update("notes", n.id, { markdownBody: "c", expectedLastSavedAt: n.lastSavedAt })).rejects.toMatchObject({ status: 409 });
    const ok = (await m.repo.update("notes", n.id, { markdownBody: "d", expectedLastSavedAt: saved.lastSavedAt })) as { markdownBody: string };
    expect(ok.markdownBody).toBe("d");
  });
  it("note search finds title and content", async () => {
    await m.repo.create("notes", { title: "Unique-Title-Zeta", markdownBody: "hello world nmap -sV" });
    const byTitle = (await m.repo.list("notes", new URLSearchParams({ q: "unique-title" }))) as { items: unknown[] };
    const byBody = (await m.repo.list("notes", new URLSearchParams({ q: "nmap -sV" }))) as { items: unknown[] };
    expect(byTitle.items).toHaveLength(1);
    expect(byBody.items).toHaveLength(1);
    // regex metacharacters are treated literally (no injection)
    const evil = (await m.repo.list("notes", new URLSearchParams({ q: ".*" }))) as { items: unknown[] };
    expect(evil.items).toHaveLength(0);
  });
});

describe("backup", () => {
  it("round-trips: export -> full reset -> replace import restores records", async () => {
    const before = await m.backup.exportBackup();
    const counts = Object.fromEntries(Object.entries(before.data).map(([k, v]) => [k, v.length]));
    expect(before.schemaVersion).toBe(1);
    const preview = await m.backup.importBackup(before, "replace", true);
    expect(preview.applied).toBe(false);
    expect(Object.values(preview.report.counts).every((c) => c.invalid === 0)).toBe(true);

    await m.seed.fullReset();
    expect(await m.models.Note.countDocuments()).toBe(0);
    const res = await m.backup.importBackup(JSON.parse(JSON.stringify(before)), "replace", false);
    expect(res.applied).toBe(true);
    const after = await m.backup.exportBackup();
    for (const [k, n] of Object.entries(counts)) expect(after.data[k]).toHaveLength(n);
    expect(await m.models.ChallengeAttempt.countDocuments()).toBe(2);
    expect(await m.models.RoadmapDay.countDocuments()).toBe(31);
    // seeding must not run again on top of restored data
    const s = await m.models.Settings.findOne({ key: "singleton" }).lean();
    expect(s?.seedVersion).toBe(1);
  });
  it("merge keeps existing records and rejects invalid files", async () => {
    const b = await m.backup.exportBackup();
    await m.backup.importBackup(b, "merge", false);
    expect(await m.models.RoadmapDay.countDocuments()).toBe(31); // no duplicates
    const bad = await m.backup.importBackup({ hello: "world" }, "merge", true);
    expect(bad.report.fatal).toBeTruthy();
    const broken = JSON.parse(JSON.stringify(b));
    broken.data.resources[0].url = "javascript:alert(1)";
    const pv = await m.backup.importBackup(broken, "merge", true);
    expect(pv.report.counts.resources.invalid).toBe(1);
    await expect(m.backup.importBackup(broken, "merge", false)).rejects.toThrow(/invalid/i);
  });
});

describe("deletion rules", () => {
  it("deleting a challenge removes its attempts and unlinks notes", async () => {
    const ch = (await m.repo.create("challenges", { title: "Del me", category: "Linux" })) as { id: string };
    await m.repo.create("challengeAttempts", { challengeId: ch.id, attemptedAt: new Date().toISOString(), status: "failed" });
    const n = (await m.repo.create("notes", { title: "linked", linkedChallengeIds: [ch.id] })) as { id: string };
    await m.repo.remove("challenges", ch.id);
    expect(await m.models.ChallengeAttempt.countDocuments({ challengeId: ch.id })).toBe(0);
    const note = (await m.repo.getOne("notes", n.id)) as { linkedChallengeIds: string[] };
    expect(note.linkedChallengeIds).toEqual([]);
  });
});
