import "server-only";
import { Types } from "mongoose";
import { DEFAULT_NOTE_FOLDERS, DEFAULT_READINESS_WEIGHTS, SCHEMA_VERSION, SEED_VERSION } from "../constants";
import {
  Challenge, LearningTask, MockSession, NoteFolder, Resource, RoadmapDay, Settings, MODELS,
} from "../db/models";
import { SEED_CHALLENGES } from "../../data/seed-challenges";
import { SEED_RESOURCES } from "../../data/seed-resources";
import { SEED_DAYS, SEED_MOCKS, type SeedDay } from "../../data/seed-roadmap";
import mongoose from "mongoose";

const utcDay = (key: string) => new Date(`${key}T00:00:00.000Z`);

function dayDoc(d: SeedDay) {
  return {
    dayNumber: d.n,
    date: utcDay(d.date),
    originalDate: utcDay(d.date),
    title: d.title,
    domain: d.domain,
    summary: d.note ? `${d.practice}. ${d.note}` : d.practice,
    objectives: d.topics.map((t) => (d.revision ? `Revise and extend: ${t}` : `Understand and practise: ${t}`)),
    topics: d.topics,
    estimatedMinutes: 240,
    relevanceClassification: d.relevance,
    ctfTarget: d.ctf,
    expectedOutcome: d.rest
      ? "Notes revised, tools verified, rested."
      : `Can explain ${d.topics[0]} and has logged at least one practice attempt.`,
    order: d.n,
    isRestOrRevisionDay: !!d.rest,
    isRevisionOfKnownTopic: !!d.revision,
  };
}

function tasksFor(d: SeedDay, dayId: Types.ObjectId, resByTitle: Map<string, Types.ObjectId>) {
  const resourceIds = d.resources.map((t) => resByTitle.get(t)).filter((x): x is Types.ObjectId => !!x);
  const verb = d.revision ? "Revise" : "Learn";
  const base = { roadmapDayId: dayId, status: "todo" as const, completedAt: null, notes: "" };
  if (d.rest) {
    return [
      { ...base, order: 1, taskType: "revision", title: "Revise notes", description: "Skim your notes and cheat sheets.", estimatedMinutes: 60, resourceIds: [] },
      { ...base, order: 2, taskType: "revision", title: "Verify tools and connectivity", description: "Check browser, VPN/proxy tooling you are permitted to use, CyberChef, Python, Wireshark/Ghidra installs.", estimatedMinutes: 30, resourceIds: [] },
      { ...base, order: 3, taskType: "report", title: "Check reporting template", description: "Open the current official TCS report template and size limit on the contest site; confirm screenshot workflow.", estimatedMinutes: 30, resourceIds: [] },
      { ...base, order: 4, taskType: "revision", title: "Rest", description: "Sleep well before the event.", estimatedMinutes: 30, resourceIds: [] },
    ];
  }
  if (d.n === 29) {
    return [
      { ...base, order: 1, taskType: "CTF", title: "Run the six-hour mock in the Mock CTF Arena", description: "Use the Dec 2 mock session. Record each challenge outcome.", estimatedMinutes: 360, resourceIds: [] },
      { ...base, order: 2, taskType: "report", title: "Draft a practice report for one solved challenge", description: "Use the Report Builder.", estimatedMinutes: 30, resourceIds: [] },
      { ...base, order: 3, taskType: "revision", title: "Post-mock review", description: "Review the post-mock analysis and write lessons learned.", estimatedMinutes: 30, resourceIds: [] },
    ];
  }
  if (d.n === 30) {
    return [
      { ...base, order: 1, taskType: "revision", title: "Review failed challenges", description: "Open the retry queue in CTF Challenges.", estimatedMinutes: 60, resourceIds: [] },
      { ...base, order: 2, taskType: "CTF", title: "Repeat failed challenges without walkthroughs", description: "Log each retry as a new attempt.", estimatedMinutes: 150, resourceIds: [] },
      { ...base, order: 3, taskType: "revision", title: "Update weakness notes", description: "Write down what still needs work.", estimatedMinutes: 30, resourceIds: [] },
    ];
  }
  return [
    { ...base, order: 1, taskType: "theory", title: `${verb}: ${d.topics.join(", ")}`, description: `Read/watch the theory for: ${d.topics.join(", ")}.`, estimatedMinutes: 60, resourceIds },
    { ...base, order: 2, taskType: "resource", title: `Work through: ${d.practice}`, description: "Follow the assigned resource.", estimatedMinutes: 90, resourceIds },
    { ...base, order: 3, taskType: "lab", title: "Hands-on lab", description: `Complete a practical exercise on ${d.topics[0]} (authorised labs only).`, estimatedMinutes: 45, resourceIds: [] },
    { ...base, order: 4, taskType: "CTF", title: `CTF target: ${d.ctf}`, description: "Attempt and log it in CTF Challenges.", estimatedMinutes: 30, resourceIds: [] },
    { ...base, order: 5, taskType: "revision", title: "Write notes", description: "Capture commands and lessons in My Notes, linked to this day.", estimatedMinutes: 15, resourceIds: [] },
  ];
}

async function seedResources() {
  const existing = new Set((await Resource.find().select("url").lean()).map((r) => r.url));
  const toAdd = SEED_RESOURCES.filter((r) => !existing.has(r.url));
  if (toAdd.length) await Resource.insertMany(toAdd);
  const all = await Resource.find().select("title").lean();
  return new Map(all.map((r) => [r.title, r._id as Types.ObjectId]));
}

/** Insert roadmap days + tasks. Existing days (matched by dayNumber) keep their _id so note links survive. */
export async function restoreRoadmap() {
  const resByTitle = await seedResources();
  const idByDay = new Map<number, Types.ObjectId>();
  for (const d of SEED_DAYS) {
    const doc = await RoadmapDay.findOneAndUpdate({ dayNumber: d.n }, { $set: dayDoc(d) }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true });
    idByDay.set(d.n, doc._id as Types.ObjectId);
  }
  const dayIds = [...idByDay.values()];
  await LearningTask.deleteMany({ roadmapDayId: { $in: dayIds } });
  const tasks = SEED_DAYS.flatMap((d) => tasksFor(d, idByDay.get(d.n)!, resByTitle));
  await LearningTask.insertMany(tasks);
  // link resources to roadmap days (only add; keep user links)
  for (const d of SEED_DAYS) {
    const rids = d.resources.map((t) => resByTitle.get(t)).filter(Boolean);
    if (rids.length) await Resource.updateMany({ _id: { $in: rids } }, { $addToSet: { linkedRoadmapDayIds: idByDay.get(d.n) } });
  }
  return idByDay;
}

async function seedCatalogue(idByDay: Map<number, Types.ObjectId>) {
  const existing = new Set((await Challenge.find().select("title platform").lean()).map((c) => `${c.platform}|${c.title}`));
  const docs = SEED_CHALLENGES.filter((c) => !existing.has(`${c.platform}|${c.title}`)).map((c) => ({
    title: c.title, platform: c.platform, url: c.url, category: c.category, difficulty: c.difficulty,
    description: c.description, relevanceClassification: c.relevanceClassification, tags: c.tags,
    linkedRoadmapDayIds: [idByDay.get(c.day)].filter(Boolean),
  }));
  if (docs.length) await Challenge.insertMany(docs);
}

async function seedFolders() {
  if ((await NoteFolder.countDocuments()) > 0) return;
  await NoteFolder.insertMany(DEFAULT_NOTE_FOLDERS.map((name, i) => ({ name, order: i, parentFolderId: null })));
}

async function seedMocks() {
  const existing = new Set((await MockSession.find().select("title").lean()).map((m) => m.title));
  const docs = SEED_MOCKS.filter((m) => !existing.has(m.title)).map((m) => ({
    title: m.title, scheduledAt: new Date(`${m.date}T09:00:00`), durationMinutes: 360, status: "planned",
    mixNotes: "Suggested personal preparation date - not an official contest date.",
  }));
  if (docs.length) await MockSession.insertMany(docs);
}

export async function seedAll() {
  const idByDay = await restoreRoadmap();
  await seedCatalogue(idByDay);
  await seedFolders();
  await seedMocks();
}

/** Re-add missing seeded content without touching user data (except restoring default roadmap days/tasks). */
export async function resetSeededContent() {
  await seedAll();
}

export async function fullReset() {
  await Promise.all(Object.values(MODELS).map((m) => (m as unknown as import("mongoose").Model<unknown>).deleteMany({})));
  const db = mongoose.connection.db;
  if (db) {
    for (const c of ["attachments.files", "attachments.chunks"]) {
      try { await db.collection(c).drop(); } catch { /* not present */ }
    }
  }
  _seeded = false;
  await ensureSeeded();
}

let _seeded = false;

/** Idempotent, race-safe first-launch seed. Claims the seed with an atomic version bump. */
export async function ensureSeeded() {
  if (_seeded) return;
  await Settings.updateOne(
    { key: "singleton" },
    {
      $setOnInsert: {
        key: "singleton",
        preparationStartDate: utcDay("2026-11-04"),
        examDate: utcDay("2026-12-05"),
        dailyStudyTargetMinutes: 240,
        primaryDifficulty: "intermediate",
        theme: "dark",
        schemaVersion: SCHEMA_VERSION,
        seedVersion: 0,
        minSampleSize: 5,
        readinessWeights: DEFAULT_READINESS_WEIGHTS,
        assumptionsMarkdown: "",
      },
    },
    { upsert: true },
  );
  const claimed = await Settings.findOneAndUpdate(
    { key: "singleton", seedVersion: { $lt: SEED_VERSION } },
    { $set: { seedVersion: SEED_VERSION, schemaVersion: SCHEMA_VERSION } },
  );
  if (claimed) {
    try {
      await seedAll();
    } catch (err) {
      await Settings.updateOne({ key: "singleton" }, { $set: { seedVersion: claimed.seedVersion } });
      throw err;
    }
  }
  _seeded = true;
}
