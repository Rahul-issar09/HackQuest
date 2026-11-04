"use client";
import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Archive, ChevronDown, ChevronUp, ExternalLink as LinkIcon, FileText, Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  Async, Badge, Button, Card, ConfirmDialog, Dialog, EmptyState, ExternalLink, Field, Input, PageHeader, Select, Textarea,
  difficultyTone, relevanceTone, statusTone,
} from "@/components/ui";
import { ApiError, del, patch, post, qs, useApi } from "@/lib/client/api";
import { retryQueue } from "@/lib/analytics";
import { ATTEMPT_STATUS, DIFFICULTIES, DOMAINS, RELEVANCE, RELEVANCE_LABEL } from "@/lib/constants";
import { ago, fmtDateTime, minutesLabel, parseTags, titleCase, toLocalInput } from "@/lib/utils";
import type { AttemptDto, ChallengeDto, ListResult, NoteDto, RoadmapDayDto } from "@/lib/types";

const PAGE = 15;
type Derived = "unattempted" | "solved" | "unsolved";

function ChallengesInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const challenges = useApi<ListResult<ChallengeDto>>("/challenges?limit=500&sort=title");
  const attempts = useApi<ListResult<AttemptDto>>("/challengeAttempts?limit=500");
  const days = useApi<ListResult<RoadmapDayDto>>("/roadmapDays?limit=100&sort=dayNumber");
  const [tab, setTab] = React.useState<"all" | "retry">("all");
  const [f, setF] = React.useState({ q: "", category: "all", difficulty: "all", status: "all", archived: false });
  const [page, setPage] = React.useState(1);
  const [editing, setEditing] = React.useState<ChallengeDto | "new" | null>(null);
  const [logFor, setLogFor] = React.useState<{ challengeId: string | null; attempt?: AttemptDto } | null>(null);
  const [deleting, setDeleting] = React.useState<ChallengeDto | null>(null);
  const [open, setOpen] = React.useState<string | null>(null);
  const reloadAll = () => { void challenges.reload(); void attempts.reload(); };

  React.useEffect(() => { if (sp.get("log") === "1") { setLogFor({ challengeId: null }); router.replace("/challenges"); } }, [sp, router]);

  const att = attempts.data?.items ?? [];
  const chs = challenges.data?.items ?? [];
  const derived = React.useMemo(() => {
    const m = new Map<string, Derived>();
    for (const c of chs) {
      const mine = att.filter((a) => a.challengeId === c.id && a.status !== "skipped");
      m.set(c.id, mine.length === 0 ? "unattempted" : mine.some((a) => a.status === "solved") ? "solved" : "unsolved");
    }
    return m;
  }, [chs, att]);
  const filtered = chs.filter((c) =>
    (f.archived || !c.isArchived) &&
    (f.category === "all" || c.category === f.category) && (f.difficulty === "all" || c.difficulty === f.difficulty) &&
    (f.status === "all" || derived.get(c.id) === f.status) &&
    (!f.q || `${c.title} ${c.description} ${c.platform} ${c.tags.join(" ")}`.toLowerCase().includes(f.q.toLowerCase())));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const view = filtered.slice((page - 1) * PAGE, page * PAGE);
  React.useEffect(() => setPage(1), [f]);
  const queue = retryQueue(att, chs);
  const categories = [...new Set([...DOMAINS, ...chs.map((c) => c.category)])];

  async function remove() {
    if (!deleting) return;
    try { await del(`/challenges/${deleting.id}`); toast.success("Challenge and its attempts deleted"); setDeleting(null); reloadAll(); } catch (e) { toast.error((e as Error).message); }
  }
  async function archive(c: ChallengeDto) {
    try { await patch(`/challenges/${c.id}`, { isArchived: !c.isArchived }); void challenges.reload(); toast.success(c.isArchived ? "Restored" : "Archived"); } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div>
      <PageHeader title="CTF Challenges"
        subtitle="Track challenges and every attempt. Solve rate uses attempt records (skipped attempts excluded), not just the latest status."
        actions={<><Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" aria-hidden /> New challenge</Button><Button variant="primary" onClick={() => setLogFor({ challengeId: null })}>Log attempt</Button></>} />
      <div role="tablist" aria-label="Challenge views" className="mb-4 flex gap-1 border-b border-border">
        {([["all", `All challenges (${filtered.length})`], ["retry", `Retry queue (${queue.length})`]] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`px-3 py-2 text-sm ${tab === k ? "border-b-2 border-accent font-medium text-accent" : "text-muted hover:text-fg"}`}>{l}</button>
        ))}
      </div>

      <Async q={challenges}>{() => tab === "all" ? (
        <>
          <Card className="mb-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="relative lg:col-span-2"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden /><Input aria-label="Search challenges" className="pl-9" placeholder="Search..." value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} /></div>
              <Select aria-label="Category" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}><option value="all">All categories</option>{categories.map((c) => <option key={c}>{c}</option>)}</Select>
              <Select aria-label="Difficulty" value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value })}><option value="all">All difficulties</option>{DIFFICULTIES.map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}</Select>
              <Select aria-label="Status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="all">All statuses</option><option value="unattempted">Not attempted</option><option value="unsolved">Attempted, unsolved</option><option value="solved">Solved</option></Select>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[hsl(var(--accent))]" checked={f.archived} onChange={(e) => setF({ ...f, archived: e.target.checked })} /> Show archived</label>
          </Card>
          {view.length === 0 ? <EmptyState title={chs.length ? "No challenges match your filters" : "No challenges yet"} description="Create a challenge to start tracking attempts." action={<Button variant="primary" onClick={() => setEditing("new")}>New challenge</Button>} /> : (
            <ul className="space-y-3">{view.map((c) => {
              const mine = att.filter((a) => a.challengeId === c.id).sort((a, b) => b.attemptedAt.localeCompare(a.attemptedAt));
              const d = derived.get(c.id)!;
              const isOpen = open === c.id;
              return (
                <li key={c.id}><Card className={c.isArchived ? "opacity-70" : ""}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{c.title}</h3>
                        {c.url && <ExternalLink href={c.url} className="inline-flex items-center gap-1 text-xs"><LinkIcon className="h-3 w-3" aria-hidden />Open<span className="sr-only"> {c.title} (new tab)</span></ExternalLink>}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                        <Badge>{c.category}</Badge><Badge tone={difficultyTone(c.difficulty)}>{titleCase(c.difficulty)}</Badge>
                        {c.platform && <Badge>{c.platform}</Badge>}
                        <Badge tone={d === "solved" ? "success" : d === "unsolved" ? "danger" : "neutral"}>{d === "unattempted" ? "Not attempted" : d === "solved" ? "Solved" : "Unsolved"}</Badge>
                        <Badge tone={relevanceTone(c.relevanceClassification)}>{RELEVANCE_LABEL[c.relevanceClassification]}</Badge>
                        {c.isArchived && <Badge>Archived</Badge>}
                        <span className="text-muted">{mine.length} attempt{mine.length === 1 ? "" : "s"}</span>
                      </div>
                      {c.description && <p className="mt-2 text-sm text-muted">{c.description}</p>}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="primary" onClick={() => setLogFor({ challengeId: c.id })}>Log attempt</Button>
                      <Button size="sm" variant="ghost" aria-label={`Edit ${c.title}`} onClick={() => setEditing(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" aria-label={`${c.isArchived ? "Restore" : "Archive"} ${c.title}`} onClick={() => void archive(c)}><Archive className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" aria-label={`Delete ${c.title}`} onClick={() => setDeleting(c)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  <button className="mt-2 inline-flex items-center gap-1 text-sm text-accent" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : c.id)}>{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />} History, notes and reports</button>
                  {isOpen && <ChallengeDetail challenge={c} attempts={mine} onEditAttempt={(a) => setLogFor({ challengeId: c.id, attempt: a })} onChanged={reloadAll} />}
                </Card></li>
              );
            })}</ul>
          )}
          {pages > 1 && <div className="mt-4 flex items-center justify-center gap-3 text-sm"><Button size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><span>Page {page} of {pages}</span><Button size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button></div>}
        </>
      ) : (
        <RetryQueue items={queue} onChanged={reloadAll} onLog={(id) => setLogFor({ challengeId: id })} />
      )}</Async>

      {editing && <ChallengeForm challenge={editing === "new" ? null : editing} days={days.data?.items ?? []} categories={categories} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reloadAll(); }} />}
      {logFor && <AttemptForm challenges={chs.filter((c) => !c.isArchived)} categories={categories} initial={logFor} onClose={() => setLogFor(null)} onSaved={() => { setLogFor(null); reloadAll(); }} />}
      <ConfirmDialog open={!!deleting} title="Delete challenge?" message={`"${deleting?.title}" and all of its attempts will be permanently deleted. Linked reports and notes keep existing but lose the link. Consider archiving instead.`} onCancel={() => setDeleting(null)} onConfirm={remove} />
    </div>
  );
}

function ChallengeDetail({ challenge, attempts, onEditAttempt, onChanged }: { challenge: ChallengeDto; attempts: AttemptDto[]; onEditAttempt: (a: AttemptDto) => void; onChanged: () => void }) {
  const notes = useApi<ListResult<NoteDto>>(`/notes${qs({ linkedChallengeIds: challenge.id, limit: 20 })}`);
  const reports = useApi<ListResult<{ id: string; title: string }>>(`/practiceReports${qs({ challengeId: challenge.id, limit: 20 })}`);
  const [delA, setDelA] = React.useState<AttemptDto | null>(null);
  async function removeAttempt() {
    if (!delA) return;
    try { await del(`/challengeAttempts/${delA.id}`); toast.success("Attempt deleted"); setDelA(null); onChanged(); } catch (e) { toast.error((e as Error).message); }
  }
  return (
    <div className="mt-3 space-y-4 border-t border-border pt-3">
      <section>
        <h4 className="mb-2 text-sm font-semibold">Attempts</h4>
        {attempts.length === 0 ? <p className="text-sm text-muted">No attempts recorded yet.</p> : (
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-muted"><tr><th className="py-1 pr-3">#</th><th className="pr-3">When</th><th className="pr-3">Status</th><th className="pr-3">Time</th><th className="pr-3">Hints</th><th className="pr-3">Lessons</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{attempts.map((a) => (
              <tr key={a.id} className="border-t border-border align-top"><td className="py-1.5 pr-3">{a.attemptNumber}</td><td className="pr-3 whitespace-nowrap">{fmtDateTime(a.attemptedAt)}</td>
                <td className="pr-3"><Badge tone={statusTone(a.status)}>{titleCase(a.status)}</Badge></td><td className="pr-3">{minutesLabel(a.durationMinutes)}</td><td className="pr-3">{a.hintsUsed}</td>
                <td className="pr-3 max-w-xs text-muted">{a.lessonsLearned || a.notes || "-"}</td>
                <td className="whitespace-nowrap"><Button size="sm" variant="ghost" aria-label="Edit attempt" onClick={() => onEditAttempt(a)}><Pencil className="h-3.5 w-3.5" /></Button><Button size="sm" variant="ghost" aria-label="Delete attempt" onClick={() => setDelA(a)}><Trash2 className="h-3.5 w-3.5" /></Button></td></tr>
            ))}</tbody></table></div>
        )}
      </section>
      <section className="flex flex-wrap items-start gap-6 text-sm">
        <div><h4 className="mb-1 flex items-center gap-1 font-semibold"><FileText className="h-4 w-4" aria-hidden /> Linked notes</h4>
          {notes.data?.items.length ? <ul>{notes.data.items.map((n) => <li key={n.id}><Link className="text-accent hover:underline" href={`/notes?id=${n.id}`}>{n.title}</Link></li>)}</ul> : <p className="text-muted">None</p>}
          <Link className="text-accent hover:underline" href={`/notes?new=1&challenge=${challenge.id}`}>+ New linked note</Link></div>
        <div><h4 className="mb-1 font-semibold">Reports</h4>
          {reports.data?.items.length ? <ul>{reports.data.items.map((r) => <li key={r.id}><Link className="text-accent hover:underline" href={`/reports?id=${r.id}`}>{r.title}</Link></li>)}</ul> : <p className="text-muted">None</p>}
          <Link className="text-accent hover:underline" href={`/reports?new=1&challenge=${challenge.id}`}>+ New report</Link></div>
      </section>
      <ConfirmDialog open={!!delA} title="Delete attempt?" message="This attempt will be removed from analytics." onCancel={() => setDelA(null)} onConfirm={removeAttempt} />
    </div>
  );
}

function RetryQueue({ items, onChanged, onLog }: { items: ReturnType<typeof retryQueue>; onChanged: () => void; onLog: (id: string) => void }) {
  async function set(id: string, body: Partial<ChallengeDto>) {
    try { await patch(`/challenges/${id}`, body); onChanged(); } catch (e) { toast.error((e as Error).message); }
  }
  if (items.length === 0) return <EmptyState title="Retry queue is empty" description="Challenges with unsolved attempts appear here and leave automatically once a later attempt is solved. History is kept." />;
  return (
    <ul className="space-y-3">{items.map(({ challenge: c, reason, lastAttemptAt }) => (
      <li key={c.id}><Card className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0"><div className="font-semibold">{c.title}</div><div className="text-xs text-muted">{c.category} - {titleCase(c.difficulty)} - {reason} - last {ago(lastAttemptAt)}</div></div>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Priority" className="w-28"><Select value={c.retryPriority} onChange={(e) => void set(c.id, { retryPriority: e.target.value as ChallengeDto["retryPriority"] })}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></Select></Field>
          <Field label="Retry date" className="w-40"><Input type="date" value={c.retryDate?.slice(0, 10) ?? ""} onChange={(e) => void set(c.id, { retryDate: e.target.value || null } as Partial<ChallengeDto>)} /></Field>
          <Button variant="primary" onClick={() => onLog(c.id)}>Log retry</Button>
          <Button onClick={() => void set(c.id, { retryDismissed: true })}>Dismiss</Button>
        </div>
      </Card></li>
    ))}</ul>
  );
}

function ChallengeForm({ challenge, days, categories, onClose, onSaved }: { challenge: ChallengeDto | null; days: RoadmapDayDto[]; categories: string[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = React.useState(challenge ? { ...challenge, tags: challenge.tags.join(", "), day: challenge.linkedRoadmapDayIds[0] ?? "" } : { title: "", platform: "", url: "", description: "", category: "Web Security", difficulty: "intermediate", tags: "", relevanceClassification: "supplementary", day: "" });
  const [errs, setErrs] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErrs({});
    const body = { title: f.title, platform: f.platform, url: f.url, description: f.description, category: f.category, difficulty: f.difficulty, tags: parseTags(f.tags), relevanceClassification: f.relevanceClassification, linkedRoadmapDayIds: f.day ? [f.day] : [] };
    try { if (challenge) await patch(`/challenges/${challenge.id}`, body); else await post("/challenges", body); toast.success(challenge ? "Challenge updated" : "Challenge created"); onSaved(); }
    catch (er) { setErrs((er as ApiError).fields); toast.error((er as Error).message); } finally { setBusy(false); }
  }
  return (
    <Dialog open onClose={onClose} title={challenge ? "Edit challenge" : "New challenge"} wide>
      <form onSubmit={save} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" error={errs.title}><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} autoFocus /></Field>
          <Field label="Platform"><Input value={f.platform} onChange={(e) => setF({ ...f, platform: e.target.value })} placeholder="e.g. picoCTF" /></Field>
        </div>
        <Field label="URL (optional)" error={errs.url}><Input value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} inputMode="url" /></Field>
        <Field label="Description"><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Category" error={errs.category}><Input list="ch-cats" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /><datalist id="ch-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist></Field>
          <Field label="Difficulty"><Select value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value as typeof f.difficulty })}>{DIFFICULTIES.map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}</Select></Field>
          <Field label="Source classification"><Select value={f.relevanceClassification} onChange={(e) => setF({ ...f, relevanceClassification: e.target.value as typeof f.relevanceClassification })}>{RELEVANCE.map((c) => <option key={c} value={c}>{RELEVANCE_LABEL[c]}</option>)}</Select></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tags" hint="Comma separated"><Input value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} /></Field>
          <Field label="Suggested roadmap day"><Select value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })}><option value="">None</option>{days.map((d) => <option key={d.id} value={d.id}>Day {d.dayNumber}: {d.title}</option>)}</Select></Field>
        </div>
        <div className="flex justify-end gap-2"><Button onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" loading={busy}>{challenge ? "Save changes" : "Create challenge"}</Button></div>
      </form>
    </Dialog>
  );
}

function AttemptForm({ challenges, categories, initial, onClose, onSaved }: { challenges: ChallengeDto[]; categories: string[]; initial: { challengeId: string | null; attempt?: AttemptDto }; onClose: () => void; onSaved: () => void }) {
  const a = initial.attempt;
  const [challengeId, setChallengeId] = React.useState(initial.challengeId ?? "");
  const [newCh, setNewCh] = React.useState({ title: "", category: "Web Security", difficulty: "intermediate", platform: "" });
  const [f, setF] = React.useState({
    attemptedAt: toLocalInput(a?.attemptedAt ?? new Date().toISOString()), status: a?.status ?? "attempted", durationMinutes: a?.durationMinutes?.toString() ?? "",
    hintsUsed: a?.hintsUsed ?? 0, selfDifficulty: a?.selfDifficulty ?? "", lessonsLearned: a?.lessonsLearned ?? "", notes: a?.notes ?? "",
    evidence: a?.evidenceRefs.join("\n") ?? "", scoreAwarded: a?.scoreAwarded?.toString() ?? "", pointsAvailable: a?.pointsAvailable?.toString() ?? "",
  });
  const [errs, setErrs] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const creating = !challengeId && !a;
  async function save(e: React.FormEvent) {
    e.preventDefault(); setErrs({});
    if (creating && !newCh.title.trim()) return setErrs({ newTitle: "Enter a name or pick an existing challenge" });
    setBusy(true);
    try {
      let cid = challengeId;
      if (creating) cid = (await post<ChallengeDto>("/challenges", { title: newCh.title, category: newCh.category, difficulty: newCh.difficulty, platform: newCh.platform })).id;
      const body = {
        challengeId: cid, attemptedAt: new Date(f.attemptedAt).toISOString(), status: f.status, durationMinutes: f.durationMinutes === "" ? null : Number(f.durationMinutes),
        hintsUsed: Number(f.hintsUsed) || 0, selfDifficulty: f.selfDifficulty, lessonsLearned: f.lessonsLearned, notes: f.notes,
        evidenceRefs: f.evidence.split("\n").map((s) => s.trim()).filter(Boolean),
        scoreAwarded: f.scoreAwarded === "" ? null : Number(f.scoreAwarded), pointsAvailable: f.pointsAvailable === "" ? null : Number(f.pointsAvailable),
      };
      if (a) { const { challengeId: _c, ...rest } = body; void _c; await patch(`/challengeAttempts/${a.id}`, rest); } else await post("/challengeAttempts", body);
      toast.success(a ? "Attempt updated" : "Attempt logged"); onSaved();
    } catch (er) { setErrs((er as ApiError).fields); toast.error((er as Error).message); } finally { setBusy(false); }
  }
  return (
    <Dialog open onClose={onClose} title={a ? "Edit attempt" : "Log attempt"} wide>
      <form onSubmit={save} className="space-y-3">
        {!a && (
          <>
            <Field label="Challenge" error={errs.challengeId}><Select value={challengeId} onChange={(e) => setChallengeId(e.target.value)}><option value="">+ Create a new challenge...</option>{challenges.map((c) => <option key={c.id} value={c.id}>{c.title} ({c.category})</option>)}</Select></Field>
            {creating && (
              <div className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-4">
                <Field label="New challenge name" error={errs.newTitle} className="sm:col-span-2"><Input value={newCh.title} onChange={(e) => setNewCh({ ...newCh, title: e.target.value })} /></Field>
                <Field label="Category"><Input list="at-cats" value={newCh.category} onChange={(e) => setNewCh({ ...newCh, category: e.target.value })} /><datalist id="at-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist></Field>
                <Field label="Difficulty"><Select value={newCh.difficulty} onChange={(e) => setNewCh({ ...newCh, difficulty: e.target.value })}>{DIFFICULTIES.map((d) => <option key={d} value={d}>{titleCase(d)}</option>)}</Select></Field>
              </div>
            )}
          </>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Date and time" error={errs.attemptedAt}><Input type="datetime-local" value={f.attemptedAt} onChange={(e) => setF({ ...f, attemptedAt: e.target.value })} required /></Field>
          <Field label="Result"><Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as typeof f.status })}>{ATTEMPT_STATUS.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</Select></Field>
          <Field label="Time taken (minutes)" error={errs.durationMinutes}><Input type="number" min={0} value={f.durationMinutes} onChange={(e) => setF({ ...f, durationMinutes: e.target.value })} /></Field>
          <Field label="Hints used" error={errs.hintsUsed}><Input type="number" min={0} value={f.hintsUsed} onChange={(e) => setF({ ...f, hintsUsed: Number(e.target.value) })} /></Field>
          <Field label="Self-assessed difficulty"><Select value={f.selfDifficulty} onChange={(e) => setF({ ...f, selfDifficulty: e.target.value as typeof f.selfDifficulty })}><option value="">Not rated</option>{DIFFICULTIES.map((d) => <option key={d} value={d}>{titleCase(d)}</option>)}</Select></Field>
          <div className="grid grid-cols-2 gap-2"><Field label="Points (yours)"><Input type="number" min={0} value={f.scoreAwarded} onChange={(e) => setF({ ...f, scoreAwarded: e.target.value })} /></Field><Field label="Out of"><Input type="number" min={0} value={f.pointsAvailable} onChange={(e) => setF({ ...f, pointsAvailable: e.target.value })} /></Field></div>
        </div>
        <Field label="Outcome and lessons learned"><Textarea value={f.lessonsLearned} onChange={(e) => setF({ ...f, lessonsLearned: e.target.value })} /></Field>
        <Field label="Notes"><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        <Field label="Evidence references (one per line)" hint="File names or links to screenshots. Never record real contest credentials or flags."><Textarea className="min-h-[60px]" value={f.evidence} onChange={(e) => setF({ ...f, evidence: e.target.value })} /></Field>
        <div className="flex justify-end gap-2"><Button onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" loading={busy}>{a ? "Save attempt" : "Log attempt"}</Button></div>
      </form>
    </Dialog>
  );
}

export default function ChallengesPage() {
  return <Suspense fallback={null}><ChallengesInner /></Suspense>;
}
