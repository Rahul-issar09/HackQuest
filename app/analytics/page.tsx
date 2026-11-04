"use client";
import Link from "next/link";
import { addDays, format } from "date-fns";
import { Async, Badge, Button, Card, CardTitle, EmptyState, PageHeader, Stat } from "@/components/ui";
import { MinutesBarChart, RateBarChart, TrendLineChart } from "@/components/charts-lazy";
import { useApi } from "@/lib/client/api";
import { pct, type GroupStat, type MockSummary, type OverallStats } from "@/lib/analytics";
import { fmtDay, minutesLabel, titleCase } from "@/lib/utils";

type Data = {
  overall: OverallStats; categories: GroupStat[]; difficulties: GroupStat[]; mockSummaries: MockSummary[];
  studyByDay: Record<string, number>; settings: { minSampleSize: number };
};

function StatTable({ rows, label, minSample }: { rows: GroupStat[]; label: string; minSample: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{label}</caption>
        <thead className="text-xs text-muted"><tr><th scope="col" className="py-1 pr-3">{label}</th><th scope="col" className="pr-3">Attempts</th><th scope="col" className="pr-3">Solved</th><th scope="col" className="pr-3">Solve rate</th><th scope="col" className="pr-3">Avg solve time</th><th scope="col">Evidence</th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.key} className="border-t border-border">
            <th scope="row" className="py-1.5 pr-3 font-normal">{titleCase(r.key)}</th>
            <td className="pr-3">{r.attempts}</td><td className="pr-3">{r.solved}</td>
            <td className="pr-3">{r.assessed ? pct(r.solveRate) : <Badge>Not assessed</Badge>}</td>
            <td className="pr-3">{r.avgSolveMinutes !== null ? minutesLabel(Math.round(r.avgSolveMinutes)) : "-"}</td>
            <td>{r.assessed ? (r.attempts < minSample ? <Badge tone="warning">Low sample (&lt;{minSample})</Badge> : <Badge tone="success">Enough data</Badge>) : "-"}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

export default function AnalyticsPage() {
  const q = useApi<Data>("/analytics");
  return (
    <div>
      <PageHeader title="Performance Analytics" subtitle="Computed from your recorded attempts, mocks and study sessions. Task completion is not treated as skill mastery." />
      <Async q={q}>{(d) => {
        const o = d.overall;
        const assessed = d.categories.filter((c) => c.assessed);
        const today = new Date();
        const study = Array.from({ length: 14 }, (_, i) => { const day = addDays(today, i - 13); return { name: format(day, "d MMM"), value: d.studyByDay[format(day, "yyyy-MM-dd")] ?? 0 }; });
        const anyStudy = study.some((s) => s.value > 0);
        const mocks = d.mockSummaries.filter((m) => m.scorePct !== null).map((m) => ({ name: fmtDay(m.mock.scheduledAt, "d MMM"), value: Math.round((m.scorePct as number) * 100) }));
        return (
          <div className="space-y-4">
            {o.attempts === 0 && <EmptyState title="No attempts recorded yet" description="Log challenge attempts to unlock solve rates and category analysis. Empty categories are shown as not assessed, never as 0%." action={<Link href="/challenges?log=1"><Button variant="primary">Log an attempt</Button></Link>} />}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card><Stat label="Attempts" value={o.attempts} hint={`${o.uniqueChallengesAttempted} unique challenges - ${o.skipped} skipped (excluded)`} /></Card>
              <Card><Stat label="Solved" value={o.solvedAttempts} hint={`${o.uniqueChallengesSolved} unique challenges solved`} /></Card>
              <Card><Stat label="Overall solve rate" value={pct(o.solveRate)} hint="solved attempts / counted attempts" /></Card>
              <Card><Stat label="First-attempt solve rate" value={pct(o.firstAttemptSolveRate)} hint="challenges solved on their first attempt" /></Card>
              <Card><Stat label="Average solve time" value={o.avgSolveMinutes !== null ? minutesLabel(Math.round(o.avgSolveMinutes)) : "-"} hint="mean over solved attempts with a duration" /></Card>
              <Card><Stat label="Median solve time" value={o.medianSolveMinutes !== null ? minutesLabel(Math.round(o.medianSolveMinutes)) : "-"} hint="median over solved attempts with a duration" /></Card>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card><CardTitle>Solve rate by category</CardTitle>
                {assessed.length === 0 ? <p className="text-sm text-muted">Not assessed - no attempts yet.</p> : <RateBarChart data={assessed.map((c) => ({ name: c.key, value: Math.round((c.solveRate ?? 0) * 100), n: c.attempts }))} />}</Card>
              <Card><CardTitle>Solve rate by difficulty</CardTitle>
                {d.difficulties.every((x) => !x.assessed) ? <p className="text-sm text-muted">Not assessed - no attempts yet.</p> : <RateBarChart data={d.difficulties.filter((c) => c.assessed).map((c) => ({ name: titleCase(c.key), value: Math.round((c.solveRate ?? 0) * 100), n: c.attempts }))} />}</Card>
            </div>
            <Card><CardTitle>Category detail</CardTitle><StatTable rows={d.categories} label="Category" minSample={d.settings.minSampleSize} /></Card>
            <Card><CardTitle>Difficulty detail</CardTitle><StatTable rows={d.difficulties} label="Difficulty" minSample={d.settings.minSampleSize} /></Card>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card><CardTitle>Mock trend (personal scoring)</CardTitle>{mocks.length === 0 ? <EmptyState title="No completed mocks yet" description="Finish a mock in the Mock CTF Arena to see a trend. Mock scores are personal, not official TCS scores." action={<Link href="/mocks"><Button>Open arena</Button></Link>} /> : <TrendLineChart data={mocks} unit="%" label="Mock score percentage over time" />}</Card>
              <Card><CardTitle>Study time, last 14 days</CardTitle>{!anyStudy ? <EmptyState title="No study sessions recorded" description="Use Start study session on the Dashboard or a roadmap day." /> : <MinutesBarChart data={study} />}</Card>
            </div>
            <Card>
              <CardTitle>How these are calculated</CardTitle>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
                <li><strong>Counted attempt:</strong> solved, failed or attempted. Skipped attempts are listed separately and excluded from all rates.</li>
                <li><strong>Solve rate:</strong> solved counted attempts / counted attempts. It counts attempts, not unique challenges, so retries count.</li>
                <li><strong>First-attempt solve rate:</strong> unique challenges whose chronologically first counted attempt was solved / unique challenges attempted.</li>
                <li><strong>Solve time:</strong> only solved attempts with a recorded duration. Both mean and median are shown.</li>
                <li>Categories with no attempts are &quot;not assessed&quot;, not weak. A category needs at least {d.settings.minSampleSize} attempts (configurable in Settings) before it can be called strong.</li>
              </ul>
            </Card>
          </div>
        );
      }}</Async>
    </div>
  );
}
