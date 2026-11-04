"use client";
import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Pause, Pencil, Play, Plus, Square, Trash2 } from "lucide-react";
import {
  Async, Badge, Button, Card, CardTitle, ConfirmDialog, Dialog, EmptyState, Field, Input, PageHeader, Select, Textarea, difficultyTone, statusTone,
} from "@/components/ui";
import { ApiError, del, patch, post, qs, useApi } from "@/lib/client/api";
import { mockSummary, pct } from "@/lib/analytics";
import { formatClock, isExpired, isPaused, remainingMs, type TimerState } from "@/lib/mock/timer";
import { fmtDateTime, minutesLabel, titleCase, toLocalInput } from "@/lib/utils";
import { MOCK_RESULT_STATUS } from "@/lib/constants";
import type { ChallengeDto, ListResult, MockDto, MockResultDto, ReportDto } from "@/lib/types";

const DISCLAIMER = "Mock scores come only from points you configure or results you enter. They are not official TCS scores and do not predict qualification.";
const toTimer = (m: MockDto): TimerState => ({ status: m.status, durationMinutes: m.durationMinutes, startedAt: m.startedAt, pausedAt: m.pausedAt, pausedTotalMs: m.pausedTotalMs, endedAt: m.endedAt });

function MocksInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const selectedId = sp.get("id");
  const mocks = useApi<ListResult<MockDto>>("/mockSessions?limit=100&sort=scheduledAt");
  const challenges = useApi<ListResult<ChallengeDto>>("/challenges?limit=500&sort=title");
  const [form, setForm] = React.useState<MockDto | "new" | null>(null);
  const [deleting, setDeleting] = React.useState<MockDto | null>(null);
  const list = mocks.data?.items ?? [];
  const active = list.find((m) => m.status === "active");
  const selected = list.find((m) => m.id === selectedId) ?? active ?? null;
  const select = (id: string | null) => router.replace(id ? `/mocks?id=${id}` : "/mocks", { scroll: false });

  async function remove() {
    if (!deleting) return;
    try { await del(`/mockSessions/${deleting.id}`); toast.success("Mock deleted"); setDeleting(null); if (selectedId === deleting.id) select(null); void mocks.reload(); } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div>
      <PageHeader title="Mock CTF Arena" subtitle="Run a local six-hour simulation with your own challenge set. This does not connect to or imitate the live contest platform."
        actions={<Button variant="primary" onClick={() => setForm("new")}><Plus className="h-4 w-4" aria-hidden /> New mock</Button>} />
      <p className="mb-4 rounded-lg border border-border bg-surface-2 p-2 text-xs text-muted">{DISCLAIMER}</p>
      <Async q={mocks}>{() => (
        <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-2">
            {list.length === 0 ? <EmptyState title="No mock sessions" description="Create one to practise under time pressure." action={<Button variant="primary" onClick={() => setForm("new")}>New mock</Button>} /> : list.map((m) => (
              <button key={m.id} onClick={() => select(m.id)} aria-current={selected?.id === m.id ? "true" : undefined}
                className={`w-full rounded-card border bg-surface p-3 text-left hover:border-accent/60 ${selected?.id === m.id ? "border-accent" : "border-border"}`}>
                <div className="flex items-center justify-between gap-2"><span className="font-medium">{m.title}</span><Badge tone={statusTone(m.status)}>{titleCase(m.status)}</Badge></div>
                <div className="mt-1 text-xs text-muted">{fmtDateTime(m.scheduledAt)} - {minutesLabel(m.durationMinutes)} - {m.challengeIds.length} challenge{m.challengeIds.length === 1 ? "" : "s"}</div>
              </button>
            ))}
          </div>
          <div>
            {selected ? <MockDetail key={selected.id} mock={selected} challenges={challenges.data?.items ?? []} onChanged={() => void mocks.reload()} onEdit={() => setForm(selected)} onDelete={() => setDeleting(selected)} />
              : <Card><EmptyState title="Select a mock" description="Choose a session on the left, or create a new one." /></Card>}
          </div>
        </div>
      )}</Async>
      {form && <MockForm mock={form === "new" ? null : form} challenges={challenges.data?.items ?? []} onClose={() => setForm(null)} onSaved={(m) => { setForm(null); void mocks.reload(); select(m.id); }} />}
      <ConfirmDialog open={!!deleting} title="Delete mock?" message={`"${deleting?.title}", its results and the attempts recorded from it will be permanently deleted.`} onCancel={() => setDeleting(null)} onConfirm={remove} />
    </div>
  );
}

function MockDetail({ mock, challenges, onChanged, onEdit, onDelete }: { mock: MockDto; challenges: ChallengeDto[]; onChanged: () => void; onEdit: () => void; onDelete: () => void }) {
  const results = useApi<ListResult<MockResultDto>>(`/mockChallengeResults${qs({ mockSessionId: mock.id, limit: 200 })}`);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState<"discard" | "finish" | null>(null);
  const [now, setNow] = React.useState(() => Date.now());
  const chMap = new Map(challenges.map((c) => [c.id, c]));
  const timer = toTimer(mock);
  const isActive = mock.status === "active";

  React.useEffect(() => {
    if (!isActive) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isActive]);
  React.useEffect(() => {
    if (!isActive) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isActive]);
  // make sure every selected challenge has a result row
  React.useEffect(() => {
    if (!results.data || mock.status === "completed" || mock.status === "abandoned") return;
    const have = new Set(results.data.items.map((r) => r.challengeId));
    const missing = mock.challengeIds.filter((c) => !have.has(c));
    if (missing.length) void Promise.all(missing.map((c) => post("/mockChallengeResults", { mockSessionId: mock.id, challengeId: c }).catch(() => null))).then(() => results.reload());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results.data, mock.challengeIds.join(",")]);

  async function act(action: "start" | "pause" | "resume" | "finish" | "discard") {
    setBusy(action);
    try { await post(`/mockSessions/${mock.id}/action`, { action }); toast.success({ start: "Mock started", pause: "Paused", resume: "Resumed", finish: "Mock finished - results recorded", discard: "Mock discarded" }[action]); setConfirm(null); onChanged(); if (action === "finish") void results.reload(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  }
  async function setResult(r: MockResultDto, body: Partial<MockResultDto>) {
    try { const u = await patch<MockResultDto>(`/mockChallengeResults/${r.id}`, body); results.setData((p) => p && { ...p, items: p.items.map((x) => (x.id === u.id ? u : x)) }); }
    catch (e) { toast.error((e as Error).message); }
  }
  function changeStatus(r: MockResultDto, status: MockResultDto["status"]) {
    const t = new Date().toISOString();
    void setResult(r, { status, startedAt: status === "not_started" ? null : r.startedAt ?? t, completedAt: status === "solved" || status === "skipped" ? t : null });
  }

  const rows = (results.data?.items ?? []).filter((r) => mock.challengeIds.includes(r.challengeId));
  const remaining = remainingMs(timer, now);
  const summary = mockSummary(mock, rows);
  const byCat = new Map<string, { total: number; solved: number }>();
  for (const r of rows) { const c = chMap.get(r.challengeId); const k = c?.category ?? "Other"; const v = byCat.get(k) ?? { total: 0, solved: 0 }; v.total++; if (r.status === "solved") v.solved++; byCat.set(k, v); }

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><h2 className="text-xl font-bold">{mock.title}</h2><div className="text-xs text-muted">Scheduled {fmtDateTime(mock.scheduledAt)} - {minutesLabel(mock.durationMinutes)}</div></div>
        <div className="flex gap-1">{mock.status === "planned" && <Button size="sm" onClick={onEdit}><Pencil className="h-3.5 w-3.5" aria-hidden /> Edit</Button>}<Button size="sm" variant="ghost" aria-label="Delete mock" onClick={onDelete} disabled={isActive}><Trash2 className="h-3.5 w-3.5" /></Button></div>
      </div>

      {mock.status === "planned" && (
        <div className="space-y-2">
          <div className="text-center"><div className="font-mono text-5xl font-bold tabular-nums sm:text-6xl">{formatClock(remainingMs(timer))}</div><div className="text-sm text-muted">Timer starts when you press Start</div></div>
          <div className="flex justify-center"><Button variant="primary" loading={busy === "start"} disabled={mock.challengeIds.length === 0} onClick={() => void act("start")}><Play className="h-4 w-4" aria-hidden /> Start mock</Button></div>
          {mock.challengeIds.length === 0 && <p className="text-center text-sm text-warning">Add at least one challenge (Edit) before starting.</p>}
        </div>
      )}

      {isActive && (
        <div className="space-y-3 rounded-card border border-border bg-bg p-4 text-center">
          <div role="timer" aria-live="off" aria-label={`Time remaining ${formatClock(remaining)}`} className={`font-mono text-6xl font-bold tabular-nums sm:text-7xl ${remaining === 0 ? "text-danger" : isPaused(timer) ? "text-warning" : ""}`}>{formatClock(remaining)}</div>
          <div className="text-sm text-muted">{isPaused(timer) ? "Paused" : remaining === 0 ? "Time is up" : "Remaining (calculated from saved timestamps - survives reload)"}</div>
          {isExpired(timer, now) && <div role="alert" className="flex items-center justify-center gap-2 rounded-lg border border-danger/40 bg-danger/10 p-2 text-sm"><AlertTriangle className="h-4 w-4" aria-hidden /> Time is up. Nothing was deleted - update your results, then finish the session.</div>}
          <div className="flex flex-wrap justify-center gap-2">
            {isPaused(timer) ? <Button loading={busy === "resume"} onClick={() => void act("resume")}><Play className="h-4 w-4" aria-hidden /> Resume</Button> : <Button loading={busy === "pause"} onClick={() => void act("pause")} disabled={remaining === 0}><Pause className="h-4 w-4" aria-hidden /> Pause</Button>}
            <Button variant="primary" onClick={() => setConfirm("finish")}><Square className="h-4 w-4" aria-hidden /> Finish session</Button>
            <Button variant="danger" onClick={() => setConfirm("discard")}>Discard</Button>
          </div>
        </div>
      )}

      {(mock.status === "planned" || isActive || mock.status === "completed") && (
        <section>
          <CardTitle>Challenges ({rows.length}) - solved {summary.solved}/{summary.total}</CardTitle>
          {mock.challengeIds.length === 0 ? <p className="text-sm text-muted">No challenges selected.</p> : results.loading && !results.data ? <p className="text-sm text-muted">Loading...</p> : (
            <ul className="space-y-2">{rows.map((r) => {
              const c = chMap.get(r.challengeId);
              const mins = r.startedAt && r.completedAt ? Math.max(1, Math.round((Date.parse(r.completedAt) - Date.parse(r.startedAt)) / 60000)) : null;
              return (
                <li key={r.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0"><div className="font-medium">{c?.title ?? "Deleted challenge"}</div><div className="mt-0.5 flex gap-1.5 text-xs">{c && <><Badge>{c.category}</Badge><Badge tone={difficultyTone(c.difficulty)}>{titleCase(c.difficulty)}</Badge></>}{mins !== null && <span className="text-muted">{minutesLabel(mins)}</span>}</div></div>
                    {mock.status === "completed" ? <Badge tone={statusTone(r.status === "not_started" ? "todo" : r.status)}>{titleCase(r.status)}</Badge> : (
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="sr-only" htmlFor={`rs-${r.id}`}>Status for {c?.title}</label>
                        <Select id={`rs-${r.id}`} className="h-9 w-auto text-sm" disabled={!isActive} value={r.status} onChange={(e) => changeStatus(r, e.target.value as MockResultDto["status"])}>{MOCK_RESULT_STATUS.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</Select>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-[110px_110px_1fr]">
                    <Field label="Points available"><Input type="number" min={0} disabled={mock.status === "completed"} defaultValue={r.pointsAvailable ?? ""} onBlur={(e) => void setResult(r, { pointsAvailable: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
                    <Field label="Points awarded"><Input type="number" min={0} disabled={mock.status === "completed"} defaultValue={r.pointsAwarded ?? ""} onBlur={(e) => void setResult(r, { pointsAwarded: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
                    <Field label="Notes"><Input disabled={mock.status === "completed"} defaultValue={r.notes} onBlur={(e) => e.target.value !== r.notes && void setResult(r, { notes: e.target.value })} /></Field>
                  </div>
                </li>
              );
            })}</ul>
          )}
        </section>
      )}

      {mock.status === "completed" && <PostMock mock={mock} rows={rows} summary={summary} byCat={byCat} onChanged={onChanged} />}
      {mock.status === "abandoned" && <p className="text-sm text-muted">This mock was discarded{mock.endedAt ? ` on ${fmtDateTime(mock.endedAt)}` : ""}. No attempts were recorded from it.</p>}
      {mock.mixNotes && <p className="text-xs text-muted">{mock.mixNotes}</p>}
      {mock.reportReminder && mock.status !== "completed" && <p className="rounded-lg border border-border bg-surface-2 p-2 text-xs"><strong>Report reminder:</strong> {mock.reportReminder}</p>}

      <ConfirmDialog open={confirm === "finish"} title="Finish session?" confirmLabel="Finish and record" busy={busy === "finish"} onCancel={() => setConfirm(null)} onConfirm={() => act("finish")}
        message="The timer stops and your challenge results are recorded as attempts, which feed analytics. You can still add a self-review afterwards." />
      <ConfirmDialog open={confirm === "discard"} title="Discard this mock?" confirmLabel="Discard mock" busy={busy === "discard"} onCancel={() => setConfirm(null)} onConfirm={() => act("discard")}
        message="The mock is marked abandoned and no attempts are recorded from it. This cannot be undone." />
    </Card>
  );
}

function PostMock({ mock, rows, summary, byCat, onChanged }: { mock: MockDto; rows: MockResultDto[]; summary: ReturnType<typeof mockSummary>; byCat: Map<string, { total: number; solved: number }>; onChanged: () => void }) {
  const [review, setReview] = React.useState({ selfReview: mock.selfReview, lessonsLearned: mock.lessonsLearned, score: mock.score?.toString() ?? "", pointsAvailable: mock.pointsAvailable?.toString() ?? "" });
  const reports = useApi<ListResult<ReportDto>>("/practiceReports?limit=100");
  const [busy, setBusy] = React.useState(false);
  const attempted = rows.filter((r) => r.status === "solved" || r.status === "attempted").length;
  async function save() {
    setBusy(true);
    try { await patch(`/mockSessions/${mock.id}`, { selfReview: review.selfReview, lessonsLearned: review.lessonsLearned, score: review.score === "" ? null : Number(review.score), pointsAvailable: review.pointsAvailable === "" ? null : Number(review.pointsAvailable) }); toast.success("Review saved"); onChanged(); }
    catch (e) { toast.error((e as ApiError).message); } finally { setBusy(false); }
  }
  async function toggleReport(id: string) {
    const next = mock.linkedReportIds.includes(id) ? mock.linkedReportIds.filter((x) => x !== id) : [...mock.linkedReportIds, id];
    try { await patch(`/mockSessions/${mock.id}`, { linkedReportIds: next }); onChanged(); } catch (e) { toast.error((e as Error).message); }
  }
  return (
    <section className="space-y-4 border-t border-border pt-4">
      <h3 className="text-lg font-semibold">Post-mock analysis</h3>
      <div className="grid gap-3 sm:grid-cols-4">
        <div><div className="text-xs text-muted">Attempted</div><div className="text-2xl font-bold">{attempted}/{summary.total}</div></div>
        <div><div className="text-xs text-muted">Solved</div><div className="text-2xl font-bold">{summary.solved}</div></div>
        <div><div className="text-xs text-muted">Personal score</div><div className="text-2xl font-bold">{summary.scorePct === null ? "n/a" : pct(summary.scorePct)}</div><div className="text-xs text-muted">{summary.scoreLabel ?? "No points configured"}</div></div>
        <div><div className="text-xs text-muted">Duration used</div><div className="text-2xl font-bold">{mock.startedAt && mock.endedAt ? minutesLabel(Math.round((Date.parse(mock.endedAt) - Date.parse(mock.startedAt) - mock.pausedTotalMs) / 60000)) : "-"}</div></div>
      </div>
      <div><h4 className="mb-1 text-sm font-semibold">Category breakdown</h4>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-muted"><tr><th className="py-1">Category</th><th>Solved</th><th>Total</th></tr></thead><tbody>{[...byCat.entries()].map(([k, v]) => <tr key={k} className="border-t border-border"><td className="py-1">{k}</td><td>{v.solved}</td><td>{v.total}</td></tr>)}</tbody></table></div></div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Total points awarded (optional, yours)"><Input type="number" min={0} value={review.score} onChange={(e) => setReview({ ...review, score: e.target.value })} /></Field>
        <Field label="Total points available"><Input type="number" min={0} value={review.pointsAvailable} onChange={(e) => setReview({ ...review, pointsAvailable: e.target.value })} /></Field>
      </div>
      <Field label="Self-review"><Textarea value={review.selfReview} onChange={(e) => setReview({ ...review, selfReview: e.target.value })} placeholder="What went well? Where did time go?" /></Field>
      <Field label="Lessons learned"><Textarea value={review.lessonsLearned} onChange={(e) => setReview({ ...review, lessonsLearned: e.target.value })} /></Field>
      <Button variant="primary" loading={busy} onClick={() => void save()}>Save review</Button>
      <div><h4 className="mb-1 text-sm font-semibold">Linked reports</h4>
        {(reports.data?.items ?? []).length === 0 ? <p className="text-sm text-muted">No reports yet. <Link className="text-accent hover:underline" href="/reports?new=1">Create a practice report</Link></p> : (
          <ul className="space-y-1 text-sm">{reports.data?.items.map((r) => <li key={r.id}><label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[hsl(var(--accent))]" checked={mock.linkedReportIds.includes(r.id)} onChange={() => void toggleReport(r.id)} />{r.title}</label></li>)}</ul>
        )}
      </div>
      <Link className="text-sm text-accent hover:underline" href={`/notes?new=1&mock=${mock.id}`}>+ Write a note linked to this mock</Link>
      <p className="text-xs text-muted">{DISCLAIMER}</p>
    </section>
  );
}

function MockForm({ mock, challenges, onClose, onSaved }: { mock: MockDto | null; challenges: ChallengeDto[]; onClose: () => void; onSaved: (m: MockDto) => void }) {
  const [f, setF] = React.useState({
    title: mock?.title ?? "", scheduledAt: toLocalInput(mock?.scheduledAt ?? new Date().toISOString()), durationMinutes: mock?.durationMinutes ?? 360,
    mixNotes: mock?.mixNotes ?? "", reportReminder: mock?.reportReminder ?? "Prepare the report with the current official TCS template and screenshots with timestamps.", challengeIds: mock?.challengeIds ?? [] as string[],
  });
  const [errs, setErrs] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const usable = challenges.filter((c) => !c.isArchived);
  const chosen = usable.filter((c) => f.challengeIds.includes(c.id));
  const mix = (key: "category" | "difficulty") => { const m = new Map<string, number>(); chosen.forEach((c) => m.set(c[key], (m.get(c[key]) ?? 0) + 1)); return [...m.entries()].map(([k, v]) => `${k}: ${v}`).join(", ") || "none selected"; };
  function toggle(id: string) { setF({ ...f, challengeIds: f.challengeIds.includes(id) ? f.challengeIds.filter((x) => x !== id) : [...f.challengeIds, id] }); }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErrs({});
    const body = { title: f.title, scheduledAt: new Date(f.scheduledAt).toISOString(), durationMinutes: Number(f.durationMinutes), mixNotes: f.mixNotes, reportReminder: f.reportReminder, challengeIds: f.challengeIds };
    try { const m = mock ? await patch<MockDto>(`/mockSessions/${mock.id}`, body) : await post<MockDto>("/mockSessions", body); toast.success(mock ? "Mock updated" : "Mock created"); onSaved(m); }
    catch (er) { setErrs((er as ApiError).fields); toast.error((er as Error).message); } finally { setBusy(false); }
  }
  return (
    <Dialog open onClose={onClose} title={mock ? "Edit mock" : "New mock"} wide>
      <form onSubmit={save} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Title" error={errs.title} className="sm:col-span-3"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} autoFocus /></Field>
          <Field label="Start date and time" error={errs.scheduledAt}><Input type="datetime-local" required value={f.scheduledAt} onChange={(e) => setF({ ...f, scheduledAt: e.target.value })} /></Field>
          <Field label="Duration (minutes)" hint="Default 360 = 6 hours" error={errs.durationMinutes}><Input type="number" min={5} max={1440} value={f.durationMinutes} onChange={(e) => setF({ ...f, durationMinutes: Number(e.target.value) })} /></Field>
        </div>
        <fieldset className="rounded-lg border border-border p-3">
          <legend className="px-1 text-sm font-medium">Challenge set ({f.challengeIds.length} selected)</legend>
          {usable.length === 0 ? <p className="text-sm text-muted">Create challenges in CTF Challenges first.</p> : (
            <ul className="max-h-56 space-y-1 overflow-y-auto">{usable.map((c) => (
              <li key={c.id}><label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[hsl(var(--accent))]" checked={f.challengeIds.includes(c.id)} onChange={() => toggle(c.id)} />{c.title}<Badge>{c.category}</Badge><Badge tone={difficultyTone(c.difficulty)}>{titleCase(c.difficulty)}</Badge></label></li>
            ))}</ul>
          )}
          <p className="mt-2 text-xs text-muted">Category mix: {mix("category")}. Difficulty mix: {mix("difficulty")}.</p>
        </fieldset>
        <Field label="Mix notes"><Textarea className="min-h-[60px]" value={f.mixNotes} onChange={(e) => setF({ ...f, mixNotes: e.target.value })} /></Field>
        <Field label="Notes / report reminder"><Textarea className="min-h-[60px]" value={f.reportReminder} onChange={(e) => setF({ ...f, reportReminder: e.target.value })} /></Field>
        <div className="flex justify-end gap-2"><Button onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" loading={busy}>{mock ? "Save changes" : "Create mock"}</Button></div>
      </form>
    </Dialog>
  );
}

export default function MocksPage() {
  return <Suspense fallback={null}><MocksInner /></Suspense>;
}
