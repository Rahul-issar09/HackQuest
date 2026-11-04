import {
  Challenge, ChallengeAttempt, LearningTask, MockChallengeResult, MockSession, PracticeReport, Settings, StudySession,
} from "@/lib/db/models";
import {
  categoryStats, difficultyStats, domainCoverage, mockSummary, overallStats, readiness, retryQueue, studyMinutesByDay,
  taskCompletion, weaknessRecommendations,
} from "@/lib/analytics";
import { HttpError, ok, route } from "@/lib/server/api";
import { toDto } from "@/lib/server/serialize";
import type {
  AttemptDto, ChallengeDto, LearningTaskDto, MockDto, MockResultDto, ReportDto, SettingsDto, StudySessionDto,
} from "@/lib/types";

export const dynamic = "force-dynamic";

/** All analytics are derived on request from persisted records. */
export const GET = route(async () => {
  const [settingsDoc, attempts, challenges, tasks, mocks, results, reports, sessions] = await Promise.all([
    Settings.findOne({ key: "singleton" }).lean(),
    ChallengeAttempt.find().lean(),
    Challenge.find().lean(),
    LearningTask.find().lean(),
    MockSession.find().sort({ scheduledAt: 1 }).lean(),
    MockChallengeResult.find().lean(),
    PracticeReport.find().select("challengeId attemptId").lean(),
    StudySession.find().lean(),
  ]);
  if (!settingsDoc) throw new HttpError(404, "Settings not initialised");
  const settings = toDto<SettingsDto>(settingsDoc);
  const A = toDto<AttemptDto[]>(attempts);
  const C = toDto<ChallengeDto[]>(challenges);
  const T = toDto<LearningTaskDto[]>(tasks);
  const M = toDto<MockDto[]>(mocks);
  const R = toDto<MockResultDto[]>(results);
  const P = toDto<ReportDto[]>(reports);
  const S = toDto<StudySessionDto[]>(sessions);

  const completedMocks = M.filter((m) => m.status === "completed").map((m) => mockSummary(m, R));
  return ok({
    settings,
    counts: { challenges: C.length, attempts: A.length, reports: P.length, mocksCompleted: completedMocks.length },
    overall: overallStats(A),
    categories: categoryStats(A, C),
    difficulties: difficultyStats(A, C),
    coverage: domainCoverage(A, C),
    retryQueue: retryQueue(A, C),
    recommendations: weaknessRecommendations(A, C, settings.minSampleSize),
    tasks: taskCompletion(T),
    readiness: readiness({ tasks: T, attempts: A, challenges: C, mocks: M, mockResults: R, reports: P, settings }),
    mockSummaries: completedMocks,
    studyByDay: Object.fromEntries(studyMinutesByDay(S)),
  });
});
