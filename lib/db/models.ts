import "server-only";
import mongoose, { Schema, type Model } from "mongoose";
import {
  ATTEMPT_STATUS, COST_STATUS, DIFFICULTIES, MOCK_RESULT_STATUS, MOCK_STATUS, RELEVANCE,
  RESOURCE_STATUS, RESOURCE_TYPES, TASK_STATUS, TASK_TYPES,
} from "../constants";

const oid = Schema.Types.ObjectId;
const opts = { timestamps: true, versionKey: false } as const;

// Documents are loosely typed on the server; strict DTO types (lib/types.ts) apply at the API boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyDoc = Record<string, any>;
function model(name: string, collection: string, schema: Schema): Model<AnyDoc> {
  return (mongoose.models[name] as Model<AnyDoc>) || mongoose.model<AnyDoc>(name, schema, collection);
}
const refList = (ref: string) => ({ type: [{ type: oid, ref }], default: [] });

const settingsSchema = new Schema({
  key: { type: String, default: "singleton", unique: true },
  preparationStartDate: { type: Date, required: true },
  examDate: { type: Date, required: true },
  dailyStudyTargetMinutes: { type: Number, default: 240 },
  primaryDifficulty: { type: String, enum: DIFFICULTIES, default: "intermediate" },
  theme: { type: String, enum: ["dark", "light"], default: "dark" },
  schemaVersion: { type: Number, default: 1 },
  seedVersion: { type: Number, default: 0 },
  minSampleSize: { type: Number, default: 5 },
  readinessWeights: {
    learning: { type: Number, default: 15 }, ctf: { type: Number, default: 35 },
    coverage: { type: Number, default: 15 }, mock: { type: Number, default: 25 }, reporting: { type: Number, default: 10 },
  },
  assumptionsMarkdown: { type: String, default: "" },
}, opts);

const roadmapDaySchema = new Schema({
  dayNumber: { type: Number, required: true, unique: true },
  date: { type: Date, required: true },
  originalDate: { type: Date, required: true },
  title: { type: String, required: true },
  domain: { type: String, required: true },
  summary: { type: String, default: "" },
  objectives: { type: [String], default: [] },
  topics: { type: [String], default: [] },
  estimatedMinutes: { type: Number, default: 240 },
  relevanceClassification: { type: String, enum: RELEVANCE, default: "supplementary" },
  ctfTarget: { type: String, default: "" },
  expectedOutcome: { type: String, default: "" },
  order: { type: Number, required: true },
  isRestOrRevisionDay: { type: Boolean, default: false },
  isRevisionOfKnownTopic: { type: Boolean, default: false },
}, opts);
roadmapDaySchema.index({ date: 1 });

const learningTaskSchema = new Schema({
  roadmapDayId: { type: oid, ref: "RoadmapDay", required: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  taskType: { type: String, enum: TASK_TYPES, default: "theory" },
  resourceIds: refList("Resource"),
  estimatedMinutes: { type: Number, default: 30 },
  status: { type: String, enum: TASK_STATUS, default: "todo" },
  completedAt: { type: Date, default: null },
  notes: { type: String, default: "" },
  order: { type: Number, default: 0 },
}, opts);
learningTaskSchema.index({ roadmapDayId: 1, status: 1 });

const resourceSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  url: { type: String, required: true },
  category: { type: String, required: true },
  resourceType: { type: String, enum: RESOURCE_TYPES, default: "article" },
  difficulty: { type: String, enum: DIFFICULTIES, default: "beginner" },
  costStatus: { type: String, enum: COST_STATUS, default: "unknown" },
  relevanceClassification: { type: String, enum: RELEVANCE, default: "supplementary" },
  tags: { type: [String], default: [] },
  linkedRoadmapDayIds: refList("RoadmapDay"),
  isFavourite: { type: Boolean, default: false },
  status: { type: String, enum: RESOURCE_STATUS, default: "not_started" },
  personalNotes: { type: String, default: "" },
}, opts);
resourceSchema.index({ category: 1, title: 1 });

const challengeSchema = new Schema({
  title: { type: String, required: true },
  platform: { type: String, default: "" },
  url: { type: String, default: "" },
  description: { type: String, default: "" },
  category: { type: String, required: true },
  difficulty: { type: String, enum: DIFFICULTIES, default: "intermediate" },
  tags: { type: [String], default: [] },
  relevanceClassification: { type: String, enum: RELEVANCE, default: "supplementary" },
  linkedRoadmapDayIds: refList("RoadmapDay"),
  isArchived: { type: Boolean, default: false },
  retryDate: { type: Date, default: null },
  retryPriority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
  retryDismissed: { type: Boolean, default: false },
}, opts);
challengeSchema.index({ category: 1, difficulty: 1 });

const attemptSchema = new Schema({
  challengeId: { type: oid, ref: "Challenge", required: true },
  mockSessionId: { type: oid, ref: "MockSession", default: null },
  attemptedAt: { type: Date, required: true },
  status: { type: String, enum: ATTEMPT_STATUS, required: true },
  durationMinutes: { type: Number, default: null },
  attemptNumber: { type: Number, default: 1 },
  hintsUsed: { type: Number, default: 0 },
  selfDifficulty: { type: String, enum: [...DIFFICULTIES, ""], default: "" },
  scoreAwarded: { type: Number, default: null },
  pointsAvailable: { type: Number, default: null },
  lessonsLearned: { type: String, default: "" },
  notes: { type: String, default: "" },
  evidenceRefs: { type: [String], default: [] },
}, opts);
attemptSchema.index({ challengeId: 1, attemptedAt: -1 });

const mockSchema = new Schema({
  title: { type: String, required: true },
  scheduledAt: { type: Date, required: true },
  durationMinutes: { type: Number, default: 360 },
  status: { type: String, enum: MOCK_STATUS, default: "planned" },
  challengeIds: refList("Challenge"),
  startedAt: { type: Date, default: null },
  pausedAt: { type: Date, default: null },
  pausedTotalMs: { type: Number, default: 0 },
  endedAt: { type: Date, default: null },
  score: { type: Number, default: null },
  pointsAvailable: { type: Number, default: null },
  mixNotes: { type: String, default: "" },
  reportReminder: { type: String, default: "Prepare the report with the current official template and screenshots with timestamps." },
  selfReview: { type: String, default: "" },
  lessonsLearned: { type: String, default: "" },
  linkedReportIds: refList("PracticeReport"),
}, opts);
mockSchema.index({ scheduledAt: 1 });

const mockResultSchema = new Schema({
  mockSessionId: { type: oid, ref: "MockSession", required: true },
  challengeId: { type: oid, ref: "Challenge", required: true },
  status: { type: String, enum: MOCK_RESULT_STATUS, default: "not_started" },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  pointsAvailable: { type: Number, default: null },
  pointsAwarded: { type: Number, default: null },
  notes: { type: String, default: "" },
}, opts);
mockResultSchema.index({ mockSessionId: 1, challengeId: 1 }, { unique: true });

const folderSchema = new Schema({
  name: { type: String, required: true },
  parentFolderId: { type: oid, ref: "NoteFolder", default: null },
  order: { type: Number, default: 0 },
}, opts);
folderSchema.index({ parentFolderId: 1, order: 1 });

const noteSchema = new Schema({
  title: { type: String, default: "Untitled note" },
  markdownBody: { type: String, default: "" },
  folderId: { type: oid, ref: "NoteFolder", default: null },
  tags: { type: [String], default: [] },
  isPinned: { type: Boolean, default: false },
  isFavourite: { type: Boolean, default: false },
  linkedRoadmapDayIds: refList("RoadmapDay"),
  linkedChallengeIds: refList("Challenge"),
  linkedResourceIds: refList("Resource"),
  linkedMockSessionIds: refList("MockSession"),
  attachmentIds: refList("Attachment"),
  lastSavedAt: { type: Date, default: Date.now },
}, opts);
noteSchema.index({ folderId: 1, updatedAt: -1 });
noteSchema.index({ isPinned: 1, updatedAt: -1 });

const attachmentSchema = new Schema({
  noteId: { type: oid, ref: "Note", default: null },
  fileName: { type: String, required: true },
  mimeType: { type: String, required: true },
  sizeBytes: { type: Number, required: true },
  gridFsId: { type: oid, required: true },
}, opts);
attachmentSchema.index({ noteId: 1 });

const reportSchema = new Schema({
  title: { type: String, required: true },
  challengeId: { type: oid, ref: "Challenge", default: null },
  attemptId: { type: oid, ref: "ChallengeAttempt", default: null },
  category: { type: String, default: "" },
  difficulty: { type: String, enum: [...DIFFICULTIES, ""], default: "" },
  objective: { type: String, default: "" },
  initialObservations: { type: String, default: "" },
  toolsUsed: { type: [String], default: [] },
  methodologyMarkdown: { type: String, default: "" },
  findings: { type: String, default: "" },
  flagRetrievalExplanation: { type: String, default: "" },
  evidenceNotes: { type: String, default: "" },
  conclusion: { type: String, default: "" },
  evidenceAttachmentIds: refList("Attachment"),
}, opts);
reportSchema.index({ challengeId: 1 });

const studySessionSchema = new Schema({
  startedAt: { type: Date, required: true },
  endedAt: { type: Date, default: null },
  durationMinutes: { type: Number, default: 0 },
  linkedRoadmapDayId: { type: oid, ref: "RoadmapDay", default: null },
  linkedTaskId: { type: oid, ref: "LearningTask", default: null },
  notes: { type: String, default: "" },
}, opts);
studySessionSchema.index({ startedAt: -1 });

const revisionSchema = new Schema({
  title: { type: String, required: true },
  sourceType: { type: String, enum: ["challenge", "topic", "note", "resource"], default: "topic" },
  sourceId: { type: oid, default: null },
  dueDate: { type: Date, required: true },
  priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
  status: { type: String, enum: ["pending", "completed", "dismissed"], default: "pending" },
  reason: { type: String, default: "" },
}, opts);
revisionSchema.index({ dueDate: 1, status: 1 });

export const Settings = model("Settings", "settings", settingsSchema);
export const RoadmapDay = model("RoadmapDay", "roadmapDays", roadmapDaySchema);
export const LearningTask = model("LearningTask", "learningTasks", learningTaskSchema);
export const Resource = model("Resource", "resources", resourceSchema);
export const Challenge = model("Challenge", "challenges", challengeSchema);
export const ChallengeAttempt = model("ChallengeAttempt", "challengeAttempts", attemptSchema);
export const MockSession = model("MockSession", "mockSessions", mockSchema);
export const MockChallengeResult = model("MockChallengeResult", "mockChallengeResults", mockResultSchema);
export const NoteFolder = model("NoteFolder", "noteFolders", folderSchema);
export const Note = model("Note", "notes", noteSchema);
export const Attachment = model("Attachment", "attachments", attachmentSchema);
export const PracticeReport = model("PracticeReport", "practiceReports", reportSchema);
export const StudySession = model("StudySession", "studySessions", studySessionSchema);
export const RevisionItem = model("RevisionItem", "revisionItems", revisionSchema);

/** Registry used by the generic CRUD layer and by backup/restore. */
export const MODELS = {
  settings: Settings,
  roadmapDays: RoadmapDay,
  learningTasks: LearningTask,
  resources: Resource,
  challenges: Challenge,
  challengeAttempts: ChallengeAttempt,
  mockSessions: MockSession,
  mockChallengeResults: MockChallengeResult,
  noteFolders: NoteFolder,
  notes: Note,
  attachments: Attachment,
  practiceReports: PracticeReport,
  studySessions: StudySession,
  revisionItems: RevisionItem,
} as const;
export type CollectionName = keyof typeof MODELS;
