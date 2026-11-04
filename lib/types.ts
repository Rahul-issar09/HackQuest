import type {
  ATTEMPT_STATUS, COST_STATUS, DIFFICULTIES, MOCK_RESULT_STATUS, MOCK_STATUS, RELEVANCE,
  RESOURCE_STATUS, RESOURCE_TYPES, TASK_STATUS, TASK_TYPES,
} from "./constants";

export type Difficulty = (typeof DIFFICULTIES)[number];
export type Relevance = (typeof RELEVANCE)[number];
type Base = { id: string; createdAt: string; updatedAt: string };

export interface SettingsDto extends Base {
  preparationStartDate: string; examDate: string; dailyStudyTargetMinutes: number;
  primaryDifficulty: Difficulty; theme: "dark" | "light"; schemaVersion: number; seedVersion: number;
  minSampleSize: number;
  readinessWeights: { learning: number; ctf: number; coverage: number; mock: number; reporting: number };
  assumptionsMarkdown: string;
}
export interface RoadmapDayDto extends Base {
  dayNumber: number; date: string; originalDate: string; title: string; domain: string; summary: string;
  objectives: string[]; topics: string[]; estimatedMinutes: number; relevanceClassification: Relevance;
  ctfTarget: string; expectedOutcome: string; order: number; isRestOrRevisionDay: boolean; isRevisionOfKnownTopic: boolean;
}
export interface LearningTaskDto extends Base {
  roadmapDayId: string; title: string; description: string; taskType: (typeof TASK_TYPES)[number];
  resourceIds: string[]; estimatedMinutes: number; status: (typeof TASK_STATUS)[number];
  completedAt: string | null; notes: string; order: number;
}
export interface ResourceDto extends Base {
  title: string; description: string; url: string; category: string; resourceType: (typeof RESOURCE_TYPES)[number];
  difficulty: Difficulty; costStatus: (typeof COST_STATUS)[number]; relevanceClassification: Relevance;
  tags: string[]; linkedRoadmapDayIds: string[]; isFavourite: boolean; status: (typeof RESOURCE_STATUS)[number]; personalNotes: string;
}
export interface ChallengeDto extends Base {
  title: string; platform: string; url: string; description: string; category: string; difficulty: Difficulty;
  tags: string[]; relevanceClassification: Relevance; linkedRoadmapDayIds: string[]; isArchived: boolean;
  retryDate: string | null; retryPriority: "low" | "medium" | "high"; retryDismissed: boolean;
}
export interface AttemptDto extends Base {
  challengeId: string; mockSessionId: string | null; attemptedAt: string; status: (typeof ATTEMPT_STATUS)[number];
  durationMinutes: number | null; attemptNumber: number; hintsUsed: number; selfDifficulty: Difficulty | "";
  scoreAwarded: number | null; pointsAvailable: number | null; lessonsLearned: string; notes: string; evidenceRefs: string[];
}
export interface MockDto extends Base {
  title: string; scheduledAt: string; durationMinutes: number; status: (typeof MOCK_STATUS)[number];
  challengeIds: string[]; startedAt: string | null; pausedAt: string | null; pausedTotalMs: number;
  endedAt: string | null; score: number | null; pointsAvailable: number | null; mixNotes: string;
  reportReminder: string; selfReview: string; lessonsLearned: string; linkedReportIds: string[];
}
export interface MockResultDto extends Base {
  mockSessionId: string; challengeId: string; status: (typeof MOCK_RESULT_STATUS)[number];
  startedAt: string | null; completedAt: string | null; pointsAvailable: number | null; pointsAwarded: number | null; notes: string;
}
export interface FolderDto extends Base { name: string; parentFolderId: string | null; order: number }
export interface NoteDto extends Base {
  title: string; markdownBody?: string; folderId: string | null; tags: string[]; isPinned: boolean; isFavourite: boolean;
  linkedRoadmapDayIds: string[]; linkedChallengeIds: string[]; linkedResourceIds: string[]; linkedMockSessionIds: string[];
  attachmentIds: string[]; lastSavedAt: string;
}
export interface AttachmentDto extends Base { noteId: string | null; fileName: string; mimeType: string; sizeBytes: number }
export interface ReportDto extends Base {
  title: string; challengeId: string | null; attemptId: string | null; category: string; difficulty: Difficulty | "";
  objective: string; initialObservations: string; toolsUsed: string[]; methodologyMarkdown: string; findings: string;
  flagRetrievalExplanation: string; evidenceNotes: string; conclusion: string; evidenceAttachmentIds: string[];
}
export interface StudySessionDto extends Base {
  startedAt: string; endedAt: string | null; durationMinutes: number; linkedRoadmapDayId: string | null;
  linkedTaskId: string | null; notes: string;
}
export interface RevisionDto extends Base {
  title: string; sourceType: "challenge" | "topic" | "note" | "resource"; sourceId: string | null; dueDate: string;
  priority: "low" | "medium" | "high"; status: "pending" | "completed" | "dismissed"; reason: string;
}
export interface ListResult<T> { items: T[]; total: number; page: number; limit: number }
