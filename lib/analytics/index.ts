/**
 * Central analytics module. Pure functions over persisted records (DTOs).
 *
 * Metric definitions (also shown in the UI):
 * - Counted attempt: an attempt whose status is solved, failed or attempted. "skipped" attempts are reported
 *   separately and excluded from every rate.
 * - Solve rate = solved counted attempts / counted attempts. (Attempts, not unique challenges.)
 * - First-attempt solve rate = unique challenges whose chronologically first counted attempt is solved /
 *   unique challenges with at least one counted attempt.
 * - Average / median solve time = over solved attempts that have a duration recorded.
 * - Domain coverage = configured domains with >= 1 counted attempt / configured domains.
 * - Missing data is never treated as zero skill: it is "not assessed".
 */
import { DOMAINS } from "../constants";
import type {
  AttemptDto, ChallengeDto, LearningTaskDto, MockDto, MockResultDto, ReportDto, SettingsDto, StudySessionDto,
} from "../types";

export const COUNTED = new Set(["solved", "failed", "attempted"]);
/** Minimum counted attempts in a category before a *weak* flag is raised (strong flag uses settings.minSampleSize). */
export const WEAK_MIN_ATTEMPTS = 3;
export const WEAK_RATE = 0.5;
export const STRONG_RATE = 0.8;

export const counted = (a: AttemptDto[]) => a.filter((x) => COUNTED.has(x.status));
const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
export function median(xs: number[]) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const rate = (num: number, den: number) => (den > 0 ? num / den : null);

export interface OverallStats {
  attempts: number; solvedAttempts: number; skipped: number; uniqueChallengesAttempted: number; uniqueChallengesSolved: number;
  solveRate: number | null; firstAttemptSolveRate: number | null; avgSolveMinutes: number | null; medianSolveMinutes: number | null;
}

export function overallStats(attempts: AttemptDto[]): OverallStats {
  const c = counted(attempts);
  const solved = c.filter((a) => a.status === "solved");
  const byChallenge = new Map<string, AttemptDto[]>();
  for (const a of c) byChallenge.set(a.challengeId, [...(byChallenge.get(a.challengeId) ?? []), a]);
  let firstSolved = 0;
  let solvedUnique = 0;
  for (const list of byChallenge.values()) {
    list.sort((x, y) => x.attemptedAt.localeCompare(y.attemptedAt));
    if (list[0].status === "solved") firstSolved++;
    if (list.some((a) => a.status === "solved")) solvedUnique++;
  }
  const times = solved.map((a) => a.durationMinutes).filter((x): x is number => typeof x === "number");
  return {
    attempts: c.length,
    solvedAttempts: solved.length,
    skipped: attempts.filter((a) => a.status === "skipped").length,
    uniqueChallengesAttempted: byChallenge.size,
    uniqueChallengesSolved: solvedUnique,
    solveRate: rate(solved.length, c.length),
    firstAttemptSolveRate: rate(firstSolved, byChallenge.size),
    avgSolveMinutes: mean(times),
    medianSolveMinutes: median(times),
  };
}

export interface GroupStat {
  key: string; attempts: number; solved: number; solveRate: number | null; avgSolveMinutes: number | null;
  uniqueChallenges: number; assessed: boolean;
}

function groupBy(attempts: AttemptDto[], challenges: Map<string, ChallengeDto>, keyOf: (c: ChallengeDto) => string, keys: string[]): GroupStat[] {
  const c = counted(attempts);
  const groups = new Map<string, AttemptDto[]>();
  for (const k of keys) groups.set(k, []);
  for (const a of c) {
    const ch = challenges.get(a.challengeId);
    if (!ch) continue;
    const k = keyOf(ch);
    groups.set(k, [...(groups.get(k) ?? []), a]);
  }
  return [...groups.entries()].map(([key, list]) => {
    const solved = list.filter((a) => a.status === "solved");
    const times = solved.map((a) => a.durationMinutes).filter((x): x is number => typeof x === "number");
    return {
      key, attempts: list.length, solved: solved.length, solveRate: rate(solved.length, list.length),
      avgSolveMinutes: mean(times), uniqueChallenges: new Set(list.map((a) => a.challengeId)).size, assessed: list.length > 0,
    };
  });
}

export function categoryStats(attempts: AttemptDto[], challenges: ChallengeDto[]) {
  const map = new Map(challenges.map((c) => [c.id, c]));
  const extra = [...new Set(challenges.map((c) => c.category))].filter((c) => !(DOMAINS as readonly string[]).includes(c));
  return groupBy(attempts, map, (c) => c.category, [...DOMAINS, ...extra]);
}
export function difficultyStats(attempts: AttemptDto[], challenges: ChallengeDto[]) {
  const map = new Map(challenges.map((c) => [c.id, c]));
  return groupBy(attempts, map, (c) => c.difficulty, ["beginner", "intermediate", "expert"]);
}

export function domainCoverage(attempts: AttemptDto[], challenges: ChallengeDto[]) {
  const stats = categoryStats(attempts, challenges).filter((s) => (DOMAINS as readonly string[]).includes(s.key));
  const covered = stats.filter((s) => s.attempts > 0).length;
  return { covered, total: DOMAINS.length, ratio: covered / DOMAINS.length, uncovered: stats.filter((s) => s.attempts === 0).map((s) => s.key) };
}

/** Challenge is in the retry queue if it has counted attempts, none solved, not dismissed or archived. */
export interface RetryItem { challenge: ChallengeDto; failedAttempts: number; lastAttemptAt: string; reason: string }
export function retryQueue(attempts: AttemptDto[], challenges: ChallengeDto[]): RetryItem[] {
  const out: RetryItem[] = [];
  for (const ch of challenges) {
    if (ch.isArchived || ch.retryDismissed) continue;
    const mine = counted(attempts.filter((a) => a.challengeId === ch.id)).sort((a, b) => b.attemptedAt.localeCompare(a.attemptedAt));
    if (!mine.length || mine.some((a) => a.status === "solved")) continue;
    out.push({ challenge: ch, failedAttempts: mine.length, lastAttemptAt: mine[0].attemptedAt, reason: `${mine.length} unsolved attempt(s), latest: ${mine[0].status}` });
  }
  const pr = { high: 0, medium: 1, low: 2 } as const;
  return out.sort((a, b) => pr[a.challenge.retryPriority] - pr[b.challenge.retryPriority] || (a.challenge.retryDate ?? "9").localeCompare(b.challenge.retryDate ?? "9"));
}

export interface Recommendation {
  id: string; kind: "practice_more" | "revision_queue" | "timed_drills" | "not_assessed" | "strong";
  category: string; title: string; reason: string; attemptIds: string[];
}

export function weaknessRecommendations(
  attempts: AttemptDto[], challenges: ChallengeDto[], minSample: number,
): Recommendation[] {
  const recs: Recommendation[] = [];
  const chMap = new Map(challenges.map((c) => [c.id, c]));
  const stats = categoryStats(attempts, challenges);
  const overall = overallStats(attempts);
  const c = counted(attempts);
  for (const s of stats) {
    const catAttempts = c.filter((a) => chMap.get(a.challengeId)?.category === s.key);
    const ids = catAttempts.map((a) => a.id);
    if (s.attempts === 0) {
      if ((DOMAINS as readonly string[]).includes(s.key)) {
        recs.push({ id: `na-${s.key}`, kind: "not_assessed", category: s.key, title: `${s.key}: not assessed`, reason: "No recorded attempts yet, so there is no evidence of strength or weakness.", attemptIds: [] });
      }
      continue;
    }
    if (s.attempts >= WEAK_MIN_ATTEMPTS && (s.solveRate ?? 1) < WEAK_RATE) {
      recs.push({ id: `low-${s.key}`, kind: "practice_more", category: s.key, title: `More practice: ${s.key}`, reason: `Solve rate ${pct(s.solveRate)} over ${s.attempts} attempts (below ${pct(WEAK_RATE)} with at least ${WEAK_MIN_ATTEMPTS} attempts).`, attemptIds: ids });
    }
    const times = catAttempts.filter((a) => a.status === "solved" && typeof a.durationMinutes === "number");
    if (times.length >= WEAK_MIN_ATTEMPTS && s.avgSolveMinutes !== null && overall.avgSolveMinutes !== null && s.avgSolveMinutes > 1.5 * overall.avgSolveMinutes) {
      recs.push({ id: `slow-${s.key}`, kind: "timed_drills", category: s.key, title: `Timed drills: ${s.key}`, reason: `Average solve time ${Math.round(s.avgSolveMinutes)} min vs ${Math.round(overall.avgSolveMinutes)} min overall (over 1.5x).`, attemptIds: times.map((a) => a.id) });
    }
    if (s.attempts >= minSample && (s.solveRate ?? 0) >= STRONG_RATE) {
      recs.push({ id: `strong-${s.key}`, kind: "strong", category: s.key, title: `Strong: ${s.key}`, reason: `Solve rate ${pct(s.solveRate)} over ${s.attempts} attempts (minimum sample ${minSample}).`, attemptIds: ids });
    }
  }
  for (const ch of challenges) {
    const mine = c.filter((a) => a.challengeId === ch.id);
    const unsolved = mine.filter((a) => a.status !== "solved");
    if (unsolved.length >= 2 && !mine.some((a) => a.status === "solved")) {
      recs.push({ id: `rep-${ch.id}`, kind: "revision_queue", category: ch.category, title: `Revise: ${ch.title}`, reason: `${unsolved.length} unsolved attempts and no solve yet - added to the revision queue.`, attemptIds: unsolved.map((a) => a.id) });
    }
  }
  return recs;
}

export const pct = (v: number | null | undefined) => (v === null || v === undefined ? "n/a" : `${Math.round(v * 100)}%`);

export function taskCompletion(tasks: LearningTaskDto[]) {
  const required = tasks.filter((t) => t.status !== "skipped");
  const done = required.filter((t) => t.status === "completed").length;
  return { done, total: required.length, ratio: rate(done, required.length) };
}

export interface MockSummary {
  mock: MockDto; attempted: number; solved: number; total: number; scorePct: number | null; scoreLabel: string | null;
}
export function mockSummary(mock: MockDto, results: MockResultDto[]): MockSummary {
  const mine = results.filter((r) => r.mockSessionId === mock.id);
  const solved = mine.filter((r) => r.status === "solved").length;
  const attempted = mine.filter((r) => r.status === "solved" || r.status === "attempted").length;
  let scorePct: number | null = null;
  let scoreLabel: string | null = null;
  if (mock.score !== null && mock.pointsAvailable) {
    scorePct = mock.score / mock.pointsAvailable;
    scoreLabel = `${mock.score}/${mock.pointsAvailable} user-configured points`;
  } else if (mine.length > 0) {
    scorePct = solved / mine.length;
    scoreLabel = `${solved}/${mine.length} challenges solved`;
  }
  return { mock, attempted, solved, total: mine.length || mock.challengeIds.length, scorePct, scoreLabel };
}

export function studyMinutesByDay(sessions: StudySessionDto[]) {
  const m = new Map<string, number>();
  for (const s of sessions) {
    const k = s.startedAt.slice(0, 10);
    m.set(k, (m.get(k) ?? 0) + s.durationMinutes);
  }
  return m;
}

export interface ReadinessComponent {
  key: "learning" | "ctf" | "coverage" | "mock" | "reporting";
  label: string; weight: number; value: number | null; detail: string;
}
export interface Readiness {
  score: number | null; evidenceWeight: number; components: ReadinessComponent[]; formula: string;
}

export function readiness(input: {
  tasks: LearningTaskDto[]; attempts: AttemptDto[]; challenges: ChallengeDto[]; mocks: MockDto[];
  mockResults: MockResultDto[]; reports: ReportDto[]; settings: Pick<SettingsDto, "readinessWeights">;
}): Readiness {
  const w = input.settings.readinessWeights;
  const tc = taskCompletion(input.tasks);
  const all = overallStats(input.attempts);
  const cov = domainCoverage(input.attempts, input.challenges);
  const done = input.mocks.filter((m) => m.status === "completed").map((m) => mockSummary(m, input.mockResults)).filter((s) => s.scorePct !== null);
  const solvedIds = new Set(counted(input.attempts).filter((a) => a.status === "solved").map((a) => a.challengeId));
  const reportedSolved = [...solvedIds].filter((id) => input.reports.some((r) => r.challengeId === id)).length;

  const components: ReadinessComponent[] = [
    { key: "learning", label: "Learning completion", weight: w.learning, value: tc.total ? tc.ratio : null, detail: `${tc.done}/${tc.total} roadmap tasks completed` },
    { key: "ctf", label: "CTF performance", weight: w.ctf, value: all.solveRate, detail: all.attempts ? `${all.solvedAttempts}/${all.attempts} attempts solved` : "No attempts recorded - not assessed" },
    { key: "coverage", label: "Domain coverage", weight: w.coverage, value: all.attempts ? cov.ratio : null, detail: all.attempts ? `${cov.covered}/${cov.total} domains attempted` : "No attempts recorded - not assessed" },
    { key: "mock", label: "Mock performance", weight: w.mock, value: done.length ? mean(done.map((d) => d.scorePct as number)) : null, detail: done.length ? `Average of ${done.length} completed mock(s) (personal scoring)` : "No completed mocks - not assessed" },
    { key: "reporting", label: "Reporting", weight: w.reporting, value: solvedIds.size ? reportedSolved / solvedIds.size : null, detail: solvedIds.size ? `${reportedSolved}/${solvedIds.size} solved challenges have a practice report` : "No solved challenges - not assessed" },
  ];
  const assessed = components.filter((c) => c.value !== null && c.weight > 0);
  const evidenceWeight = assessed.reduce((s, c) => s + c.weight, 0);
  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  const score = evidenceWeight > 0 ? Math.round((assessed.reduce((s, c) => s + (c.value as number) * c.weight, 0) / evidenceWeight) * 100) : null;
  return {
    score,
    evidenceWeight: totalWeight > 0 ? evidenceWeight / totalWeight : 0,
    components,
    formula: "score = sum(weight x component) / sum(weights of components that have evidence). Components with no data are excluded, not counted as zero.",
  };
}
