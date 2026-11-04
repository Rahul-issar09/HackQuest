"use client";
import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Download, FilePlus2, Folder, FolderPlus, Inbox, Pencil, Pin, Search, Star, Tag, Trash2 } from "lucide-react";
import { Badge, Button, Card, ConfirmDialog, Dialog, EmptyState, Field, Input, Loading, Select } from "@/components/ui";
import { NoteEditor, type EditorHandle } from "@/features/notes/editor";
import { ApiError, del, patch, post, useApi } from "@/lib/client/api";
import { ago, cn } from "@/lib/utils";
import type { FolderDto, ListResult, NoteDto } from "@/lib/types";

type Filter = { kind: "all" } | { kind: "pinned" } | { kind: "fav" } | { kind: "unfiled" } | { kind: "folder"; id: string } | { kind: "tag"; tag: string };
type Pane = "folders" | "list" | "editor";

function NotesInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const selectedId = sp.get("id");
  const [search, setSearch] = React.useState(sp.get("q") ?? "");
  const [dq, setDq] = React.useState(search);
  React.useEffect(() => { const t = setTimeout(() => setDq(search), 300); return () => clearTimeout(t); }, [search]);
  const folders = useApi<ListResult<FolderDto>>("/noteFolders?limit=500");
  const notes = useApi<ListResult<NoteDto>>(`/notes?limit=500${dq ? `&q=${encodeURIComponent(dq)}` : ""}`);
  const [filter, setFilter] = React.useState<Filter>({ kind: "all" });
  const [sort, setSort] = React.useState<"updatedAt" | "createdAt" | "title">("updatedAt");
  const [pane, setPane] = React.useState<Pane>(selectedId ? "editor" : "list");
  const handle = React.useRef<EditorHandle | null>(null);
  const [folderDlg, setFolderDlg] = React.useState<{ folder?: FolderDto; parent?: string | null } | null>(null);
  const [delFolder, setDelFolder] = React.useState<FolderDto | null>(null);
  const creating = React.useRef(false);

  const all = React.useMemo(() => notes.data?.items ?? [], [notes.data]);
  const fl = React.useMemo(() => folders.data?.items ?? [], [folders.data]);
  const tags = React.useMemo(() => { const m = new Map<string, number>(); all.forEach((n) => n.tags.forEach((t) => m.set(t, (m.get(t) ?? 0) + 1))); return [...m.entries()].sort(); }, [all]);

  const visible = React.useMemo(() => {
    const inFolder = (n: NoteDto, id: string): boolean => {
      if (n.folderId === id) return true;
      return fl.filter((f) => f.parentFolderId === id).some((c) => inFolder(n, c.id));
    };
    let list = all.filter((n) => {
      switch (filter.kind) {
        case "pinned": return n.isPinned;
        case "fav": return n.isFavourite;
        case "unfiled": return !n.folderId;
        case "folder": return inFolder(n, filter.id);
        case "tag": return n.tags.includes(filter.tag);
        default: return true;
      }
    });
    list = [...list].sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || (sort === "title" ? a.title.localeCompare(b.title) : b[sort].localeCompare(a[sort])));
    return list;
  }, [all, filter, sort, fl]);

  /** Flush the open editor before changing the selected note; blocks switching if the save fails. */
  async function guardedSelect(id: string | null) {
    if (handle.current) {
      const ok = await handle.current.flush();
      if (!ok && !confirm("The current note could not be saved yet. Switch anyway? Your unsent text stays in a local draft.")) return;
    }
    router.replace(id ? `/notes?id=${id}` : "/notes", { scroll: false });
    setPane(id ? "editor" : "list");
  }

  const newNote = React.useCallback(async (extra: Record<string, unknown> = {}) => {
    if (creating.current) return;
    creating.current = true;
    try {
      if (handle.current) await handle.current.flush();
      const folderId = filter.kind === "folder" ? filter.id : null;
      const n = await post<NoteDto>("/notes", { title: "Untitled note", markdownBody: "", folderId, ...extra });
      toast.success("Note created");
      await notes.reload();
      router.replace(`/notes?id=${n.id}`, { scroll: false });
      setPane("editor");
    } catch (e) { toast.error((e as Error).message); } finally { creating.current = false; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, router]);

  React.useEffect(() => {
    if (sp.get("new") === "1") {
      const extra: Record<string, unknown> = {};
      if (sp.get("day")) extra.linkedRoadmapDayIds = [sp.get("day")];
      if (sp.get("challenge")) extra.linkedChallengeIds = [sp.get("challenge")];
      if (sp.get("resource")) extra.linkedResourceIds = [sp.get("resource")];
      if (sp.get("mock")) extra.linkedMockSessionIds = [sp.get("mock")];
      router.replace("/notes", { scroll: false });
      void newNote(extra);
    }
  }, [sp, newNote, router]);

  async function removeFolder() {
    if (!delFolder) return;
    try { await del(`/noteFolders/${delFolder.id}`); toast.success("Folder deleted; its notes were moved up one level"); setDelFolder(null); if (filter.kind === "folder" && filter.id === delFolder.id) setFilter({ kind: "all" }); void folders.reload(); void notes.reload(); } catch (e) { toast.error((e as Error).message); }
  }
  const count = (pred: (n: NoteDto) => boolean) => all.filter(pred).length;
  const onMeta = React.useCallback((n: NoteDto) => {
    notes.setData((p) => p && { ...p, items: p.items.map((x) => (x.id === n.id ? { ...x, ...n, markdownBody: undefined } : x)) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const FolderTree = ({ parent, depth }: { parent: string | null; depth: number }) => (
    <>{fl.filter((f) => (f.parentFolderId ?? null) === parent).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)).map((f) => (
      <li key={f.id}>
        <div className={cn("group flex items-center rounded-lg", filter.kind === "folder" && filter.id === f.id ? "bg-accent/15" : "hover:bg-surface-2")} style={{ paddingLeft: depth * 12 }}>
          <button className="flex min-h-[2.25rem] flex-1 items-center gap-2 px-2 text-left text-sm" onClick={() => { setFilter({ kind: "folder", id: f.id }); setPane("list"); }} aria-current={filter.kind === "folder" && filter.id === f.id ? "true" : undefined}>
            <Folder className="h-4 w-4 shrink-0 text-muted" aria-hidden /><span className="truncate">{f.name}</span><span className="ml-auto text-xs text-muted">{count((n) => n.folderId === f.id)}</span>
          </button>
          <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Add subfolder in ${f.name}`} onClick={() => setFolderDlg({ parent: f.id })}><FolderPlus className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Rename ${f.name}`} onClick={() => setFolderDlg({ folder: f })}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Delete folder ${f.name}`} onClick={() => setDelFolder(f)}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
        <ul><FolderTree parent={f.id} depth={depth + 1} /></ul>
      </li>
    ))}</>
  );
  const quick = (k: Filter, label: string, icon: React.ReactNode, n: number) => (
    <li><button className={cn("flex min-h-[2.25rem] w-full items-center gap-2 rounded-lg px-2 text-left text-sm", JSON.stringify(filter) === JSON.stringify(k) ? "bg-accent/15 text-accent" : "hover:bg-surface-2")} onClick={() => { setFilter(k); setPane("list"); }}>{icon}<span>{label}</span><span className="ml-auto text-xs text-muted">{n}</span></button></li>
  );

  return (
    <div className="-mx-1">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div><h1 className="text-2xl font-bold tracking-tight">My Notes</h1><p className="text-sm text-muted">Markdown notes with autosave, folders, tags and links to your plan.</p></div>
        <div className="flex gap-2"><a href="/api/export/notes" download><Button><Download className="h-4 w-4" aria-hidden /> Export all (.md)</Button></a><Button variant="primary" onClick={() => void newNote()}><FilePlus2 className="h-4 w-4" aria-hidden /> New note</Button></div>
      </div>

      <div className="mb-2 flex gap-1 lg:hidden" role="tablist" aria-label="Notes panes">
        {(["folders", "list", "editor"] as Pane[]).map((p) => <Button key={p} size="sm" role="tab" aria-selected={pane === p} variant={pane === p ? "primary" : "secondary"} disabled={p === "editor" && !selectedId} onClick={() => setPane(p)}>{p === "folders" ? "Folders" : p === "list" ? "Notes" : "Editor"}</Button>)}
      </div>

      <div className="grid gap-3 lg:grid-cols-[210px_290px_minmax(0,1fr)] lg:h-[calc(100vh-11rem)]">
        <Card className={cn("overflow-y-auto p-3", pane !== "folders" && "hidden lg:block")}>
          <ul className="space-y-0.5" aria-label="Note filters">
            {quick({ kind: "all" }, "All notes", <Inbox className="h-4 w-4 text-muted" aria-hidden />, all.length)}
            {quick({ kind: "pinned" }, "Pinned", <Pin className="h-4 w-4 text-muted" aria-hidden />, count((n) => n.isPinned))}
            {quick({ kind: "fav" }, "Favourites", <Star className="h-4 w-4 text-muted" aria-hidden />, count((n) => n.isFavourite))}
            {quick({ kind: "unfiled" }, "No folder", <Folder className="h-4 w-4 text-muted" aria-hidden />, count((n) => !n.folderId))}
          </ul>
          <div className="mb-1 mt-4 flex items-center justify-between"><h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Folders</h2><Button size="icon" variant="ghost" className="h-7 w-7" aria-label="New folder" onClick={() => setFolderDlg({ parent: null })}><FolderPlus className="h-4 w-4" /></Button></div>
          {folders.loading ? <Loading /> : <ul aria-label="Folders"><FolderTree parent={null} depth={0} /></ul>}
          {tags.length > 0 && (<><h2 className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Tags</h2>
            <div className="flex flex-wrap gap-1">{tags.map(([t, n]) => <button key={t} onClick={() => { setFilter({ kind: "tag", tag: t }); setPane("list"); }} className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs", filter.kind === "tag" && filter.tag === t ? "border-accent text-accent" : "border-border text-muted hover:text-fg")}><Tag className="h-3 w-3" aria-hidden />{t} {n}</button>)}</div></>)}
        </Card>

        <Card className={cn("flex min-h-0 flex-col p-3", pane !== "list" && "hidden lg:flex")}>
          <div className="relative mb-2"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden /><Input aria-label="Search notes" className="pl-9" placeholder="Search titles, content, tags..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted"><span>{visible.length} note{visible.length === 1 ? "" : "s"}</span>
            <Select aria-label="Sort notes" className="h-8 w-auto text-xs" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}><option value="updatedAt">Recently updated</option><option value="createdAt">Recently created</option><option value="title">Title A-Z</option></Select></div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {notes.loading ? <Loading /> : notes.error ? <p className="text-sm text-danger">{notes.error.message} <button className="underline" onClick={() => void notes.reload()}>Retry</button></p> : visible.length === 0 ? (
              <EmptyState title={dq ? "No notes match your search" : "No notes here yet"} description={dq ? "Try different keywords." : "Create a note to start your knowledge base."} action={<Button variant="primary" onClick={() => void newNote()}>New note</Button>} />
            ) : (
              <ul className="space-y-1">{visible.map((n) => (
                <li key={n.id}><button onClick={() => void guardedSelect(n.id)} aria-current={n.id === selectedId ? "true" : undefined}
                  className={cn("w-full rounded-lg border p-2 text-left", n.id === selectedId ? "border-accent bg-accent/10" : "border-transparent hover:bg-surface-2")}>
                  <div className="flex items-center gap-1.5 text-sm font-medium">{n.isPinned && <Pin className="h-3 w-3 shrink-0 fill-accent text-accent" aria-label="Pinned" />}{n.isFavourite && <Star className="h-3 w-3 shrink-0 fill-warning text-warning" aria-label="Favourite" />}<span className="truncate">{n.title || "Untitled note"}</span></div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted"><span>{ago(n.updatedAt)}</span>{n.tags.slice(0, 3).map((t) => <Badge key={t}>#{t}</Badge>)}</div>
                </button></li>
              ))}</ul>
            )}
          </div>
        </Card>

        <Card className={cn("min-h-[480px] min-w-0 overflow-y-auto p-3 sm:p-4", pane !== "editor" && "hidden lg:block")}>
          {selectedId ? (
            <NoteEditor noteId={selectedId} folders={fl} handleRef={handle} onBack={() => setPane("list")} onMetaChanged={onMeta}
              onDeleted={() => { void notes.reload(); router.replace("/notes", { scroll: false }); setPane("list"); }} />
          ) : <EmptyState title="Select or create a note" description="Your notes autosave as you type and survive refreshes." action={<Button variant="primary" onClick={() => void newNote()}>New note</Button>} />}
        </Card>
      </div>

      {folderDlg && <FolderDialog state={folderDlg} folders={fl} onClose={() => setFolderDlg(null)} onSaved={() => { setFolderDlg(null); void folders.reload(); }} />}
      <ConfirmDialog open={!!delFolder} title="Delete folder?" message={`Folder "${delFolder?.name}" will be deleted. Notes and subfolders inside it move up one level; no notes are deleted.`} onCancel={() => setDelFolder(null)} onConfirm={removeFolder} />
    </div>
  );
}

function FolderDialog({ state, folders, onClose, onSaved }: { state: { folder?: FolderDto; parent?: string | null }; folders: FolderDto[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = React.useState(state.folder?.name ?? "");
  const [parent, setParent] = React.useState<string>(state.folder ? state.folder.parentFolderId ?? "" : state.parent ?? "");
  const [err, setErr] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const descendants = React.useMemo(() => {
    const out = new Set<string>();
    if (!state.folder) return out;
    const walk = (id: string) => folders.filter((f) => f.parentFolderId === id).forEach((c) => { out.add(c.id); walk(c.id); });
    out.add(state.folder.id); walk(state.folder.id);
    return out;
  }, [folders, state.folder]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setErr("Name is required");
    setBusy(true);
    try {
      if (state.folder) await patch(`/noteFolders/${state.folder.id}`, { name, parentFolderId: parent || null });
      else await post("/noteFolders", { name, parentFolderId: parent || null, order: folders.length });
      toast.success(state.folder ? "Folder updated" : "Folder created"); onSaved();
    } catch (er) { setErr((er as ApiError).fields.name ?? (er as Error).message); } finally { setBusy(false); }
  }
  return (
    <Dialog open onClose={onClose} title={state.folder ? "Rename / move folder" : "New folder"}>
      <form onSubmit={save} className="space-y-3">
        <Field label="Name" error={err}><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
        <Field label="Parent folder"><Select value={parent} onChange={(e) => setParent(e.target.value)}><option value="">Top level</option>{folders.filter((f) => !descendants.has(f.id)).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</Select></Field>
        <div className="flex justify-end gap-2"><Button onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" loading={busy}>Save</Button></div>
      </form>
    </Dialog>
  );
}

export default function NotesPage() {
  return <Suspense fallback={<Loading />}><NotesInner /></Suspense>;
}
