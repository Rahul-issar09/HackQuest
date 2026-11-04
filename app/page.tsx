"use client";
import * as React from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, FileText, Plus, Swords } from "lucide-react";
import { Async, Badge, Button, Card, CardTitle, EmptyState, PageHeader, Progress, Stat, relevanceTone, statusTone } from "@/components/ui";
import { RateBarChart } from "@/components/charts-lazy";
import { StudyTimer } from "@/components/dashboard/study-timer";
import { TaskChecklist } from "@/components/roadmap/task-checklist";
import { useSettings } from "@/components/layout/settings-context";
import { useApi, qs } from "@/lib/client/api";
import { currentPrepDay, daysUntil, toDayKey, weekRange } from "@/lib/dates";
import { pct, type Recommendation } from "@/lib/analytics";
import { RELEVANCE_LABEL } from "@/lib/constants";
import { ago, fmtDay, minutesLabel, titleCase } from "@/lib/utils";
import type { AttemptDto, ChallengeDto, LearningTaskDto, ListResult, MockDto, NoteDto, RoadmapDayDto } from "@/lib/types";

type Analytics = {
  overall: { attempts: number; solvedAttempts: number; uniqueChallengesSolved: number; uniqueChallengesAttempted: number; solveRate: number | null };
  categories: { key: string; attempts: number; solved: number; solveRate: number | null; assessed: boolean }[];
  tasks: { done: number; total: number; ratio: number | null };
  recommendations: Recommendation[];
  studyByDay: Record<string, number>;
};

export default function DashboardPage() {
  const { data: settings } = useSettings();
  const analytics = useApi<Analytics>("/analytics");
  const days = useApi<ListResult<RoadmapDayDto>>("/roadmapDays?limit=100&sort=dayNumber");
  const notes = useApi<ListResult<NoteDto>>("/notes?limit=5");
  const attempts = useApi<ListResult<AttemptDto>>("/challengeAttempts?limit=100");
  const challenges = useApi<ListResult<ChallengeDto>>("/challenges?limit=500");
  const mocks = useApi<ListResult<MockDto>>("/mockSessions?limit=50");

  const today = React.useMemo(() => {
    if (!settings || !days.data || days.data.items.length === 0) return null;
    const key = toDayKey(new Date());
    const byDate = days.data.items.find((d) => d.date.slice(0, 10) === key);
    if (byDate) return byDate;
    const last = days.data.items[days.data.items.length - 1].date;
    const n = currentPrepDay(settings.preparationStartDate, last);
    return n ? days.data.items.find((d) => d.dayNumber === n) ?? null : null;
  }, [settings, days.data]);
  const todayTasks = useApi<ListResult<LearningTaskDto>>(today ? `/learningTasks${qs({ roadmapDayId: today.id, limit: 100 })}` : null);

  if (!settings) return <Async q={analytics}>{() => null}</Async>;
  const left = daysUntil(settings.examDate);
  const startsIn = daysUntil(settings.preparationStartDate);
  const week = weekRange();
  const weekMinutes = Object.entries(analytics.data?.studyByDay ?? {})
    .filter(([k]) => k >= toDayKey(week.from) && k < toDayKey(week.to))
    .reduce((s, [, v]) => s + v, 0);
  const chMap = new Map((challenges.data?.items ?? []).map((c) => [c.id, c]));
  const unsolved = (attempts.data?.items ?? []).filter((a) => a.status === "failed" || a.status === "attempted").slice(0, 4);
  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
  const upcoming = (mocks.data?.items ?? [])
    .filter((m) => m.status === "active" || (m.status === "planned" && new Date(m.scheduledAt) >= startOfToday))
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        subtitle={`Primary target: ${titleCase(settings.primaryDifficulty)} difficulty. Everything here is computed from your recorded activity.`}
        actions={<>
          <Link href="/notes?new=1"><Button><Plus className="h-4 w-4" aria-hidden /> Add note</Button></Link>
          <Link href="/challenges?log=1"><Button variant="primary"><Swords className="h-4 w-4" aria-hidden /> Log challenge</Button></Link>
        </>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle action={today && <Link href={`/roadmap?day=${today.dayNumber}`} className="inline-flex items-center gap-1 text-sm text-accent hover:underline">Day detail <ArrowRight className="h-3 w-3" aria-hidden /></Link>}>Today&apos;s mission</CardTitle>
          {days.loading ? <p className="text-sm text-muted">Loading roadmap...</p> : days.error ? <p className="text-sm text-danger">{days.error.message}</p> : !today ? (
            <EmptyState
              title={startsIn > 0 ? `Preparation starts in ${startsIn} day${startsIn === 1 ? "" : "s"}` : "No roadmap day for today"}
              description={startsIn > 0 ? "Open the roadmap to preview your plan." : "Today is outside the configured roadmap dates. Adjust dates in Settings or reschedule days in the roadmap."}
              action={<Link href="/roadmap"><Button>Open roadmap</Button></Link>} icon={<CalendarClock className="h-8 w-8" />} />
          ) : (
            <div className="space-y-3">
              <div>
                <div className="text-lg font-semibold">Day {today.dayNumber}: {today.title}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span>{fmtDay(today.date)}</span><Badge>{today.domain}</Badge>
                  <Badge tone={relevanceTone(today.relevanceClassification)}>{RELEVANCE_LABEL[today.relevanceClassification]}</Badge>
                  {today.isRevisionOfKnownTopic && <Badge tone="warning">Revision / advanced practice</Badge>}
                  <span>~{minutesLabel(today.estimatedMinutes)}</span>
                </div>
              </div>
              {todayTasks.data && (
                <TaskChecklist tasks={todayTasks.data.items} onChanged={(t) => { todayTasks.setData((p) => p && { ...p, items: p.items.map((x) => (x.id === t.id ? t : x)) }); void analytics.reload(); }} />
              )}
              <div className="border-t border-border pt-3"><StudyTimer dayId={today.id} onChanged={() => void analytics.reload()} /></div>
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Countdown</CardTitle>
          <div className="text-4xl font-bold tabular-nums">{Math.max(left, 0)}<span className="ml-2 text-base font-normal text-muted">day{left === 1 ? "" : "s"}</span></div>
          <p className="mt-1 text-sm text-muted">{left > 0 ? `until ${fmtDay(settings.examDate)}` : left === 0 ? "Round 1 is today (configured date)" : `Configured date ${fmtDay(settings.examDate)} has passed`}</p>
          <p className="mt-3 text-xs text-muted">This is your configured date. Verify the official schedule on the TCS contest site.</p>
          <div className="mt-4"><Link href="/settings" className="text-sm text-accent hover:underline">Edit dates</Link></div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <Stat label="Roadmap completion" value={analytics.data?.tasks.ratio != null ? pct(analytics.data.tasks.ratio) : "-"} hint={analytics.data ? `${analytics.data.tasks.done}/${analytics.data.tasks.total} required tasks` : undefined} />
          <div className="mt-3"><Progress value={(analytics.data?.tasks.ratio ?? 0) * 100} label="Roadmap completion" /></div>
        </Card>
        <Card><Stat label="Challenges solved" value={analytics.data ? analytics.data.overall.uniqueChallengesSolved : "-"} hint={analytics.data ? `${analytics.data.overall.attempts} attempts on ${analytics.data.overall.uniqueChallengesAttempted} challenges` : undefined} /></Card>
        <Card><Stat label="Study time this week" value={minutesLabel(weekMinutes)} hint={`Target ${minutesLabel(settings.dailyStudyTargetMinutes)}/day`} /></Card>
        <Card>
          <Stat label="Upcoming mock" value={upcoming ? fmtDay(upcoming.scheduledAt, "d MMM") : "None"} hint={upcoming ? upcoming.title : "Schedule one in the Mock CTF Arena"} />
          <Link href="/mocks" className="mt-2 inline-block text-sm text-accent hover:underline">{upcoming?.status === "active" ? "Mock in progress - resume" : "Open arena"}</Link>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle action={<Link href="/analytics" className="text-sm text-accent hover:underline">Details</Link>}>Category performance</CardTitle>
          <Async q={analytics}>{(a) => {
            const assessed = a.categories.filter((c) => c.assessed);
            return assessed.length === 0 ? (
              <EmptyState title="Not assessed yet" description="Log challenge attempts to see solve rate per category. Categories without attempts are never shown as 0%." action={<Link href="/challenges?log=1"><Button variant="primary">Log a challenge</Button></Link>} />
            ) : <RateBarChart data={assessed.map((c) => ({ name: c.key, value: Math.round((c.solveRate ?? 0) * 100), n: c.attempts }))} />;
          }}</Async>
        </Card>
        <Card>
          <CardTitle action={<Link href="/weaknesses" className="text-sm text-accent hover:underline">All</Link>}>Recommendations</CardTitle>
          <Async q={analytics}>{(a) => {
            const recs = a.recommendations.filter((r) => r.kind !== "not_assessed" && r.kind !== "strong").slice(0, 4);
            return recs.length === 0 ? <EmptyState title="No recommendations yet" description="Recommendations appear after enough recorded attempts. Each one lists the reason and supporting attempts." /> : (
              <ul className="space-y-3">{recs.map((r) => <li key={r.id}><div className="text-sm font-medium">{r.title}</div><div className="text-xs text-muted">{r.reason}</div></li>)}</ul>
            );
          }}</Async>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle action={<Link href="/notes" className="text-sm text-accent hover:underline">All notes</Link>}>Recent notes</CardTitle>
          {notes.loading ? <p className="text-sm text-muted">Loading...</p> : notes.data && notes.data.items.length > 0 ? (
            <ul className="divide-y divide-border">{notes.data.items.map((n) => (
              <li key={n.id}><Link href={`/notes?id=${n.id}`} className="flex items-center justify-between gap-3 py-2 hover:text-accent"><span className="flex items-center gap-2 truncate"><FileText className="h-4 w-4 shrink-0 text-muted" aria-hidden /><span className="truncate">{n.title || "Untitled note"}</span></span><span className="shrink-0 text-xs text-muted">{ago(n.updatedAt)}</span></Link></li>
            ))}</ul>
          ) : <EmptyState title="No notes yet" description="Capture commands and lessons as you study." action={<Link href="/notes?new=1"><Button variant="primary">Create your first note</Button></Link>} />}
        </Card>
        <Card>
          <CardTitle action={<Link href="/challenges" className="text-sm text-accent hover:underline">Retry queue</Link>}>Recent unsolved attempts</CardTitle>
          {unsolved.length === 0 ? <EmptyState title="Nothing unsolved" description="Failed or unfinished attempts will be listed here." /> : (
            <ul className="divide-y divide-border">{unsolved.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2"><span className="truncate">{chMap.get(a.challengeId)?.title ?? "Challenge"}</span><span className="flex shrink-0 items-center gap-2"><Badge tone={statusTone(a.status)}>{titleCase(a.status)}</Badge><span className="text-xs text-muted">{ago(a.attemptedAt)}</span></span></li>
            ))}</ul>
          )}
        </Card>
      </div>
    </div>
  );
}
