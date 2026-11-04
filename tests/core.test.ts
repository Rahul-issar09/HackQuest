import { describe, expect, it } from "vitest";
import { addDaysToKey, currentPrepDay, daysUntil } from "@/lib/dates";
import { applyAction, formatClock, remainingMs, type TimerState } from "@/lib/mock/timer";
import {
  categoryStats, overallStats, readiness, retryQueue, weaknessRecommendations, median,
} from "@/lib/analytics";
import type { AttemptDto, ChallengeDto } from "@/lib/types";
import { SEED_DAYS } from "@/data/seed-roadmap";

const ch = (id: string, category = "Web Security"): ChallengeDto => ({
  id, title: id, platform: "", url: "", description: "", category, difficulty: "intermediate", tags: [],
  relevanceClassification: "supplementary", linkedRoadmapDayIds: [], isArchived: false, retryDate: null,
  retryPriority: "medium", retryDismissed: false, createdAt: "", updatedAt: "",
});
let n = 0;
const at = (challengeId: string, status: AttemptDto["status"], mins: number | null = null, day = 1): AttemptDto => ({
  id: `a${++n}`, challengeId, mockSessionId: null, attemptedAt: `2026-11-${String(day).padStart(2, "0")}T10:00:00.000Z`,
  status, durationMinutes: mins, attemptNumber: 1, hintsUsed: 0, selfDifficulty: "", scoreAwarded: null,
  pointsAvailable: null, lessonsLearned: "", notes: "", evidenceRefs: [], createdAt: "", updatedAt: "",
});

describe("dates", () => {
  it("counts days until the configured exam date", () => {
    expect(daysUntil("2026-12-05", new Date(2026, 10, 4, 15))).toBe(31);
    expect(daysUntil("2026-12-05T00:00:00.000Z", new Date(2026, 11, 5))).toBe(0);
    expect(daysUntil("2026-12-05", new Date(2026, 11, 6))).toBe(-1);
  });
  it("derives the current prep day inside the window only", () => {
    expect(currentPrepDay("2026-11-04", "2026-12-04", new Date(2026, 10, 4))).toBe(1);
    expect(currentPrepDay("2026-11-04", "2026-12-04", new Date(2026, 11, 4))).toBe(31);
    expect(currentPrepDay("2026-11-04", "2026-12-04", new Date(2026, 10, 3))).toBeNull();
    expect(addDaysToKey("2026-11-30", 1)).toBe("2026-12-01");
  });
});

describe("seed roadmap", () => {
  it("has 31 consecutive days from Nov 4 to Dec 4 2026", () => {
    expect(SEED_DAYS).toHaveLength(31);
    expect(SEED_DAYS[0].date).toBe("2026-11-04");
    expect(SEED_DAYS[30].date).toBe("2026-12-04");
    expect(new Set(SEED_DAYS.map((d) => d.date)).size).toBe(31);
  });
});

describe("mock timer", () => {
  const base: TimerState = { status: "planned", durationMinutes: 360, startedAt: null, pausedAt: null, pausedTotalMs: 0, endedAt: null };
  it("survives reload: remaining time comes from timestamps", () => {
    const start = new Date("2026-11-16T09:00:00Z");
    const s = { ...base, ...applyAction(base, "start", start) } as TimerState;
    expect(remainingMs(s, start.getTime() + 3600_000)).toBe(5 * 3600_000);
    expect(remainingMs(s, start.getTime() + 7 * 3600_000)).toBe(0);
    expect(formatClock(remainingMs(s, start.getTime()))).toBe("06:00:00");
  });
  it("pause stops the clock and resume excludes paused time", () => {
    const start = new Date("2026-11-16T09:00:00Z");
    let s = { ...base, ...applyAction(base, "start", start) } as TimerState;
    s = { ...s, ...applyAction(s, "pause", new Date(start.getTime() + 3600_000)) };
    expect(remainingMs(s, start.getTime() + 10 * 3600_000)).toBe(5 * 3600_000);
    s = { ...s, ...applyAction(s, "resume", new Date(start.getTime() + 2 * 3600_000)) };
    expect(remainingMs(s, start.getTime() + 3 * 3600_000)).toBe(4 * 3600_000);
    expect(() => applyAction(s, "resume")).toThrow();
  });
});

describe("analytics", () => {
  it("distinguishes attempts from unique challenges and excludes skipped", () => {
    const a = [at("c1", "failed", null, 1), at("c1", "solved", 30, 2), at("c2", "solved", 10, 1), at("c3", "skipped")];
    const s = overallStats(a);
    expect(s.attempts).toBe(3);
    expect(s.uniqueChallengesAttempted).toBe(2);
    expect(s.uniqueChallengesSolved).toBe(2);
    expect(s.solveRate).toBeCloseTo(2 / 3);
    expect(s.firstAttemptSolveRate).toBeCloseTo(0.5);
    expect(s.skipped).toBe(1);
    expect(s.avgSolveMinutes).toBe(20);
    expect(median([1, 5, 3])).toBe(3);
  });
  it("returns null (not zero) when there is no data", () => {
    const s = overallStats([]);
    expect(s.solveRate).toBeNull();
    const cat = categoryStats([], [ch("c1")]).find((x) => x.key === "Linux");
    expect(cat?.assessed).toBe(false);
    expect(cat?.solveRate).toBeNull();
  });
  it("flags weak categories with explanations and labels empty domains not assessed", () => {
    const chs = [ch("c1"), ch("c2"), ch("c3")];
    const a = [at("c1", "failed"), at("c1", "failed"), at("c2", "failed"), at("c3", "solved")];
    const recs = weaknessRecommendations(a, chs, 5);
    expect(recs.some((r) => r.kind === "practice_more" && r.category === "Web Security" && r.attemptIds.length === 4)).toBe(true);
    expect(recs.some((r) => r.kind === "revision_queue" && r.id === "rep-c1")).toBe(true);
    expect(recs.some((r) => r.kind === "not_assessed" && r.category === "Linux")).toBe(true);
    expect(recs.some((r) => r.kind === "strong")).toBe(false);
  });
  it("retry queue drops challenges once a later attempt is solved", () => {
    const chs = [ch("c1"), ch("c2")];
    const q1 = retryQueue([at("c1", "failed"), at("c2", "failed")], chs);
    expect(q1.map((x) => x.challenge.id).sort()).toEqual(["c1", "c2"]);
    const q2 = retryQueue([at("c1", "failed", null, 1), at("c1", "solved", 5, 2), at("c2", "failed")], chs);
    expect(q2.map((x) => x.challenge.id)).toEqual(["c2"]);
  });
  it("readiness excludes components with no evidence", () => {
    const weights = { learning: 15, ctf: 35, coverage: 15, mock: 25, reporting: 10 };
    const r = readiness({ tasks: [], attempts: [], challenges: [], mocks: [], mockResults: [], reports: [], settings: { readinessWeights: weights } });
    expect(r.score).toBeNull();
    const t = (status: "completed" | "todo") => ({ id: status, roadmapDayId: "d", title: "", description: "", taskType: "theory" as const, resourceIds: [], estimatedMinutes: 0, status, completedAt: null, notes: "", order: 0, createdAt: "", updatedAt: "" });
    const r2 = readiness({ tasks: [t("completed"), t("todo")], attempts: [], challenges: [], mocks: [], mockResults: [], reports: [], settings: { readinessWeights: weights } });
    expect(r2.score).toBe(50);
    expect(r2.evidenceWeight).toBeCloseTo(0.15);
  });
});
