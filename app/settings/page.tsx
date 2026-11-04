"use client";
import * as React from "react";
import { toast } from "sonner";
import { Download, RotateCcw, Upload } from "lucide-react";
import { Badge, Button, Card, CardTitle, ConfirmDialog, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { useSettings } from "@/components/layout/settings-context";
import { ApiError, api, patch, post } from "@/lib/client/api";
import { DEFAULT_READINESS_WEIGHTS, DIFFICULTIES, DISCLAIMER, SCHEMA_VERSION } from "@/lib/constants";
import { downloadText } from "@/lib/export/markdown";
import { titleCase } from "@/lib/utils";
import type { AttemptDto, ChallengeDto, LearningTaskDto, ListResult, SettingsDto } from "@/lib/types";

const OFFICIAL = [
  "Round 1 is an online CTF lasting six hours; you submit captured flags through the online portal.",
  "After each solve, capture a screenshot of the flag with the timestamp visible.",
  "A detailed step-by-step report on the contest site's template must be uploaded before the site's deadline. Upload is mandatory; failure means disqualification from further evaluation.",
  "Evaluation criteria listed: flags captured, quality of report and approach followed.",
  "Tools that send huge amounts of traffic or tamper with the contest site are prohibited. Participation is individual.",
  "Round 1 categories described: Beginner (fundamentals, password cracking, simple encryption, basic network vulnerabilities), Intermediate (web application security, SQL injection, SOC detection and response, network analysis, AI/ML usage) and Expert (reverse engineering, advanced cryptography, sophisticated penetration testing).",
  "Digital forensics, mobile security, source-code analysis, threat hunting and incident response appear in Round 2 rules, not in Round 1 category descriptions.",
];
const NOT_CLAIMED = "This app does not claim the number of Round 1 challenges, points per challenge, category distribution, pass marks, guaranteed topics, prizes or job offers. Verify details on the official TCS contest site.";

const csv = (rows: (string | number | null)[][]) => rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");

export default function SettingsPage() {
  const { data: settings, reload } = useSettings();
  if (!settings) return <p className="text-sm text-muted">Loading settings...</p>;
  return (
    <div className="space-y-4">
      <PageHeader title="Settings" subtitle="Dates, targets, backup and data management." />
      <GeneralForm key={settings.updatedAt} s={settings} onSaved={() => void reload()} />
      <Sources s={settings} onSaved={() => void reload()} />
      <DataManagement />
      <Card><CardTitle>About</CardTitle><p className="text-sm">HackQuest Prep - private, single-user preparation tracker.</p><p className="mt-1 text-sm text-muted">{DISCLAIMER}</p><p className="mt-1 text-xs text-muted">Schema version {SCHEMA_VERSION}. Data is stored in your MongoDB database. The app has no login: keep it private (localhost) or add authentication before exposing it publicly.</p></Card>
    </div>
  );
}

function GeneralForm({ s, onSaved }: { s: SettingsDto; onSaved: () => void }) {
  const [f, setF] = React.useState({
    preparationStartDate: s.preparationStartDate.slice(0, 10), examDate: s.examDate.slice(0, 10), dailyStudyTargetMinutes: s.dailyStudyTargetMinutes,
    primaryDifficulty: s.primaryDifficulty, theme: s.theme, minSampleSize: s.minSampleSize, w: { ...s.readinessWeights },
  });
  const [errs, setErrs] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const wsum = Object.values(f.w).reduce((a, b) => a + Number(b), 0);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErrs({});
    try {
      await patch("/settings", { preparationStartDate: f.preparationStartDate, examDate: f.examDate, dailyStudyTargetMinutes: Number(f.dailyStudyTargetMinutes), primaryDifficulty: f.primaryDifficulty, theme: f.theme, minSampleSize: Number(f.minSampleSize), readinessWeights: Object.fromEntries(Object.entries(f.w).map(([k, v]) => [k, Number(v)])) });
      toast.success("Settings saved"); onSaved();
    } catch (er) { setErrs((er as ApiError).fields); toast.error((er as Error).message); } finally { setBusy(false); }
  }
  const wf = (k: keyof typeof f.w, label: string) => <Field label={label} error={errs[`readinessWeights.${k}`]}><Input type="number" min={0} max={100} value={f.w[k]} onChange={(e) => setF({ ...f, w: { ...f.w, [k]: Number(e.target.value) } })} /></Field>;
  return (
    <form onSubmit={save}>
      <Card className="space-y-4">
        <CardTitle>Schedule and targets</CardTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Preparation start date" error={errs.preparationStartDate}><Input type="date" required value={f.preparationStartDate} onChange={(e) => setF({ ...f, preparationStartDate: e.target.value })} /></Field>
          <Field label="Round 1 / exam date" error={errs.examDate} hint="Your configured date - verify on the official site"><Input type="date" required value={f.examDate} onChange={(e) => setF({ ...f, examDate: e.target.value })} /></Field>
          <Field label="Daily study target (minutes)" error={errs.dailyStudyTargetMinutes}><Input type="number" min={15} max={1440} value={f.dailyStudyTargetMinutes} onChange={(e) => setF({ ...f, dailyStudyTargetMinutes: Number(e.target.value) })} /></Field>
          <Field label="Primary difficulty"><Select value={f.primaryDifficulty} onChange={(e) => setF({ ...f, primaryDifficulty: e.target.value as typeof f.primaryDifficulty })}>{DIFFICULTIES.map((d) => <option key={d} value={d}>{titleCase(d)}</option>)}</Select></Field>
          <Field label="Theme"><Select value={f.theme} onChange={(e) => setF({ ...f, theme: e.target.value as typeof f.theme })}><option value="dark">Dark</option><option value="light">Light</option></Select></Field>
          <Field label="Minimum sample size for 'strong'" error={errs.minSampleSize} hint="Attempts needed in a category"><Input type="number" min={1} max={100} value={f.minSampleSize} onChange={(e) => setF({ ...f, minSampleSize: Number(e.target.value) })} /></Field>
        </div>
        <fieldset className="rounded-lg border border-border p-3">
          <legend className="px-1 text-sm font-medium">Readiness weights (relative; total {wsum})</legend>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">{wf("learning", "Learning")}{wf("ctf", "CTF performance")}{wf("coverage", "Domain coverage")}{wf("mock", "Mock performance")}{wf("reporting", "Reporting")}</div>
          <p className="mt-2 text-xs text-muted">Weights are normalised over components that have evidence, so the formula stays transparent (see Readiness Score). Defaults: {Object.values(DEFAULT_READINESS_WEIGHTS).join(" / ")}. <button type="button" className="underline" onClick={() => setF({ ...f, w: { ...DEFAULT_READINESS_WEIGHTS } })}>Reset weights</button></p>
          {errs.readinessWeights && <p role="alert" className="text-xs text-danger">{errs.readinessWeights}</p>}
        </fieldset>
        <Button type="submit" variant="primary" loading={busy}>Save settings</Button>
      </Card>
    </form>
  );
}

function Sources({ s, onSaved }: { s: SettingsDto; onSaved: () => void }) {
  const [text, setText] = React.useState(s.assumptionsMarkdown);
  const [busy, setBusy] = React.useState(false);
  async function save() { setBusy(true); try { await patch("/settings", { assumptionsMarkdown: text }); toast.success("Assumptions saved"); onSaved(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); } }
  return (
    <Card className="space-y-3">
      <CardTitle>Sources &amp; assumptions</CardTitle>
      <div>
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold"><Badge tone="accent">Official</Badge> Stated in the TCS HackQuest Season 11 terms (as provided to this project)</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm">{OFFICIAL.map((o) => <li key={o}>{o}</li>)}</ul>
      </div>
      <div><h3 className="mb-1 flex items-center gap-2 text-sm font-semibold"><Badge>Not claimed</Badge></h3><p className="text-sm text-muted">{NOT_CLAIMED}</p></div>
      <div><h3 className="mb-1 flex items-center gap-2 text-sm font-semibold"><Badge tone="warning">Preparation advice</Badge></h3><p className="text-sm text-muted">The 31-day roadmap, topic order, suggested mock dates (Nov 16, Nov 26, Dec 2) and resources are recommendations, not an official syllabus. Topics are labelled Official Round 1, Supplementary, Mentioned for later rounds, or Unverified.</p></div>
      <Field label="My own assumptions and sources (editable)"><Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Checked contest FAQ on 10 Nov: report template link..." /></Field>
      <Button loading={busy} onClick={() => void save()}>Save assumptions</Button>
    </Card>
  );
}

interface Preview { report: { counts: Record<string, { valid: number; invalid: number }>; errors: string[]; fatal?: string }; applied: boolean }

function DataManagement() {
  const [backup, setBackup] = React.useState<unknown>(null);
  const [fileName, setFileName] = React.useState("");
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [mode, setMode] = React.useState<"merge" | "replace">("merge");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState<"replace" | "restore" | "seeded" | "full" | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function onFile(file: File) {
    setPreview(null); setBackup(null); setFileName(file.name);
    try {
      const parsed = JSON.parse(await file.text());
      setBackup(parsed);
      setPreview(await post<Preview>("/backup/import", { backup: parsed, mode, dryRun: true }));
    } catch (e) { toast.error(e instanceof SyntaxError ? "That file is not valid JSON." : (e as Error).message); }
  }
  async function applyImport() {
    setBusy("import");
    try { await post("/backup/import", { backup, mode, dryRun: false, confirm: mode === "replace" ? "REPLACE" : undefined }); toast.success(`Backup ${mode === "replace" ? "restored (replaced)" : "merged"}. Reloading...`); setTimeout(() => location.reload(), 800); }
    catch (e) { const er = e as ApiError; toast.error(er.message); if (er.details) setPreview({ report: er.details as Preview["report"], applied: false }); } finally { setBusy(null); setConfirm(null); }
  }
  async function admin(action: "restore-roadmap" | "reset-seeded" | "full-reset", confirmText?: string) {
    setBusy(action);
    try { await post("/admin", { action, confirm: confirmText }); toast.success("Done. Reloading..."); setTimeout(() => location.reload(), 800); } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); setConfirm(null); }
  }
  async function exportCsv(kind: "attempts" | "tasks") {
    setBusy(kind);
    try {
      if (kind === "attempts") {
        const [a, c] = await Promise.all([api<ListResult<AttemptDto>>("/challengeAttempts?limit=500"), api<ListResult<ChallengeDto>>("/challenges?limit=500")]);
        const cm = new Map(c.items.map((x) => [x.id, x]));
        downloadText("hackquest-attempts.csv", csv([["challenge", "category", "difficulty", "attempted_at", "status", "attempt_number", "minutes", "hints", "lessons"], ...a.items.map((x) => [cm.get(x.challengeId)?.title ?? "", cm.get(x.challengeId)?.category ?? "", cm.get(x.challengeId)?.difficulty ?? "", x.attemptedAt, x.status, x.attemptNumber, x.durationMinutes, x.hintsUsed, x.lessonsLearned])]), "text/csv");
      } else {
        const t = await api<ListResult<LearningTaskDto>>("/learningTasks?limit=500");
        downloadText("hackquest-tasks.csv", csv([["title", "type", "status", "estimated_minutes", "completed_at"], ...t.items.map((x) => [x.title, x.taskType, x.status, x.estimatedMinutes, x.completedAt])]), "text/csv");
      }
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  }
  const invalid = preview ? Object.values(preview.report.counts ?? {}).reduce((s, c) => s + c.invalid, 0) : 0;
  const total = preview ? Object.values(preview.report.counts ?? {}).reduce((s, c) => s + c.valid, 0) : 0;

  return (
    <Card className="space-y-5">
      <CardTitle>Backup, restore and data</CardTitle>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Export</h3>
        <p className="text-sm text-muted">Versioned JSON backup of all records (schema v{SCHEMA_VERSION}). Attachment files are stored in GridFS and are <strong>not</strong> included in the JSON (only their metadata). For full database backups use Atlas backups or <code>mongodump</code> (see README).</p>
        <div className="flex flex-wrap gap-2">
          <a href="/api/backup" download><Button variant="primary"><Download className="h-4 w-4" aria-hidden /> Export JSON backup</Button></a>
          <a href="/api/export/notes" download><Button><Download className="h-4 w-4" aria-hidden /> Notes (.md)</Button></a>
          <Button loading={busy === "attempts"} onClick={() => void exportCsv("attempts")}>Attempts (.csv)</Button>
          <Button loading={busy === "tasks"} onClick={() => void exportCsv("tasks")}>Tasks (.csv)</Button>
        </div>
      </section>
      <section className="space-y-2 border-t border-border pt-4">
        <h3 className="text-sm font-semibold">Import / restore</h3>
        <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Backup file" onChange={(e) => e.target.files?.[0] && void onFile(e.target.files[0])} />
        <Button onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" aria-hidden /> Choose backup file</Button>
        {fileName && <span className="ml-2 text-sm text-muted">{fileName}</span>}
        {preview && (
          <div className="space-y-3 rounded-lg border border-border p-3">
            {preview.report.fatal ? <p role="alert" className="text-sm text-danger">{preview.report.fatal}</p> : (
              <>
                <p className="text-sm">Validated <strong>{total}</strong> valid record(s){invalid > 0 && <>, <strong className="text-danger">{invalid} invalid</strong></>}.</p>
                <div className="overflow-x-auto"><table className="text-sm"><thead className="text-xs text-muted"><tr><th className="pr-4 text-left">Collection</th><th className="pr-4">Valid</th><th>Invalid</th></tr></thead><tbody>{Object.entries(preview.report.counts).map(([k, v]) => <tr key={k}><td className="pr-4">{k}</td><td className="pr-4 text-center">{v.valid}</td><td className="text-center">{v.invalid}</td></tr>)}</tbody></table></div>
                {preview.report.errors.length > 0 && <ul className="max-h-32 overflow-auto text-xs text-danger">{preview.report.errors.map((e) => <li key={e}>{e}</li>)}</ul>}
                <fieldset><legend className="text-sm font-medium">Import mode</legend>
                  <label className="mr-4 inline-flex items-center gap-2 text-sm"><input type="radio" name="mode" checked={mode === "merge"} onChange={() => setMode("merge")} /> Merge (add/update records by id, keep everything else and current settings)</label>
                  <label className="inline-flex items-center gap-2 text-sm"><input type="radio" name="mode" checked={mode === "replace"} onChange={() => setMode("replace")} /> Replace (delete all current data first)</label></fieldset>
                <Button variant={mode === "replace" ? "danger" : "primary"} disabled={invalid > 0 || total === 0} loading={busy === "import"} onClick={() => (mode === "replace" ? setConfirm("replace") : void applyImport())}>{mode === "replace" ? "Replace all data..." : "Merge into current data"}</Button>
                {invalid > 0 && <p className="text-xs text-muted">Fix or remove the invalid records before importing; nothing is imported when any record is invalid.</p>}
              </>
            )}
          </div>
        )}
      </section>
      <section className="space-y-2 border-t border-border pt-4">
        <h3 className="text-sm font-semibold">Seeded content</h3>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setConfirm("restore")}><RotateCcw className="h-4 w-4" aria-hidden /> Restore default roadmap</Button>
          <Button onClick={() => setConfirm("seeded")}>Reset seeded content</Button>
          <Button variant="danger" onClick={() => setConfirm("full")}>Full reset (delete everything)</Button>
        </div>
        <p className="text-xs text-muted">Restore/reset re-creates default roadmap days and missing default resources, challenges, folders and mocks. Your own notes, attempts, reports and custom items are kept. Full reset deletes all data and re-seeds.</p>
      </section>

      <ConfirmDialog open={confirm === "replace"} title="Replace ALL current data?" confirmLabel="Replace data" requireText="REPLACE" busy={busy === "import"} onCancel={() => setConfirm(null)} onConfirm={applyImport} message="Every record currently in the database is deleted and replaced with the backup's contents. Export a backup first if unsure. Attachment files are not part of JSON backups." />
      <ConfirmDialog open={confirm === "restore"} title="Restore default roadmap?" confirmLabel="Restore" busy={busy === "restore-roadmap"} onCancel={() => setConfirm(null)} onConfirm={() => admin("restore-roadmap")} message="Resets the 31 roadmap days to default dates and content and re-creates their tasks (completion for those days resets). Notes and other data are kept." />
      <ConfirmDialog open={confirm === "seeded"} title="Reset seeded content?" confirmLabel="Reset seeded content" busy={busy === "reset-seeded"} onCancel={() => setConfirm(null)} onConfirm={() => admin("reset-seeded")} message="Restores default roadmap days/tasks and re-adds any deleted default resources, challenges, folders and mocks. Your own data is kept." />
      <ConfirmDialog open={confirm === "full"} title="Delete ALL data?" confirmLabel="Delete everything" requireText="DELETE ALL DATA" busy={busy === "full-reset"} onCancel={() => setConfirm(null)} onConfirm={() => admin("full-reset", "DELETE ALL DATA")} message="This permanently deletes all notes, attempts, reports, mocks, settings and attachments, then re-seeds default content. It cannot be undone." />
    </Card>
  );
}
