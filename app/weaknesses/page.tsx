"use client";
import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Async, Badge, Button, Card, CardTitle, EmptyState, PageHeader } from "@/components/ui";
import { post, useApi } from "@/lib/client/api";
import { WEAK_MIN_ATTEMPTS, WEAK_RATE, type Recommendation, type RetryItem } from "@/lib/analytics";
import type { AttemptDto, ChallengeDto, ListResult } from "@/lib/types";
import { addDays, format } from "date-fns";
import { fmtDateTime, titleCase } from "@/lib/utils";

type Data = { recommendations: Recommendation[]; retryQueue: RetryItem[]; settings: { minSampleSize: number } };
const KIND: Record<Recommendation["kind"], { label: string; tone: "danger" | "warning" | "accent" | "neutral" | "success" }> = {
  practice_more: { label: "Practice more", tone: "danger" }, revision_queue: { label: "Revision queue", tone: "warning" },
  timed_drills: { label: "Timed drills", tone: "warning" }, not_assessed: { label: "Not assessed", tone: "neutral" }, strong: { label: "Strong", tone: "success" },
};

export default function WeaknessPage() {
  const q = useApi<Data>("/analytics");
  const attempts = useApi<ListResult<AttemptDto>>("/challengeAttempts?limit=500");
  const challenges = useApi<ListResult<ChallengeDto>>("/challenges?limit=500");
  const [open, setOpen] = React.useState<string | null>(null);
  const [added, setAdded] = React.useState<Set<string>>(new Set());
  const aMap = new Map((attempts.data?.items ?? []).map((a) => [a.id, a]));
  const cMap = new Map((challenges.data?.items ?? []).map((c) => [c.id, c]));

  async function addRevision(r: Recommendation) {
    try {
      const cid = r.id.startsWith("rep-") ? r.id.slice(4) : null;
      await post("/revisionItems", { title: r.title, sourceType: cid ? "challenge" : "topic", sourceId: cid, dueDate: addDays(new Date(), 1).toISOString(), priority: r.kind === "practice_more" || r.kind === "revision_queue" ? "high" : "medium", reason: r.reason });
      setAdded(new Set(added).add(r.id)); toast.success("Added to revision items (due tomorrow)");
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div>
      <PageHeader title="Weakness Analysis" subtitle="Transparent rules, not opaque AI. Every recommendation explains why it appears and links to the attempts behind it." />
      <Async q={q}>{(d) => {
        const actionable = d.recommendations.filter((r) => r.kind !== "not_assessed" && r.kind !== "strong");
        const strong = d.recommendations.filter((r) => r.kind === "strong");
        const na = d.recommendations.filter((r) => r.kind === "not_assessed");
        return (
          <div className="space-y-4">
            <Card>
              <CardTitle>Recommendations</CardTitle>
              {actionable.length === 0 ? <EmptyState title="No weaknesses detected" description={`Recommendations need evidence: a category with at least ${WEAK_MIN_ATTEMPTS} attempts, or a challenge with repeated unsolved attempts. Keep logging attempts.`} action={<Link href="/challenges?log=1"><Button variant="primary">Log an attempt</Button></Link>} /> : (
                <ul className="space-y-3">{actionable.map((r) => (
                  <li key={r.id} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2"><Badge tone={KIND[r.kind].tone}>{KIND[r.kind].label}</Badge><span className="font-medium">{r.title}</span></div>
                      <div className="flex gap-2">
                        <Button size="sm" aria-expanded={open === r.id} onClick={() => setOpen(open === r.id ? null : r.id)}>Why? ({r.attemptIds.length} attempts)</Button>
                        <Button size="sm" variant="primary" disabled={added.has(r.id)} onClick={() => void addRevision(r)}>{added.has(r.id) ? "Added" : "Add to revision"}</Button>
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-muted">{r.reason}</p>
                    {open === r.id && (
                      <ul className="mt-2 space-y-1 border-t border-border pt-2 text-sm">
                        {r.attemptIds.map((id) => { const a = aMap.get(id); const c = a && cMap.get(a.challengeId); return a ? <li key={id}>{c?.title ?? "Challenge"} - {titleCase(a.status)} - {fmtDateTime(a.attemptedAt)}{a.durationMinutes ? ` - ${a.durationMinutes}m` : ""}</li> : null; })}
                      </ul>
                    )}
                  </li>
                ))}</ul>
              )}
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card><CardTitle>Not assessed</CardTitle>
                {na.length === 0 ? <p className="text-sm text-muted">Every domain has at least one recorded attempt.</p> : (<><p className="mb-2 text-sm text-muted">No attempts yet in these domains. That is missing evidence, not weakness.</p><div className="flex flex-wrap gap-2">{na.map((r) => <Badge key={r.id}>{r.category}</Badge>)}</div></>)}</Card>
              <Card><CardTitle>Strong categories</CardTitle>
                {strong.length === 0 ? <p className="text-sm text-muted">A category counts as strong with solve rate of at least 80% over {d.settings.minSampleSize}+ attempts (sample size is configurable in Settings).</p> : <ul className="space-y-2">{strong.map((r) => <li key={r.id}><div className="text-sm font-medium">{r.title}</div><div className="text-xs text-muted">{r.reason}</div></li>)}</ul>}</Card>
            </div>

            <Card><CardTitle action={<Link href="/challenges" className="text-sm text-accent hover:underline">Open retry queue</Link>}>Retry queue ({d.retryQueue.length})</CardTitle>
              {d.retryQueue.length === 0 ? <p className="text-sm text-muted">Nothing waiting for a retry.</p> : <ul className="space-y-1 text-sm">{d.retryQueue.slice(0, 8).map((r) => <li key={r.challenge.id}>{r.challenge.title} <span className="text-muted">- {r.reason} - priority {r.challenge.retryPriority}</span></li>)}</ul>}</Card>

            <Card><CardTitle>Rules used</CardTitle>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
                <li>Practice more: solve rate below {Math.round(WEAK_RATE * 100)}% with at least {WEAK_MIN_ATTEMPTS} counted attempts in a category.</li>
                <li>Revision queue: a challenge with two or more unsolved attempts and no solve.</li>
                <li>Timed drills: average solve time over 1.5x your overall average, with at least {WEAK_MIN_ATTEMPTS} timed solves in the category.</li>
                <li>Not assessed: a domain with no attempts. Never labelled weak.</li>
                <li>Strong: solve rate of at least 80% with at least {d.settings.minSampleSize} attempts.</li>
              </ul>
              <p className="mt-2 text-xs text-muted">Generated {format(new Date(), "d MMM yyyy HH:mm")} from your persisted attempts.</p>
            </Card>
          </div>
        );
      }}</Async>
    </div>
  );
}
