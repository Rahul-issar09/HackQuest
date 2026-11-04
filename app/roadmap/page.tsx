"use client";
import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, Check, ListTodo, Plus, RotateCcw, Trash2 } from "lucide-react";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import {
  Async, Badge, Button, Card, CardTitle, ConfirmDialog, Dialog, EmptyState, ExternalLink, Field, Input, PageHeader, Progress,
  Select, Textarea, relevanceTone,
} from "@/components/ui";
import { TaskChecklist } from "@/components/roadmap/task-checklist";
import { StudyTimer } from "@/components/dashboard/study-timer";
import { useSettings } from "@/components/layout/settings-context";
import { ApiError, del, patch, post, useApi, qs } from "@/lib/client/api";
import { parseDay, toDayKey } from "@/lib/dates";
import { DOMAINS, RELEVANCE, RELEVANCE_LABEL, TASK_TYPES } from "@/lib/constants";
import { cn, fmtDay, minutesLabel, titleCase } from "@/lib/utils";
import type { LearningTaskDto, ListResult, NoteDto, ResourceDto, RoadmapDayDto } from "@/lib/types";

type View = "timeline" | "calendar";

function RoadmapInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const days = useApi<ListResult<RoadmapDayDto>>("/roadmapDays?limit=200&sort=date");
  const tasks = useApi<ListResult<LearningTaskDto>>("/learningTasks?limit=500");
  const [view, setView] = React.useState<View>("timeline");
  const selectedNum = Number(sp.get("day")) || null;
  const [restore, setRestore] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [editing, setEditing] = React.useState<RoadmapDayDto | null>(null);

  const byDay = React.useMemo(() => {
    const m = new Map<string, LearningTaskDto[]>();
    for (const t of tasks.data?.items ?? []) m.set(t.roadmapDayId, [...(m.get(t.roadmapDayId) ?? []), t]);
    return m;
  }, [tasks.data]);
  const progress = (id: string) => {
    const list = (byDay.get(id) ?? []).filter((t) => t.status !== "skipped");
    return { done: list.filter((t) => t.status === "completed").length, total: list.length };
  };
  const selected = days.data?.items.find((d) => d.dayNumber === selectedNum) ?? null;
  const select = (n: number | null) => router.replace(n ? `/roadmap?day=${n}` : "/roadmap", { scroll: false });

  async function restoreDefaults() {
    setBusy(true);
    try {
      await post("/admin", { action: "restore-roadmap" });
      await Promise.all([days.reload(), tasks.reload()]);
      toast.success("Default roadmap restored");
      setRestore(false);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader
        title="Learning Roadmap"
        subtitle="A recommended 31-day plan, not an official TCS syllabus. Topics are labelled by how they relate to the Round 1 category descriptions."
        actions={<>
          <div role="group" aria-label="View" className="flex rounded-lg border border-border p-0.5">
            <Button size="sm" variant={view === "timeline" ? "primary" : "ghost"} onClick={() => setView("timeline")} aria-pressed={view === "timeline"}><ListTodo className="h-4 w-4" aria-hidden /> Timeline</Button>
            <Button size="sm" variant={view === "calendar" ? "primary" : "ghost"} onClick={() => setView("calendar")} aria-pressed={view === "calendar"}><CalendarDays className="h-4 w-4" aria-hidden /> Calendar</Button>
          </div>
          <Button onClick={() => setRestore(true)}><RotateCcw className="h-4 w-4" aria-hidden /> Restore default roadmap</Button>
        </>}
      />
      <Async q={days}>{(d) => (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className={cn(selected && "hidden xl:block")}>
            {d.items.length === 0 ? <EmptyState title="No roadmap days" description="Restore the default roadmap to re-create the 31 days." action={<Button variant="primary" onClick={() => setRestore(true)}>Restore default roadmap</Button>} /> :
              view === "timeline" ? (
                <ol className="space-y-2">
                  {d.items.map((day) => {
                    const p = progress(day.id);
                    const moved = day.date.slice(0, 10) !== day.originalDate.slice(0, 10);
                    const isToday = day.date.slice(0, 10) === toDayKey(new Date());
                    return (
                      <li key={day.id}>
                        <button onClick={() => select(day.dayNumber)} aria-current={selectedNum === day.dayNumber ? "true" : undefined}
                          className={cn("w-full rounded-card border bg-surface p-3 text-left transition hover:border-accent/60", selectedNum === day.dayNumber ? "border-accent" : "border-border")}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium">Day {day.dayNumber}: {day.title}</span>
                            <span className="flex items-center gap-1.5">
                              {isToday && <Badge tone="accent">Today</Badge>}
                              {p.total > 0 && p.done === p.total && <Badge tone="success"><Check className="h-3 w-3" aria-hidden /> Complete</Badge>}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                            <span>{fmtDay(day.date, "EEE d MMM")}{moved && ` (orig. ${fmtDay(day.originalDate, "d MMM")})`}</span>
                            <Badge>{day.domain}</Badge>
                            <Badge tone={relevanceTone(day.relevanceClassification)}>{RELEVANCE_LABEL[day.relevanceClassification]}</Badge>
                          </div>
                          <div className="mt-2 flex items-center gap-2"><Progress value={p.total ? (p.done / p.total) * 100 : 0} label={`Day ${day.dayNumber} progress`} /><span className="shrink-0 text-xs text-muted">{p.done}/{p.total}</span></div>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              ) : <CalendarView days={d.items} selectedNum={selectedNum} onSelect={select} progress={progress} />}
          </div>
          <div className={cn(!selected && "hidden xl:block")}>
            {selected ? (
              <DayDetail key={selected.id} day={selected} tasks={byDay.get(selected.id) ?? []} onClose={() => select(null)}
                onTasksChange={() => void tasks.reload()} onDayChange={() => void days.reload()} onEdit={() => setEditing(selected)}
                onTaskLocal={(t) => tasks.setData((p) => p && { ...p, items: p.items.map((x) => (x.id === t.id ? t : x)) })} />
            ) : <Card className="hidden xl:block"><EmptyState title="Select a day" description="Open a day to see objectives, resources, tasks and linked notes." /></Card>}
          </div>
        </div>
      )}</Async>

      <ConfirmDialog open={restore} title="Restore default roadmap?" confirmLabel="Restore defaults" busy={busy} onCancel={() => setRestore(false)} onConfirm={restoreDefaults}
        message="This resets all 31 days to their original dates and content and re-creates their tasks. Task completion for those days will be reset. Your notes, challenges, resources and attempts are not deleted. Day links from notes are kept." />
      {editing && <EditDayDialog day={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void days.reload(); }} />}
    </div>
  );
}

function CalendarView({ days, selectedNum, onSelect, progress }: {
  days: RoadmapDayDto[]; selectedNum: number | null; onSelect: (n: number) => void; progress: (id: string) => { done: number; total: number };
}) {
  const first = parseDay(days[0].date);
  const [month, setMonth] = React.useState(startOfMonth(first));
  const map = new Map(days.map((d) => [d.date.slice(0, 10), d]));
  const grid = eachDayOfInterval({ start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) });
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <Button size="sm" onClick={() => setMonth(addMonths(month, -1))} aria-label="Previous month">Prev</Button>
        <h2 className="font-semibold">{format(month, "MMMM yyyy")}</h2>
        <Button size="sm" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month">Next</Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => <div key={w}>{w}</div>)}</div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {grid.map((g) => {
          const d = map.get(toDayKey(g));
          const p = d ? progress(d.id) : null;
          const complete = p && p.total > 0 && p.done === p.total;
          return d ? (
            <button key={g.toISOString()} onClick={() => onSelect(d.dayNumber)} aria-label={`Day ${d.dayNumber}, ${fmtDay(d.date)}, ${p?.done}/${p?.total} tasks done`}
              className={cn("min-h-[3.5rem] rounded-lg border p-1 text-left text-xs transition hover:border-accent/60", selectedNum === d.dayNumber ? "border-accent bg-accent/10" : "border-border bg-surface-2", !isSameMonth(g, month) && "opacity-50")}>
              <div className="flex items-center justify-between"><span>{format(g, "d")}</span>{complete && <Check className="h-3 w-3 text-success" aria-label="complete" />}</div>
              <div className="font-medium">D{d.dayNumber}</div>
            </button>
          ) : <div key={g.toISOString()} className={cn("min-h-[3.5rem] rounded-lg p-1 text-xs text-muted/50", !isSameMonth(g, month) && "opacity-40")}>{format(g, "d")}</div>;
        })}
      </div>
    </Card>
  );
}

function DayDetail({ day, tasks, onClose, onTasksChange, onDayChange, onEdit, onTaskLocal }: {
  day: RoadmapDayDto; tasks: LearningTaskDto[]; onClose: () => void; onTasksChange: () => void; onDayChange: () => void; onEdit: () => void;
  onTaskLocal: (t: LearningTaskDto) => void;
}) {
  const { data: settings } = useSettings();
  const resources = useApi<ListResult<ResourceDto>>("/resources?limit=300");
  const notes = useApi<ListResult<NoteDto>>(`/notes${qs({ linkedRoadmapDayIds: day.id, limit: 50 })}`);
  const [date, setDate] = React.useState(day.date.slice(0, 10));
  const [addOpen, setAddOpen] = React.useState(false);
  const [delTask, setDelTask] = React.useState<LearningTaskDto | null>(null);
  const done = tasks.filter((t) => t.status !== "skipped" && t.status === "completed").length;
  const total = tasks.filter((t) => t.status !== "skipped").length;
  const resIds = new Set([...tasks.flatMap((t) => t.resourceIds)]);
  const dayResources = (resources.data?.items ?? []).filter((r) => resIds.has(r.id) || r.linkedRoadmapDayIds.includes(day.id));
  const minutes = tasks.reduce((s, t) => s + t.estimatedMinutes, 0);

  async function reschedule() {
    try {
      await patch(`/roadmapDays/${day.id}`, { date });
      toast.success(`Day ${day.dayNumber} moved to ${fmtDay(date)}`);
      onDayChange();
    } catch (e) { toast.error((e as Error).message); }
  }
  async function removeTask() {
    if (!delTask) return;
    try { await del(`/learningTasks/${delTask.id}`); setDelTask(null); onTasksChange(); toast.success("Task deleted"); } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs text-muted">Day {day.dayNumber} - {fmtDay(day.date)}</div>
          <h2 className="text-xl font-bold">{day.title}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge>{day.domain}</Badge>
            <Badge tone={relevanceTone(day.relevanceClassification)}>{RELEVANCE_LABEL[day.relevanceClassification]}</Badge>
            {day.isRevisionOfKnownTopic && <Badge tone="warning">Revision / advanced practice</Badge>}
            {total > 0 && done === total && <Badge tone="success">Day complete</Badge>}
          </div>
        </div>
        <div className="flex gap-1"><Button size="sm" onClick={onEdit}>Edit</Button><Button size="sm" variant="ghost" onClick={onClose} className="xl:hidden">Back</Button></div>
      </div>
      {day.relevanceClassification !== "official_round1" && (
        <p className="rounded-lg border border-border bg-surface-2 p-2 text-xs text-muted">This topic is not named in the Round 1 category descriptions. Classification: {RELEVANCE_LABEL[day.relevanceClassification]}. It is preparation advice, not a guaranteed exam topic.</p>
      )}
      {day.summary && <p className="text-sm">{day.summary}</p>}
      <section><h3 className="mb-1 text-sm font-semibold">Objectives</h3><ul className="list-disc space-y-0.5 pl-5 text-sm">{day.objectives.map((o) => <li key={o}>{o}</li>)}</ul></section>
      <section><h3 className="mb-1 text-sm font-semibold">Topics</h3><div className="flex flex-wrap gap-1.5">{day.topics.map((t) => <Badge key={t}>{t}</Badge>)}</div></section>
      <section className="grid gap-2 text-sm sm:grid-cols-2">
        <div><span className="text-muted">CTF target:</span> {day.ctfTarget || "-"}</div>
        <div><span className="text-muted">Expected outcome:</span> {day.expectedOutcome || "-"}</div>
        <div><span className="text-muted">Estimated time:</span> {minutesLabel(day.estimatedMinutes)} planned / {minutesLabel(minutes)} in tasks</div>
        <div><span className="text-muted">Daily target:</span> {settings ? minutesLabel(settings.dailyStudyTargetMinutes) : "-"}</div>
      </section>

      <section>
        <div className="mb-1 flex items-center justify-between"><h3 className="text-sm font-semibold">Checklist ({done}/{total})</h3><Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-3 w-3" aria-hidden /> Add task</Button></div>
        <Progress value={total ? (done / total) * 100 : 0} label="Day progress" tone="success" />
        {tasks.length === 0 ? <p className="mt-2 text-sm text-muted">No tasks for this day yet.</p> : (
          <div className="mt-2">
            <TaskChecklist tasks={[...tasks].sort((a, b) => a.order - b.order)} onChanged={(t) => { onTaskLocal(t); }} />
            <details className="mt-2 text-sm"><summary className="cursor-pointer text-muted">Manage tasks</summary>
              <ul className="mt-1 space-y-1">{tasks.map((t) => <li key={t.id} className="flex items-center justify-between gap-2"><span className="truncate">{t.title}</span><Button size="sm" variant="ghost" aria-label={`Delete task ${t.title}`} onClick={() => setDelTask(t)}><Trash2 className="h-3.5 w-3.5" /></Button></li>)}</ul>
            </details>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-1 text-sm font-semibold">Resources</h3>
        {dayResources.length === 0 ? <p className="text-sm text-muted">No resources linked to this day. Link resources from the Resource Library.</p> : (
          <ul className="space-y-1 text-sm">{dayResources.map((r) => <li key={r.id}><ExternalLink href={r.url}>{r.title}</ExternalLink> <span className="text-xs text-muted">({r.category})</span></li>)}</ul>
        )}
      </section>

      <section>
        <div className="mb-1 flex items-center justify-between"><h3 className="text-sm font-semibold">Notes linked to this day</h3><Link href={`/notes?new=1&day=${day.id}`}><Button size="sm"><Plus className="h-3 w-3" aria-hidden /> New note</Button></Link></div>
        {notes.data && notes.data.items.length > 0 ? <ul className="space-y-1 text-sm">{notes.data.items.map((n) => <li key={n.id}><Link className="text-accent hover:underline" href={`/notes?id=${n.id}`}>{n.title || "Untitled note"}</Link></li>)}</ul> : <p className="text-sm text-muted">No notes yet.</p>}
      </section>

      <section className="grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Field label="Reschedule this day" hint={day.date.slice(0, 10) !== day.originalDate.slice(0, 10) ? `Originally ${fmtDay(day.originalDate)}` : "Tasks and notes move with the day."}><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Button size="sm" onClick={() => void reschedule()} disabled={date === day.date.slice(0, 10) || !date}>Save new date</Button>
        </div>
        <div className="flex items-end"><StudyTimer dayId={day.id} /></div>
      </section>

      {addOpen && <AddTaskDialog dayId={day.id} nextOrder={tasks.length + 1} onClose={() => setAddOpen(false)} onSaved={() => { setAddOpen(false); onTasksChange(); }} />}
      <ConfirmDialog open={!!delTask} title="Delete task?" message={`"${delTask?.title}" will be permanently deleted.`} onCancel={() => setDelTask(null)} onConfirm={removeTask} />
    </Card>
  );
}

function AddTaskDialog({ dayId, nextOrder, onClose, onSaved }: { dayId: string; nextOrder: number; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = React.useState({ title: "", description: "", taskType: "theory", estimatedMinutes: 30 });
  const [errs, setErrs] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f.title.trim()) return setErrs({ title: "Title is required" });
    setBusy(true);
    try { await post("/learningTasks", { ...f, roadmapDayId: dayId, order: nextOrder }); toast.success("Task added"); onSaved(); }
    catch (er) { setErrs((er as ApiError).fields); toast.error((er as Error).message); } finally { setBusy(false); }
  }
  return (
    <Dialog open onClose={onClose} title="Add task">
      <form onSubmit={save} className="space-y-3">
        <Field label="Title" error={errs.title}><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} autoFocus /></Field>
        <Field label="Description"><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type"><Select value={f.taskType} onChange={(e) => setF({ ...f, taskType: e.target.value })}>{TASK_TYPES.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}</Select></Field>
          <Field label="Estimated minutes" error={errs.estimatedMinutes}><Input type="number" min={0} value={f.estimatedMinutes} onChange={(e) => setF({ ...f, estimatedMinutes: Number(e.target.value) })} /></Field>
        </div>
        <div className="flex justify-end gap-2"><Button onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" loading={busy}>Add task</Button></div>
      </form>
    </Dialog>
  );
}

function EditDayDialog({ day, onClose, onSaved }: { day: RoadmapDayDto; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = React.useState({ title: day.title, domain: day.domain, summary: day.summary, ctfTarget: day.ctfTarget, expectedOutcome: day.expectedOutcome, estimatedMinutes: day.estimatedMinutes, relevanceClassification: day.relevanceClassification, objectives: day.objectives.join("\n"), topics: day.topics.join(", ") });
  const [errs, setErrs] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await patch(`/roadmapDays/${day.id}`, { ...f, objectives: f.objectives.split("\n").map((s) => s.trim()).filter(Boolean), topics: f.topics.split(",").map((s) => s.trim()).filter(Boolean) });
      toast.success("Day updated"); onSaved();
    } catch (er) { setErrs((er as ApiError).fields); toast.error((er as Error).message); } finally { setBusy(false); }
  }
  return (
    <Dialog open onClose={onClose} title={`Edit Day ${day.dayNumber}`} wide>
      <form onSubmit={save} className="space-y-3">
        <Field label="Title" error={errs.title}><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Domain" error={errs.domain}><Input list="domains" value={f.domain} onChange={(e) => setF({ ...f, domain: e.target.value })} /><datalist id="domains">{DOMAINS.map((d) => <option key={d} value={d} />)}</datalist></Field>
          <Field label="Relevance classification"><Select value={f.relevanceClassification} onChange={(e) => setF({ ...f, relevanceClassification: e.target.value as typeof f.relevanceClassification })}>{RELEVANCE.map((r) => <option key={r} value={r}>{RELEVANCE_LABEL[r]}</option>)}</Select></Field>
        </div>
        <Field label="Summary"><Textarea value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} /></Field>
        <Field label="Objectives (one per line)"><Textarea value={f.objectives} onChange={(e) => setF({ ...f, objectives: e.target.value })} /></Field>
        <Field label="Topics (comma separated)"><Input value={f.topics} onChange={(e) => setF({ ...f, topics: e.target.value })} /></Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="CTF target"><Input value={f.ctfTarget} onChange={(e) => setF({ ...f, ctfTarget: e.target.value })} /></Field>
          <Field label="Expected outcome"><Input value={f.expectedOutcome} onChange={(e) => setF({ ...f, expectedOutcome: e.target.value })} /></Field>
          <Field label="Estimated minutes" error={errs.estimatedMinutes}><Input type="number" min={0} value={f.estimatedMinutes} onChange={(e) => setF({ ...f, estimatedMinutes: Number(e.target.value) })} /></Field>
        </div>
        <div className="flex justify-end gap-2"><Button onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" loading={busy}>Save changes</Button></div>
      </form>
    </Dialog>
  );
}

export default function RoadmapPage() {
  return <Suspense fallback={null}><RoadmapInner /></Suspense>;
}
