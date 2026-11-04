import { z } from "zod";
import {
  ATTEMPT_STATUS, COST_STATUS, DIFFICULTIES, MOCK_RESULT_STATUS, MOCK_STATUS, RELEVANCE,
  RESOURCE_STATUS, RESOURCE_TYPES, TASK_STATUS, TASK_TYPES,
} from "../constants";

/** 24-char hex ObjectId string. */
export const zId = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id");
const zIdList = z.array(zId).max(500);
const zDate = z.coerce.date();
const zNullableDate = z.union([z.null(), z.literal(""), zDate]).transform((v) => (v === "" ? null : v));
const zNullableId = z.union([z.null(), z.literal(""), zId]).transform((v) => (v === "" ? null : v));
const zNullableNum = z.union([z.null(), z.literal(""), z.coerce.number().min(0).max(1_000_000)]).transform((v) => (v === "" ? null : v));
const text = (max = 20000) => z.string().max(max);
const zTags = z.array(z.string().trim().min(1).max(40)).max(30);
const zUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }, "Must be a valid http(s) URL");
const zOptUrl = z.union([z.literal(""), zUrl]);

export const settingsSchema = z.object({
  preparationStartDate: zDate,
  examDate: zDate,
  dailyStudyTargetMinutes: z.coerce.number().int().min(15).max(1440),
  primaryDifficulty: z.enum(DIFFICULTIES),
  theme: z.enum(["dark", "light"]),
  minSampleSize: z.coerce.number().int().min(1).max(100),
  readinessWeights: z.object({
    learning: z.coerce.number().min(0).max(100),
    ctf: z.coerce.number().min(0).max(100),
    coverage: z.coerce.number().min(0).max(100),
    mock: z.coerce.number().min(0).max(100),
    reporting: z.coerce.number().min(0).max(100),
  }),
  assumptionsMarkdown: text(),
});

export const roadmapDaySchema = z.object({
  dayNumber: z.coerce.number().int().min(1).max(400),
  date: zDate,
  originalDate: zDate,
  title: z.string().trim().min(1).max(200),
  domain: z.string().trim().min(1).max(100),
  summary: text(),
  objectives: z.array(z.string().max(500)).max(30),
  topics: z.array(z.string().max(200)).max(30),
  estimatedMinutes: z.coerce.number().int().min(0).max(1440),
  relevanceClassification: z.enum(RELEVANCE),
  ctfTarget: text(1000),
  expectedOutcome: text(1000),
  order: z.coerce.number().int(),
  isRestOrRevisionDay: z.boolean(),
  isRevisionOfKnownTopic: z.boolean(),
});

export const learningTaskSchema = z.object({
  roadmapDayId: zId,
  title: z.string().trim().min(1).max(300),
  description: text(5000),
  taskType: z.enum(TASK_TYPES),
  resourceIds: zIdList,
  estimatedMinutes: z.coerce.number().int().min(0).max(1440),
  status: z.enum(TASK_STATUS),
  completedAt: zNullableDate,
  notes: text(5000),
  order: z.coerce.number().int(),
});

export const resourceSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: text(2000),
  url: zUrl,
  category: z.string().trim().min(1, "Category is required").max(100),
  resourceType: z.enum(RESOURCE_TYPES),
  difficulty: z.enum(DIFFICULTIES),
  costStatus: z.enum(COST_STATUS),
  relevanceClassification: z.enum(RELEVANCE),
  tags: zTags,
  linkedRoadmapDayIds: zIdList,
  isFavourite: z.boolean(),
  status: z.enum(RESOURCE_STATUS),
  personalNotes: text(5000),
});

export const challengeSchema = z.object({
  title: z.string().trim().min(1, "Name is required").max(200),
  platform: text(100),
  url: zOptUrl,
  description: text(5000),
  category: z.string().trim().min(1, "Category is required").max(100),
  difficulty: z.enum(DIFFICULTIES),
  tags: zTags,
  relevanceClassification: z.enum(RELEVANCE),
  linkedRoadmapDayIds: zIdList,
  isArchived: z.boolean(),
  retryDate: zNullableDate,
  retryPriority: z.enum(["low", "medium", "high"]),
  retryDismissed: z.boolean(),
});

export const attemptSchema = z.object({
  challengeId: zId,
  mockSessionId: zNullableId,
  attemptedAt: zDate,
  status: z.enum(ATTEMPT_STATUS),
  durationMinutes: zNullableNum,
  attemptNumber: z.coerce.number().int().min(1).max(10000),
  hintsUsed: z.coerce.number().int().min(0).max(1000),
  selfDifficulty: z.enum(["", ...DIFFICULTIES]),
  scoreAwarded: zNullableNum,
  pointsAvailable: zNullableNum,
  lessonsLearned: text(),
  notes: text(),
  evidenceRefs: z.array(z.string().max(500)).max(50),
});

export const mockSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  scheduledAt: zDate,
  durationMinutes: z.coerce.number().int().min(5).max(1440),
  status: z.enum(MOCK_STATUS),
  challengeIds: zIdList,
  startedAt: zNullableDate,
  pausedAt: zNullableDate,
  pausedTotalMs: z.coerce.number().min(0),
  endedAt: zNullableDate,
  score: zNullableNum,
  pointsAvailable: zNullableNum,
  mixNotes: text(2000),
  reportReminder: text(2000),
  selfReview: text(),
  lessonsLearned: text(),
  linkedReportIds: zIdList,
});

export const mockResultSchema = z.object({
  mockSessionId: zId,
  challengeId: zId,
  status: z.enum(MOCK_RESULT_STATUS),
  startedAt: zNullableDate,
  completedAt: zNullableDate,
  pointsAvailable: zNullableNum,
  pointsAwarded: zNullableNum,
  notes: text(5000),
});

export const folderSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  parentFolderId: zNullableId,
  order: z.coerce.number().int(),
});

export const noteSchema = z.object({
  title: z.string().max(300),
  markdownBody: z.string().max(500_000),
  folderId: zNullableId,
  tags: zTags,
  isPinned: z.boolean(),
  isFavourite: z.boolean(),
  linkedRoadmapDayIds: zIdList,
  linkedChallengeIds: zIdList,
  linkedResourceIds: zIdList,
  linkedMockSessionIds: zIdList,
  attachmentIds: zIdList,
  lastSavedAt: zDate,
});

export const attachmentSchema = z.object({
  noteId: zNullableId,
  fileName: z.string().max(300),
  mimeType: z.string().max(100),
  sizeBytes: z.coerce.number().min(0),
  gridFsId: zId,
});

export const reportSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  challengeId: zNullableId,
  attemptId: zNullableId,
  category: text(100),
  difficulty: z.enum(["", ...DIFFICULTIES]),
  objective: text(),
  initialObservations: text(),
  toolsUsed: z.array(z.string().max(100)).max(50),
  methodologyMarkdown: text(100000),
  findings: text(),
  flagRetrievalExplanation: text(),
  evidenceNotes: text(),
  conclusion: text(),
  evidenceAttachmentIds: zIdList,
});

export const studySessionSchema = z.object({
  startedAt: zDate,
  endedAt: zNullableDate,
  durationMinutes: z.coerce.number().min(0).max(1440),
  linkedRoadmapDayId: zNullableId,
  linkedTaskId: zNullableId,
  notes: text(2000),
});

export const revisionSchema = z.object({
  title: z.string().trim().min(1).max(300),
  sourceType: z.enum(["challenge", "topic", "note", "resource"]),
  sourceId: zNullableId,
  dueDate: zDate,
  priority: z.enum(["low", "medium", "high"]),
  status: z.enum(["pending", "completed", "dismissed"]),
  reason: text(2000),
});

export const SCHEMAS = {
  settings: settingsSchema,
  roadmapDays: roadmapDaySchema,
  learningTasks: learningTaskSchema,
  resources: resourceSchema,
  challenges: challengeSchema,
  challengeAttempts: attemptSchema,
  mockSessions: mockSchema,
  mockChallengeResults: mockResultSchema,
  noteFolders: folderSchema,
  notes: noteSchema,
  attachments: attachmentSchema,
  practiceReports: reportSchema,
  studySessions: studySessionSchema,
  revisionItems: revisionSchema,
} as const;

/** Defaults for fields so that partial create bodies (most fields optional) are accepted. */
export const DEFAULTS: Record<keyof typeof SCHEMAS, Record<string, unknown>> = {
  settings: {},
  roadmapDays: { summary: "", objectives: [], topics: [], estimatedMinutes: 240, relevanceClassification: "supplementary", ctfTarget: "", expectedOutcome: "", isRestOrRevisionDay: false, isRevisionOfKnownTopic: false },
  learningTasks: { description: "", taskType: "theory", resourceIds: [], estimatedMinutes: 30, status: "todo", completedAt: null, notes: "", order: 0 },
  resources: { description: "", resourceType: "article", difficulty: "beginner", costStatus: "unknown", relevanceClassification: "unverified", tags: [], linkedRoadmapDayIds: [], isFavourite: false, status: "not_started", personalNotes: "" },
  challenges: { platform: "", url: "", description: "", difficulty: "intermediate", tags: [], relevanceClassification: "supplementary", linkedRoadmapDayIds: [], isArchived: false, retryDate: null, retryPriority: "medium", retryDismissed: false },
  challengeAttempts: { mockSessionId: null, status: "attempted", durationMinutes: null, attemptNumber: 1, hintsUsed: 0, selfDifficulty: "", scoreAwarded: null, pointsAvailable: null, lessonsLearned: "", notes: "", evidenceRefs: [] },
  mockSessions: { durationMinutes: 360, status: "planned", challengeIds: [], startedAt: null, pausedAt: null, pausedTotalMs: 0, endedAt: null, score: null, pointsAvailable: null, mixNotes: "", reportReminder: "Prepare the report with the current official TCS template and screenshots with timestamps.", selfReview: "", lessonsLearned: "", linkedReportIds: [] },
  mockChallengeResults: { status: "not_started", startedAt: null, completedAt: null, pointsAvailable: null, pointsAwarded: null, notes: "" },
  noteFolders: { parentFolderId: null, order: 0 },
  notes: { title: "Untitled note", markdownBody: "", folderId: null, tags: [], isPinned: false, isFavourite: false, linkedRoadmapDayIds: [], linkedChallengeIds: [], linkedResourceIds: [], linkedMockSessionIds: [], attachmentIds: [], lastSavedAt: new Date() },
  attachments: {},
  practiceReports: { challengeId: null, attemptId: null, category: "", difficulty: "", objective: "", initialObservations: "", toolsUsed: [], methodologyMarkdown: "", findings: "", flagRetrievalExplanation: "", evidenceNotes: "", conclusion: "", evidenceAttachmentIds: [] },
  studySessions: { endedAt: null, durationMinutes: 0, linkedRoadmapDayId: null, linkedTaskId: null, notes: "" },
  revisionItems: { sourceType: "topic", sourceId: null, priority: "medium", status: "pending", reason: "" },
};

export type CollectionKey = keyof typeof SCHEMAS;
