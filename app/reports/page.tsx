"use client";
import * as React from "react";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Download, Eye, FileText, Plus, Printer, Trash2 } from "lucide-react";
import { Async, Button, Card, ConfirmDialog, EmptyState, Field, Input, Loading, PageHeader, Select, Textarea } from "@/components/ui";
import { ApiError, del, patch, post, qs, useApi } from "@/lib/client/api";
import { downloadText, reportToMarkdown, slug } from "@/lib/export/markdown";
import { DIFFICULTIES, DOMAINS } from "@/lib/constants";
import { ago, fmtDateTime, parseTags, titleCase } from "@/lib/utils";
import type { AttemptDto, ChallengeDto, ListResult, ReportDto } from "@/lib/types";

const MarkdownView = dynamic(() => import("@/components/markdown-view").then((m) => m.MarkdownView), { ssr: false, loading: () => <Loading /> });

const NOTICE = "During the actual contest, use the current official TCS-provided report template, size limit and submission instructions from the contest site. This builder is for practice and does not replace the official template. Report upload is mandatory in Round 1, so check the deadline and rules there.";

interface Form {
  title: string; challengeId: string; attemptId: string; category: string; difficulty: string; objective: string; initialObservations: string;
  tools: string; methodologyMarkdown: string; findings: string; flagRetrievalExplanation: string; evidenceNotes: string; conclusion: string;
}
const blank: Form = { title: "", challengeId: "", attemptId: "", category: "", difficulty: "", objective: "", initialObservations: "", tools: "", methodologyMarkdown: "", findings: "", flagRetrievalExplanation: "", evidenceNotes: "", conclusion: "" };
const toForm = (r: ReportDto): Form => ({ title: r.title, challengeId: r.challengeId ?? "", attemptId: r.attemptId ?? "", category: r.category, difficulty: r.difficulty, objective: r.objective, initialObservations: r.initialObservations, tools: r.toolsUsed.join(", "), methodologyMarkdown: r.methodologyMarkdown, findings: r.findings, flagRetrievalExplanation: r.flagRetrievalExplanation, evidenceNotes: r.evidenceNotes, conclusion: r.conclusion });

function ReportsInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const id = sp.get("id");
  const reports = useApi<ListResult<ReportDto>>("/practiceReports?limit=200");
  const challenges = useApi<ListResult<ChallengeDto>>("/challenges?limit=500&sort=title");
  const [creating, setCreating] = React.useState(false);
  const wantsNew = sp.get("new") === "1";
  const preChallenge = sp.get("challenge");

  React.useEffect(() => { if (wantsNew) { setCreating(true); router.replace("/reports", { scroll: false }); } }, [wantsNew, router]);
  const selected = reports.data?.items.find((r) => r.id === id) ?? null;
  const select = (rid: string | null) => { setCreating(false); router.replace(rid ? `/reports?id=${rid}` : "/reports", { scroll: false }); };

  return (
    <div>
      <PageHeader title="Report Builder" subtitle="Write practice reports in the structure judges look for: objective, methodology, evidence and conclusion. Export as Markdown or print to PDF."
        actions={<Button variant="primary" onClick={() => { setCreating(true); router.replace("/reports", { scroll: false }); }}><Plus className="h-4 w-4" aria-hidden /> New report</Button>} />
      <div role="note" className="mb-4 flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden /><p>{NOTICE}</p></div>
      <Async q={reports}>{(d) => (
        <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
          <div className="space-y-2">
            {d.items.length === 0 ? <EmptyState title="No reports yet" description="Create a practice report for a solved challenge." icon={<FileText className="h-8 w-8" />} /> : d.items.map((r) => (
              <button key={r.id} onClick={() => select(r.id)} aria-current={r.id === id && !creating ? "true" : undefined} className={`w-full rounded-card border bg-surface p-3 text-left hover:border-accent/60 ${r.id === id && !creating ? "border-accent" : "border-border"}`}>
                <div className="font-medium">{r.title}</div><div className="text-xs text-muted">{r.category || "No category"} - updated {ago(r.updatedAt)}</div>
              </button>
            ))}
          </div>
          <div>
            {creating ? <Editor key="new" report={null} challenges={challenges.data?.items ?? []} preChallenge={preChallenge} onSaved={(r) => { void reports.reload(); select(r.id); }} onDeleted={() => undefined} />
              : selected ? <Editor key={selected.id} report={selected} challenges={challenges.data?.items ?? []} preChallenge={null} onSaved={() => void reports.reload()} onDeleted={() => { void reports.reload(); select(null); }} />
              : <Card><EmptyState title="Select or create a report" description="Reports are saved to your database. Use Save to persist changes." /></Card>}
          </div>
        </div>
      )}</Async>
    </div>
  );
}

function Editor({ report, challenges, preChallenge, onSaved, onDeleted }: { report: ReportDto | null; challenges: ChallengeDto[]; preChallenge: string | null; onSaved: (r: ReportDto) => void; onDeleted: () => void }) {
  const init = React.useMemo<Form>(() => {
    if (report) return toForm(report);
    const c = challenges.find((x) => x.id === preChallenge);
    return c ? { ...blank, title: `Report: ${c.title}`, challengeId: c.id, category: c.category, difficulty: c.difficulty } : blank;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.id, preChallenge, challenges.length]);
  const [f, setF] = React.useState<Form>(init);
  const [saved, setSaved] = React.useState(JSON.stringify(init));
  const [errs, setErrs] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [preview, setPreview] = React.useState(false);
  const [del_, setDel] = React.useState(false);
  const attempts = useApi<ListResult<AttemptDto>>(f.challengeId ? `/challengeAttempts${qs({ challengeId: f.challengeId, limit: 100 })}` : null);
  const dirty = JSON.stringify(f) !== saved;
  const challenge = challenges.find((c) => c.id === f.challengeId);
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  React.useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const markdown = reportToMarkdown({ title: f.title || "Untitled report", category: f.category, difficulty: f.difficulty, challenge: challenge?.title ?? "", objective: f.objective, initialObservations: f.initialObservations, toolsUsed: parseTags(f.tools), methodologyMarkdown: f.methodologyMarkdown, findings: f.findings, flagRetrievalExplanation: f.flagRetrievalExplanation, evidenceNotes: f.evidenceNotes, conclusion: f.conclusion });

  async function save(e?: React.FormEvent) {
    e?.preventDefault(); setBusy(true); setErrs({});
    const body = { title: f.title, challengeId: f.challengeId || null, attemptId: f.attemptId || null, category: f.category, difficulty: f.difficulty, objective: f.objective, initialObservations: f.initialObservations, toolsUsed: parseTags(f.tools), methodologyMarkdown: f.methodologyMarkdown, findings: f.findings, flagRetrievalExplanation: f.flagRetrievalExplanation, evidenceNotes: f.evidenceNotes, conclusion: f.conclusion };
    try { const r = report ? await patch<ReportDto>(`/practiceReports/${report.id}`, body) : await post<ReportDto>("/practiceReports", body); setSaved(JSON.stringify(f)); toast.success("Report saved"); onSaved(r); }
    catch (er) { setErrs((er as ApiError).fields); toast.error((er as Error).message); } finally { setBusy(false); }
  }
  async function remove() {
    if (!report) return;
    try { await del(`/practiceReports/${report.id}`); toast.success("Report deleted"); setDel(false); onDeleted(); } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{report ? "Edit report" : "New report"}{dirty && <span className="ml-2 text-xs font-normal text-warning">Unsaved changes</span>}</h2>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setPreview(!preview)} aria-pressed={preview}><Eye className="h-4 w-4" aria-hidden /> {preview ? "Edit" : "Preview"}</Button>
            <Button onClick={() => downloadText(`${slug(f.title)}.md`, markdown)}><Download className="h-4 w-4" aria-hidden /> Markdown</Button>
            <Button onClick={() => { setPreview(true); setTimeout(() => window.print(), 150); }} title="Opens the print dialog; choose Save as PDF"><Printer className="h-4 w-4" aria-hidden /> Print / PDF</Button>
            {report && <Button variant="danger" onClick={() => setDel(true)}><Trash2 className="h-4 w-4" aria-hidden /> Delete</Button>}
            <Button type="submit" variant="primary" loading={busy}>Save report</Button>
          </div>
        </div>
        {preview ? (
          <div id="print-area" className="rounded-lg border border-border bg-surface p-4"><MarkdownView source={markdown} /></div>
        ) : (
          <>
            <Field label="Report title" error={errs.title}><Input value={f.title} onChange={set("title")} /></Field>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Linked challenge"><Select value={f.challengeId} onChange={(e) => { const c = challenges.find((x) => x.id === e.target.value); setF({ ...f, challengeId: e.target.value, attemptId: "", category: c?.category ?? f.category, difficulty: c?.difficulty ?? f.difficulty }); }}><option value="">None</option>{challenges.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</Select></Field>
              <Field label="Linked attempt"><Select value={f.attemptId} onChange={set("attemptId")} disabled={!f.challengeId}><option value="">None</option>{(attempts.data?.items ?? []).map((a) => <option key={a.id} value={a.id}>#{a.attemptNumber} {titleCase(a.status)} - {fmtDateTime(a.attemptedAt)}</option>)}</Select></Field>
              <Field label="Category"><Input list="rp-cats" value={f.category} onChange={set("category")} /><datalist id="rp-cats">{DOMAINS.map((d) => <option key={d} value={d} />)}</datalist></Field>
              <Field label="Difficulty"><Select value={f.difficulty} onChange={set("difficulty")}><option value="">Not set</option>{DIFFICULTIES.map((d) => <option key={d} value={d}>{titleCase(d)}</option>)}</Select></Field>
            </div>
            <Field label="Objective / problem statement"><Textarea value={f.objective} onChange={set("objective")} /></Field>
            <Field label="Initial observations"><Textarea value={f.initialObservations} onChange={set("initialObservations")} /></Field>
            <Field label="Tools and commands" hint="Comma separated, e.g. nmap -sV, burpsuite, python3"><Input value={f.tools} onChange={set("tools")} /></Field>
            <Field label="Step-by-step methodology (Markdown)" hint="Number each step; include commands in fenced code blocks."><Textarea className="min-h-[200px] font-mono" value={f.methodologyMarkdown} onChange={set("methodologyMarkdown")} /></Field>
            <Field label="Finding / weakness"><Textarea value={f.findings} onChange={set("findings")} /></Field>
            <Field label="Flag retrieval explanation" hint="Describe how the flag was obtained. Do not paste real contest credentials."><Textarea value={f.flagRetrievalExplanation} onChange={set("flagRetrievalExplanation")} /></Field>
            <Field label="Evidence (screenshots with timestamps)" hint="List each screenshot file name and the visible timestamp, e.g. flag-capture.png - 2026-11-20 14:32:05"><Textarea value={f.evidenceNotes} onChange={set("evidenceNotes")} /></Field>
            <Field label="Conclusion"><Textarea value={f.conclusion} onChange={set("conclusion")} /></Field>
          </>
        )}
      </Card>
      <ConfirmDialog open={del_} title="Delete report?" message={`"${report?.title}" will be permanently deleted.`} onCancel={() => setDel(false)} onConfirm={remove} />
    </form>
  );
}

export default function ReportsPage() {
  return <Suspense fallback={null}><ReportsInner /></Suspense>;
}
