import "server-only";
import { Types } from "mongoose";
import { MODELS, Attachment, ChallengeAttempt, LearningTask, MockChallengeResult, MockSession, Note, NoteFolder, PracticeReport, Challenge, Resource } from "../db/models";
import { DEFAULTS, SCHEMAS, zId, type CollectionKey } from "../validation/schemas";
import { HttpError } from "./api";
import { toDto } from "./serialize";
import { deleteGridFile } from "./gridfs";

type FieldKind = "string" | "bool" | "id" | "number";
interface Config {
  filters: Record<string, FieldKind>;
  searchFields: string[];
  sorts: string[];
  defaultSort: string;
  projection?: string;
  /** reference fields -> target collection, validated before write */
  refs?: Record<string, CollectionKey>;
}

export const CONFIG: Record<Exclude<CollectionKey, "settings" | "attachments">, Config> = {
  roadmapDays: { filters: { domain: "string", relevanceClassification: "string" }, searchFields: ["title", "topics"], sorts: ["date", "dayNumber", "order"], defaultSort: "order" },
  learningTasks: { filters: { roadmapDayId: "id", status: "string", taskType: "string" }, searchFields: ["title"], sorts: ["order", "createdAt", "completedAt"], defaultSort: "order", refs: { roadmapDayId: "roadmapDays", resourceIds: "resources" } },
  resources: { filters: { category: "string", resourceType: "string", difficulty: "string", status: "string", isFavourite: "bool", costStatus: "string", relevanceClassification: "string" }, searchFields: ["title", "description", "tags"], sorts: ["title", "category", "createdAt", "updatedAt"], defaultSort: "category", refs: { linkedRoadmapDayIds: "roadmapDays" } },
  challenges: { filters: { category: "string", difficulty: "string", isArchived: "bool", platform: "string" }, searchFields: ["title", "description", "tags", "platform"], sorts: ["title", "category", "difficulty", "createdAt", "updatedAt"], defaultSort: "-updatedAt", refs: { linkedRoadmapDayIds: "roadmapDays" } },
  challengeAttempts: { filters: { challengeId: "id", status: "string", mockSessionId: "id" }, searchFields: ["notes", "lessonsLearned"], sorts: ["attemptedAt", "createdAt"], defaultSort: "-attemptedAt", refs: { challengeId: "challenges", mockSessionId: "mockSessions" } },
  mockSessions: { filters: { status: "string" }, searchFields: ["title"], sorts: ["scheduledAt", "createdAt"], defaultSort: "scheduledAt", refs: { challengeIds: "challenges" } },
  mockChallengeResults: { filters: { mockSessionId: "id", challengeId: "id", status: "string" }, searchFields: ["notes"], sorts: ["createdAt"], defaultSort: "createdAt", refs: { mockSessionId: "mockSessions", challengeId: "challenges" } },
  noteFolders: { filters: { parentFolderId: "id" }, searchFields: ["name"], sorts: ["order", "name"], defaultSort: "order" },
  notes: { filters: { folderId: "id", isPinned: "bool", isFavourite: "bool", tags: "string", linkedChallengeIds: "id", linkedRoadmapDayIds: "id", linkedResourceIds: "id", linkedMockSessionIds: "id" }, searchFields: ["title", "markdownBody", "tags"], sorts: ["updatedAt", "createdAt", "title"], defaultSort: "-updatedAt", projection: "-markdownBody", refs: { folderId: "noteFolders", linkedRoadmapDayIds: "roadmapDays", linkedChallengeIds: "challenges", linkedResourceIds: "resources", linkedMockSessionIds: "mockSessions" } },
  practiceReports: { filters: { challengeId: "id", attemptId: "id", category: "string" }, searchFields: ["title", "objective"], sorts: ["updatedAt", "createdAt", "title"], defaultSort: "-updatedAt", refs: { challengeId: "challenges", attemptId: "challengeAttempts" } },
  studySessions: { filters: { linkedRoadmapDayId: "id" }, searchFields: ["notes"], sorts: ["startedAt"], defaultSort: "-startedAt", refs: { linkedRoadmapDayId: "roadmapDays", linkedTaskId: "learningTasks" } },
  revisionItems: { filters: { status: "string", priority: "string", sourceType: "string" }, searchFields: ["title", "reason"], sorts: ["dueDate", "createdAt"], defaultSort: "dueDate" },
};
export type CrudKey = keyof typeof CONFIG;

export function isCrudKey(k: string): k is CrudKey {
  return Object.prototype.hasOwnProperty.call(CONFIG, k);
}

export function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseBool(v: string) {
  return v === "true" || v === "1";
}

export async function list(key: CrudKey, sp: URLSearchParams) {
  const cfg = CONFIG[key];
  const model = MODELS[key] as unknown as import("mongoose").Model<Record<string, unknown>>;
  const filter: Record<string, unknown> = {};
  for (const [field, kind] of Object.entries(cfg.filters)) {
    const raw = sp.get(field);
    if (raw === null || raw === "") continue;
    if (kind === "bool") filter[field] = parseBool(raw);
    else if (kind === "id") {
      if (raw === "null") filter[field] = null;
      else filter[field] = new Types.ObjectId(zId.parse(raw));
    } else if (kind === "number") filter[field] = Number(raw);
    else filter[field] = String(raw);
  }
  const q = sp.get("q")?.trim();
  if (q) {
    const rx = new RegExp(escapeRegex(q.slice(0, 100)), "i");
    filter.$or = cfg.searchFields.map((f) => ({ [f]: rx }));
  }
  let sort = sp.get("sort") ?? cfg.defaultSort;
  const desc = sort.startsWith("-");
  const sortField = desc ? sort.slice(1) : sort;
  if (!cfg.sorts.includes(sortField)) sort = cfg.defaultSort;
  const limit = Math.min(Math.max(Number(sp.get("limit") ?? 200) || 200, 1), 500);
  const page = Math.max(Number(sp.get("page") ?? 1) || 1, 1);
  const full = sp.get("full") === "1";
  let query = model.find(filter as never).sort(sort).skip((page - 1) * limit).limit(limit);
  if (cfg.projection && !full) query = query.select(cfg.projection);
  const [items, total] = await Promise.all([query.lean(), model.countDocuments(filter as never)]);
  return { items: toDto<unknown[]>(items), total, page, limit };
}

export async function getOne(key: CrudKey, id: string) {
  zId.parse(id);
  const model = MODELS[key] as unknown as import("mongoose").Model<Record<string, unknown>>;
  const doc = await model.findById(id).lean();
  if (!doc) throw new HttpError(404, "Not found");
  return toDto(doc);
}

function collectRefs(key: CrudKey, data: Record<string, unknown>) {
  const out: { target: CollectionKey; ids: string[] }[] = [];
  const refs = CONFIG[key].refs ?? {};
  for (const [field, target] of Object.entries(refs)) {
    const v = data[field];
    if (v === undefined || v === null) continue;
    const ids = (Array.isArray(v) ? v : [v]).map(String);
    if (ids.length) out.push({ target, ids });
  }
  return out;
}

export async function validateRefs(key: CrudKey, data: Record<string, unknown>) {
  for (const { target, ids } of collectRefs(key, data)) {
    const unique = [...new Set(ids)];
    const count = await (MODELS[target] as unknown as import("mongoose").Model<unknown>).countDocuments({ _id: { $in: unique } });
    if (count !== unique.length) throw new HttpError(422, `Linked ${target} record not found`, { [target]: "Referenced record does not exist" });
  }
}

export async function create(key: CrudKey, body: unknown) {
  const schema = SCHEMAS[key];
  const merged = { ...(DEFAULTS[key] ?? {}), ...(body as object) };
  const data = schema.parse(merged) as Record<string, unknown>;
  await validateRefs(key, data);
  if (key === "challengeAttempts") await assignAttemptNumber(data);
  if (key === "notes") data.lastSavedAt = new Date();
  const model = MODELS[key] as unknown as import("mongoose").Model<Record<string, unknown>>;
  const doc = await model.create(data);
  return toDto(doc.toObject());
}

async function assignAttemptNumber(data: Record<string, unknown>) {
  const n = await ChallengeAttempt.countDocuments({ challengeId: data.challengeId });
  data.attemptNumber = n + 1;
}

export async function update(key: CrudKey, id: string, body: unknown) {
  zId.parse(id);
  const schema = (SCHEMAS[key] as unknown as import("zod").ZodObject).partial();
  const data = schema.parse(body) as Record<string, unknown>;
  if (key === "notes") data.lastSavedAt = new Date();
  await validateRefs(key, data);
  const model = MODELS[key] as unknown as import("mongoose").Model<Record<string, unknown>>;
  const doc = await model.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).lean();
  if (!doc) throw new HttpError(404, "Not found");
  return toDto(doc);
}

export async function remove(key: CrudKey, id: string) {
  zId.parse(id);
  const oid = new Types.ObjectId(id);
  const model = MODELS[key] as unknown as import("mongoose").Model<unknown>;
  const existing = await model.findById(oid).lean();
  if (!existing) throw new HttpError(404, "Not found");
  // Documented deletion behaviour (see README "Deletion rules").
  switch (key) {
    case "roadmapDays":
      await LearningTask.deleteMany({ roadmapDayId: oid });
      await Promise.all([
        Resource.updateMany({}, { $pull: { linkedRoadmapDayIds: oid } }),
        Challenge.updateMany({}, { $pull: { linkedRoadmapDayIds: oid } }),
        Note.updateMany({}, { $pull: { linkedRoadmapDayIds: oid } }),
      ]);
      break;
    case "resources":
      await Promise.all([
        LearningTask.updateMany({}, { $pull: { resourceIds: oid } }),
        Note.updateMany({}, { $pull: { linkedResourceIds: oid } }),
      ]);
      break;
    case "challenges": {
      const attempts = await ChallengeAttempt.find({ challengeId: oid }).select("_id").lean();
      await Promise.all([
        ChallengeAttempt.deleteMany({ challengeId: oid }),
        MockChallengeResult.deleteMany({ challengeId: oid }),
        MockSession.updateMany({}, { $pull: { challengeIds: oid } }),
        Note.updateMany({}, { $pull: { linkedChallengeIds: oid } }),
        PracticeReport.updateMany({ challengeId: oid }, { $set: { challengeId: null, attemptId: null } }),
        PracticeReport.updateMany({ attemptId: { $in: attempts.map((a) => a._id) } }, { $set: { attemptId: null } }),
      ]);
      break;
    }
    case "challengeAttempts":
      await PracticeReport.updateMany({ attemptId: oid }, { $set: { attemptId: null } });
      break;
    case "mockSessions":
      await Promise.all([
        MockChallengeResult.deleteMany({ mockSessionId: oid }),
        ChallengeAttempt.deleteMany({ mockSessionId: oid }),
        Note.updateMany({}, { $pull: { linkedMockSessionIds: oid } }),
      ]);
      break;
    case "noteFolders": {
      const f = existing as { parentFolderId?: Types.ObjectId | null };
      await Promise.all([
        Note.updateMany({ folderId: oid }, { $set: { folderId: f.parentFolderId ?? null } }),
        NoteFolder.updateMany({ parentFolderId: oid }, { $set: { parentFolderId: f.parentFolderId ?? null } }),
      ]);
      break;
    }
    case "notes": {
      const atts = await Attachment.find({ noteId: oid }).lean();
      for (const a of atts) await deleteGridFile(a.gridFsId);
      await Attachment.deleteMany({ noteId: oid });
      break;
    }
    default:
      break;
  }
  await model.deleteOne({ _id: oid });
}
