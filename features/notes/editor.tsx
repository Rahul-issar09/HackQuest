"use client";
import * as React from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import {
  ArrowLeft, Bold, CheckSquare, Code, Download, FileCode, Heading1, Heading2, Italic, Link2, List, ListOrdered, Paperclip,
  Pin, Quote, Star, Table, Trash2, Upload,
} from "lucide-react";
import { format } from "date-fns";
import { Badge, Button, ConfirmDialog, Dialog, ErrorState, Field, Input, Loading, Select } from "@/components/ui";
import { ApiError, api, del, patch, useApi } from "@/lib/client/api";
import { applyFormat, type FormatKind } from "@/lib/markdown-format";
import { downloadText, noteToMarkdown, slug } from "@/lib/export/markdown";
import { MAX_ATTACHMENT_BYTES } from "@/lib/constants";
import { cn, parseTags } from "@/lib/utils";
import type { AttachmentDto, ChallengeDto, FolderDto, ListResult, MockDto, NoteDto, ResourceDto, RoadmapDayDto } from "@/lib/types";

const MarkdownView = dynamic(() => import("@/components/markdown-view").then((m) => m.MarkdownView), { ssr: false, loading: () => <Loading label="Loading preview..." /> });

type SaveState = "saved" | "dirty" | "saving" | "error" | "conflict";
type Mode = "edit" | "split" | "preview";
export interface EditorHandle { flush: () => Promise<boolean> }

const draftKey = (id: string) => `hq-note-draft-${id}`;
const lsGet = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* unavailable */ } };

const TOOLS: { kind: FormatKind; label: string; icon: React.ElementType }[] = [
  { kind: "h1", label: "Heading 1", icon: Heading1 }, { kind: "h2", label: "Heading 2", icon: Heading2 },
  { kind: "bold", label: "Bold", icon: Bold }, { kind: "italic", label: "Italic", icon: Italic },
  { kind: "ul", label: "Bulleted list", icon: List }, { kind: "ol", label: "Numbered list", icon: ListOrdered },
  { kind: "check", label: "Checklist", icon: CheckSquare }, { kind: "link", label: "Link", icon: Link2 },
  { kind: "table", label: "Table", icon: Table }, { kind: "code", label: "Inline code", icon: Code },
  { kind: "codeblock", label: "Code block", icon: FileCode }, { kind: "quote", label: "Quote", icon: Quote },
];

interface Props {
  noteId: string;
  folders: FolderDto[];
  handleRef: React.MutableRefObject<EditorHandle | null>;
  onBack: () => void;
  onMetaChanged: (n: NoteDto) => void;
  onDeleted: () => void;
}

export function NoteEditor({ noteId, folders, handleRef, onBack, onMetaChanged, onDeleted }: Props) {
  const q = useApi<NoteDto>(`/notes/${noteId}`);
  if (q.loading && !q.data) return <Loading label="Loading note..." />;
  if (q.error && !q.data) return <ErrorState error={q.error} onRetry={() => void q.reload()} />;
  if (!q.data) return null;
  return <Loaded key={q.data.id} initial={q.data} folders={folders} handleRef={handleRef} onBack={onBack} onMetaChanged={onMetaChanged} onDeleted={onDeleted} />;
}

function Loaded({ initial, folders, handleRef, onBack, onMetaChanged, onDeleted }: Omit<Props, "noteId"> & { initial: NoteDto }) {
  const [title, setTitle] = React.useState(initial.title);
  const [body, setBody] = React.useState(initial.markdownBody ?? "");
  const [tagsText, setTagsText] = React.useState(initial.tags.join(", "));
  const [meta, setMeta] = React.useState(initial);
  const [state, setState] = React.useState<SaveState>("saved");
  const [lastSaved, setLastSaved] = React.useState(initial.lastSavedAt);
  const [errMsg, setErrMsg] = React.useState("");
  const [mode, setMode] = React.useState<Mode>("edit");
  const [conflict, setConflict] = React.useState<NoteDto | null>(null);
  const [draft, setDraft] = React.useState<{ title: string; body: string } | null>(null);
  const [linksOpen, setLinksOpen] = React.useState(false);
  const [delOpen, setDelOpen] = React.useState(false);
  const taRef = React.useRef<HTMLTextAreaElement>(null);

  const baseline = React.useRef(initial.lastSavedAt);
  const pending = React.useRef<Record<string, unknown>>({});
  const inflight = React.useRef<Promise<boolean> | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const retries = React.useRef(0);
  const stateRef = React.useRef<SaveState>("saved");
  const setS = (s: SaveState) => { stateRef.current = s; setState(s); };
  const id = initial.id;

  // Offer to restore an unsent local draft (e.g. after a crash or failed save + refresh).
  React.useEffect(() => {
    const raw = lsGet(draftKey(id));
    if (!raw) return;
    try {
      const d = JSON.parse(raw) as { title: string; body: string; at: number };
      if (d.at > Date.parse(initial.lastSavedAt) && (d.body !== (initial.markdownBody ?? "") || d.title !== initial.title)) setDraft(d);
      else lsSet(draftKey(id), null);
    } catch { lsSet(draftKey(id), null); }
  }, [id, initial]);

  const flush = React.useCallback(async (): Promise<boolean> => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (inflight.current) { await inflight.current; }
    if (stateRef.current === "conflict") return false;
    if (Object.keys(pending.current).length === 0) return stateRef.current !== "error";
    const snapshot = pending.current;
    pending.current = {};
    setS("saving");
    const run = (async () => {
      try {
        const saved = await api<NoteDto>(`/notes/${id}`, { method: "PATCH", json: { ...snapshot, expectedLastSavedAt: baseline.current } });
        baseline.current = saved.lastSavedAt;
        setLastSaved(saved.lastSavedAt);
        retries.current = 0;
        setErrMsg("");
        onMetaChanged({ ...saved, markdownBody: undefined });
        if (Object.keys(pending.current).length > 0) { setS("dirty"); schedule(300); }
        else { setS("saved"); lsSet(draftKey(id), null); }
        return true;
      } catch (e) {
        pending.current = { ...snapshot, ...pending.current }; // never lose unsent edits
        const err = e as ApiError;
        if (err.status === 409) { setConflict(err.details as NoteDto); setS("conflict"); return false; }
        setErrMsg(err.message);
        setS("error");
        retries.current += 1;
        if (retries.current <= 6) retryTimer.current = setTimeout(() => void flush(), Math.min(30000, 2000 * 2 ** (retries.current - 1)));
        return false;
      }
    })();
    inflight.current = run;
    const ok = await run;
    inflight.current = null;
    return ok;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, onMetaChanged]);

  function schedule(ms = 800) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), ms);
  }
  function change(patchObj: Record<string, unknown>, opts: { immediate?: boolean } = {}) {
    pending.current = { ...pending.current, ...patchObj };
    if (stateRef.current !== "conflict") setS("dirty");
    if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null; }
    if (opts.immediate) void flush(); else schedule();
  }
  function persistDraft(t: string, b: string) { lsSet(draftKey(id), JSON.stringify({ title: t, body: b, at: Date.now() })); }

  React.useEffect(() => { handleRef.current = { flush }; return () => { handleRef.current = null; }; }, [flush, handleRef]);
  // Flush on unmount (switching notes) and warn on page leave while unsaved.
  React.useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (stateRef.current !== "saved") { e.preventDefault(); e.returnValue = ""; } };
    const clickGuard = (e: MouseEvent) => {
      if (stateRef.current === "saved") return;
      const a = (e.target as HTMLElement).closest?.("a[href]") as HTMLAnchorElement | null;
      if (a && a.origin === location.origin && !a.hasAttribute("download") && a.target !== "_blank") {
        void flush();
        if (!confirm("This note has unsaved changes that may not be saved yet. Leave anyway?")) { e.preventDefault(); e.stopPropagation(); }
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", clickGuard, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", clickGuard, true);
      if (timer.current) clearTimeout(timer.current);
      if (retryTimer.current) clearTimeout(retryTimer.current);
      if (Object.keys(pending.current).length > 0 && stateRef.current !== "conflict") void flush();
    };
  }, [flush]);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); void flush().then((ok) => ok && toast.success("Note saved")); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flush]);

  function applyTool(kind: FormatKind) {
    const ta = taRef.current;
    if (!ta) return;
    const r = applyFormat(kind, body, ta.selectionStart, ta.selectionEnd);
    setBody(r.text); persistDraft(title, r.text); change({ markdownBody: r.text });
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(r.start, r.end); });
  }
  function insertAtCursor(text: string) {
    const ta = taRef.current;
    const pos = ta ? ta.selectionStart : body.length;
    const next = body.slice(0, pos) + text + body.slice(pos);
    setBody(next); persistDraft(title, next); change({ markdownBody: next });
  }
  async function togglePatch(p: Partial<NoteDto>) {
    setMeta((m) => ({ ...m, ...p }));
    change(p as Record<string, unknown>, { immediate: true });
    onMetaChanged({ ...meta, ...p, markdownBody: undefined });
  }
  async function resolveKeepMine() {
    if (!conflict) return;
    baseline.current = conflict.lastSavedAt; setConflict(null); setS("dirty"); await flush();
  }
  function resolveTheirs() {
    if (!conflict) return;
    pending.current = {}; lsSet(draftKey(id), null); baseline.current = conflict.lastSavedAt;
    setTitle(conflict.title); setBody(conflict.markdownBody ?? ""); setTagsText(conflict.tags.join(", "));
    setMeta(conflict); setLastSaved(conflict.lastSavedAt); setConflict(null); setS("saved");
  }
  async function removeNote() {
    try { pending.current = {}; await del(`/notes/${id}`); lsSet(draftKey(id), null); toast.success("Note deleted"); onDeleted(); } catch (e) { toast.error((e as Error).message); }
  }
  function exportOne() {
    const folder = folders.find((f) => f.id === meta.folderId)?.name ?? "";
    downloadText(`${slug(title)}.md`, noteToMarkdown({ title, body, tags: parseTags(tagsText), folder, updatedAt: lastSaved }));
  }

  const badge = {
    saved: <Badge tone="success">Saved {format(new Date(lastSaved), "HH:mm:ss")}</Badge>,
    dirty: <Badge tone="warning">Unsaved changes</Badge>,
    saving: <Badge tone="accent">Saving...</Badge>,
    error: <Badge tone="danger">Save failed - retrying</Badge>,
    conflict: <Badge tone="danger">Conflict</Badge>,
  }[state];
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Back to note list" onClick={() => { void flush(); onBack(); }}><ArrowLeft className="h-4 w-4" /></Button>
        <input aria-label="Note title" value={title} placeholder="Untitled note"
          onChange={(e) => { setTitle(e.target.value); persistDraft(e.target.value, body); change({ title: e.target.value }); }}
          className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-xl font-bold hover:border-border focus:border-accent" />
        <span role="status" aria-live="polite">{badge}</span>
        <Button size="sm" onClick={() => void flush().then((ok) => ok && toast.success("Note saved"))}>Save</Button>
        <Button size="icon" variant="ghost" aria-label={meta.isPinned ? "Unpin note" : "Pin note"} aria-pressed={meta.isPinned} onClick={() => void togglePatch({ isPinned: !meta.isPinned })}><Pin className={cn("h-4 w-4", meta.isPinned && "fill-accent text-accent")} /></Button>
        <Button size="icon" variant="ghost" aria-label={meta.isFavourite ? "Remove from favourites" : "Add to favourites"} aria-pressed={meta.isFavourite} onClick={() => void togglePatch({ isFavourite: !meta.isFavourite })}><Star className={cn("h-4 w-4", meta.isFavourite && "fill-warning text-warning")} /></Button>
        <Button size="icon" variant="ghost" aria-label="Export this note as Markdown" onClick={exportOne}><Download className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" aria-label="Delete note" onClick={() => setDelOpen(true)}><Trash2 className="h-4 w-4" /></Button>
      </div>

      {state === "error" && <div role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-2 text-sm">Could not save: {errMsg}. Your text is kept in this editor and in a local backup; it will retry automatically. <button className="underline" onClick={() => { retries.current = 0; void flush(); }}>Retry now</button></div>}
      {conflict && (
        <div role="alert" className="space-y-2 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm">
          <p>This note was changed elsewhere (another tab or device) after you opened it. Your edits are not saved yet.</p>
          <div className="flex gap-2"><Button size="sm" variant="primary" onClick={() => void resolveKeepMine()}>Keep my version (overwrite)</Button><Button size="sm" onClick={resolveTheirs}>Load the other version (discard mine)</Button></div>
        </div>
      )}
      {draft && (
        <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 p-2 text-sm">
          A newer unsaved local draft was found for this note.
          <Button size="sm" onClick={() => { setTitle(draft.title); setBody(draft.body); change({ title: draft.title, markdownBody: draft.body }); setDraft(null); }}>Restore draft</Button>
          <Button size="sm" variant="ghost" onClick={() => { lsSet(draftKey(id), null); setDraft(null); }}>Discard</Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div role="toolbar" aria-label="Markdown formatting" className="flex flex-wrap gap-0.5">
          {TOOLS.map(({ kind, label, icon: Icon }) => <Button key={kind} size="icon" variant="ghost" className="h-8 w-8" aria-label={label} title={label} disabled={mode === "preview"} onClick={() => applyTool(kind)}><Icon className="h-4 w-4" /></Button>)}
        </div>
        <div role="group" aria-label="Editor mode" className="ml-auto flex rounded-lg border border-border p-0.5">
          {(["edit", "split", "preview"] as Mode[]).map((m) => <Button key={m} size="sm" variant={mode === m ? "primary" : "ghost"} aria-pressed={mode === m} className={m === "split" ? "hidden lg:inline-flex" : ""} onClick={() => setMode(m)}>{m[0].toUpperCase() + m.slice(1)}</Button>)}
        </div>
      </div>

      <div className={cn("grid min-h-[320px] flex-1 gap-3", mode === "split" ? "lg:grid-cols-2" : "grid-cols-1")}>
        {mode !== "preview" && (
          <textarea ref={taRef} aria-label="Note body (Markdown)" value={body} spellCheck
            onChange={(e) => { setBody(e.target.value); persistDraft(title, e.target.value); change({ markdownBody: e.target.value }); }}
            placeholder={"Write in Markdown...\n\n```bash\nnmap -sV target\n```"}
            className="min-h-[320px] w-full resize-none rounded-lg border border-border bg-bg p-3 font-mono text-sm leading-relaxed focus:border-accent" />
        )}
        {mode !== "edit" && <div className="min-h-[320px] overflow-auto rounded-lg border border-border bg-surface p-4"><MarkdownView source={body} /></div>}
      </div>

      <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
        <Field label="Folder"><Select value={meta.folderId ?? ""} onChange={(e) => void togglePatch({ folderId: e.target.value || null })}><option value="">No folder</option>{folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</Select></Field>
        <Field label="Tags" hint="Comma separated; saved automatically"><Input value={tagsText} onChange={(e) => { setTagsText(e.target.value); change({ tags: parseTags(e.target.value) }); }} /></Field>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>{words} words - {body.length} characters</span>
        <div className="flex gap-2"><Button size="sm" onClick={() => setLinksOpen(true)}><Link2 className="h-3.5 w-3.5" aria-hidden /> Links ({meta.linkedRoadmapDayIds.length + meta.linkedChallengeIds.length + meta.linkedResourceIds.length + meta.linkedMockSessionIds.length})</Button></div>
      </div>
      <Attachments noteId={id} onInsert={insertAtCursor} />

      {linksOpen && <LinksDialog note={meta} onClose={() => setLinksOpen(false)} onSave={(p) => { setLinksOpen(false); void togglePatch(p); }} />}
      <ConfirmDialog open={delOpen} title="Delete note?" message={`"${title || "Untitled note"}" and its attachments will be permanently deleted.`} onCancel={() => setDelOpen(false)} onConfirm={removeNote} />
    </div>
  );
}

function Attachments({ noteId, onInsert }: { noteId: string; onInsert: (md: string) => void }) {
  const list = useApi<{ items: AttachmentDto[] }>(`/attachments?noteId=${noteId}`);
  const [busy, setBusy] = React.useState(false);
  const input = React.useRef<HTMLInputElement>(null);
  async function upload(file: File) {
    if (file.size > MAX_ATTACHMENT_BYTES) return toast.error(`File too large (max ${MAX_ATTACHMENT_BYTES / 1024 / 1024} MB)`);
    setBusy(true);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("noteId", noteId);
      const res = await fetch("/api/attachments", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      toast.success("Attachment uploaded"); void list.reload();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); if (input.current) input.current.value = ""; }
  }
  async function remove(a: AttachmentDto) {
    try { await del(`/attachments/${a.id}`); void list.reload(); toast.success("Attachment deleted"); } catch (e) { toast.error((e as Error).message); }
  }
  return (
    <details className="rounded-lg border border-border p-3 text-sm">
      <summary className="flex cursor-pointer items-center gap-2 font-medium"><Paperclip className="h-4 w-4" aria-hidden /> Attachments ({list.data?.items.length ?? 0})</summary>
      <div className="mt-3 space-y-2">
        <p className="text-xs text-muted">Images, PDF and text files up to {MAX_ATTACHMENT_BYTES / 1024 / 1024} MB, stored in MongoDB GridFS. Included as metadata only in JSON backups.</p>
        <input ref={input} type="file" className="sr-only" id={`up-${noteId}`} accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain,text/markdown" onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} />
        <Button size="sm" loading={busy} onClick={() => input.current?.click()}><Upload className="h-3.5 w-3.5" aria-hidden /> Upload file</Button>
        {list.data?.items.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-2">
            <a href={`/api/attachments/${a.id}`} target="_blank" rel="noopener noreferrer" className="truncate text-accent hover:underline">{a.fileName}</a>
            <span className="text-xs text-muted">{(a.sizeBytes / 1024).toFixed(0)} KB</span>
            <span className="flex gap-1"><Button size="sm" onClick={() => onInsert(a.mimeType.startsWith("image/") ? `\n![${a.fileName}](/api/attachments/${a.id})\n` : `\n[${a.fileName}](/api/attachments/${a.id})\n`)}>Insert in note</Button><Button size="sm" variant="ghost" aria-label={`Delete ${a.fileName}`} onClick={() => void remove(a)}><Trash2 className="h-3.5 w-3.5" /></Button></span>
          </div>
        ))}
      </div>
    </details>
  );
}

function LinksDialog({ note, onClose, onSave }: { note: NoteDto; onClose: () => void; onSave: (p: Partial<NoteDto>) => void }) {
  const days = useApi<ListResult<RoadmapDayDto>>("/roadmapDays?limit=100&sort=dayNumber");
  const chs = useApi<ListResult<ChallengeDto>>("/challenges?limit=500&sort=title");
  const res = useApi<ListResult<ResourceDto>>("/resources?limit=300&sort=title");
  const mocks = useApi<ListResult<MockDto>>("/mockSessions?limit=50");
  const [sel, setSel] = React.useState({ d: note.linkedRoadmapDayIds, c: note.linkedChallengeIds, r: note.linkedResourceIds, m: note.linkedMockSessionIds });
  const multi = (label: string, key: keyof typeof sel, opts: { id: string; label: string }[]) => (
    <Field label={label} hint="Ctrl/Cmd+click to select several"><Select multiple className="h-28" value={sel[key]} onChange={(e) => setSel({ ...sel, [key]: [...e.target.selectedOptions].map((o) => o.value) })}>{opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</Select></Field>
  );
  return (
    <Dialog open onClose={onClose} title="Link this note" wide>
      <div className="grid gap-3 sm:grid-cols-2">
        {multi("Roadmap days", "d", (days.data?.items ?? []).map((d) => ({ id: d.id, label: `Day ${d.dayNumber}: ${d.title}` })))}
        {multi("Challenges", "c", (chs.data?.items ?? []).map((c) => ({ id: c.id, label: c.title })))}
        {multi("Resources", "r", (res.data?.items ?? []).map((r) => ({ id: r.id, label: r.title })))}
        {multi("Mock sessions", "m", (mocks.data?.items ?? []).map((m) => ({ id: m.id, label: m.title })))}
      </div>
      <div className="mt-4 flex justify-end gap-2"><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => onSave({ linkedRoadmapDayIds: sel.d, linkedChallengeIds: sel.c, linkedResourceIds: sel.r, linkedMockSessionIds: sel.m })}>Save links</Button></div>
    </Dialog>
  );
}
