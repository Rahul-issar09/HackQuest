"use client";
import * as React from "react";
import { toast } from "sonner";
import { ExternalLink as LinkIcon, Heart, Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  Async, Badge, Button, Card, ConfirmDialog, Dialog, EmptyState, ExternalLink, Field, Input, PageHeader, Select, Textarea,
  difficultyTone, relevanceTone, statusTone,
} from "@/components/ui";
import { ApiError, del, patch, post, qs, useApi } from "@/lib/client/api";
import { COST_STATUS, DIFFICULTIES, RELEVANCE, RELEVANCE_LABEL, RESOURCE_STATUS, RESOURCE_TYPES } from "@/lib/constants";
import { parseTags, titleCase } from "@/lib/utils";
import type { ListResult, ResourceDto, RoadmapDayDto } from "@/lib/types";

const blank = {
  title: "", description: "", url: "", category: "", resourceType: "article", difficulty: "beginner", costStatus: "unknown",
  relevanceClassification: "unverified", tags: "", linkedRoadmapDayIds: [] as string[], personalNotes: "",
};

export default function ResourcesPage() {
  const [q, setQ] = React.useState("");
  const [dq, setDq] = React.useState("");
  const [f, setF] = React.useState({ category: "all", resourceType: "all", difficulty: "all", status: "all", isFavourite: "all" });
  React.useEffect(() => { const t = setTimeout(() => setDq(q), 250); return () => clearTimeout(t); }, [q]);
  const query = useApi<ListResult<ResourceDto>>(`/resources${qs({ q: dq, limit: 300, sort: "category", ...f, isFavourite: f.isFavourite === "all" ? undefined : f.isFavourite })}`);
  const all = useApi<ListResult<ResourceDto>>("/resources?limit=500");
  const days = useApi<ListResult<RoadmapDayDto>>("/roadmapDays?limit=100&sort=dayNumber");
  const [editing, setEditing] = React.useState<ResourceDto | "new" | null>(null);
  const [deleting, setDeleting] = React.useState<ResourceDto | null>(null);
  const categories = [...new Set((all.data?.items ?? []).map((r) => r.category))].sort();

  async function update(r: ResourceDto, body: Partial<ResourceDto>) {
    try {
      const u = await patch<ResourceDto>(`/resources/${r.id}`, body);
      query.setData((p) => p && { ...p, items: p.items.map((x) => (x.id === u.id ? u : x)) });
    } catch (e) { toast.error((e as Error).message); }
  }
  async function remove() {
    if (!deleting) return;
    try { await del(`/resources/${deleting.id}`); toast.success("Resource deleted"); setDeleting(null); void query.reload(); void all.reload(); } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div>
      <PageHeader title="Resource Library" subtitle="Learning resources and external links. Availability, pricing and account requirements can change, so every field is editable."
        actions={<Button variant="primary" onClick={() => setEditing("new")}><Plus className="h-4 w-4" aria-hidden /> Add resource</Button>} />
      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input aria-label="Search resources" className="pl-9" placeholder="Search title or description..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select aria-label="Category" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}><option value="all">All categories</option>{categories.map((c) => <option key={c}>{c}</option>)}</Select>
          <Select aria-label="Type" value={f.resourceType} onChange={(e) => setF({ ...f, resourceType: e.target.value })}><option value="all">All types</option>{RESOURCE_TYPES.map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}</Select>
          <Select aria-label="Difficulty" value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value })}><option value="all">All difficulties</option>{DIFFICULTIES.map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}</Select>
          <Select aria-label="Status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="all">All statuses</option>{RESOURCE_STATUS.map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}</Select>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[hsl(var(--accent))]" checked={f.isFavourite === "true"} onChange={(e) => setF({ ...f, isFavourite: e.target.checked ? "true" : "all" })} /> Favourites only</label>
      </Card>

      <Async q={query}>{(d) => d.items.length === 0 ? (
        <EmptyState title={dq || Object.values(f).some((v) => v !== "all") ? "No resources match your filters" : "No resources yet"} description="Add a resource or clear the filters." action={<Button variant="primary" onClick={() => setEditing("new")}>Add resource</Button>} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">{d.items.map((r) => (
          <li key={r.id}><Card className="flex h-full flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <ExternalLink href={r.url} className="inline-flex items-center gap-1 font-semibold">{r.title} <LinkIcon className="h-3 w-3" aria-hidden /><span className="sr-only">(opens in a new tab)</span></ExternalLink>
                <div className="text-xs text-muted">{r.category}</div>
              </div>
              <Button size="icon" variant="ghost" aria-pressed={r.isFavourite} aria-label={r.isFavourite ? `Remove ${r.title} from favourites` : `Add ${r.title} to favourites`} onClick={() => void update(r, { isFavourite: !r.isFavourite })}>
                <Heart className={r.isFavourite ? "h-4 w-4 fill-danger text-danger" : "h-4 w-4"} />
              </Button>
            </div>
            <p className="text-sm text-muted">{r.description}</p>
            <div className="flex flex-wrap gap-1.5">
              <Badge tone={difficultyTone(r.difficulty)}>{titleCase(r.difficulty)}</Badge><Badge>{titleCase(r.resourceType)}</Badge>
              <Badge>{r.costStatus === "unknown" ? "Cost: unknown" : titleCase(r.costStatus)}</Badge>
              <Badge tone={relevanceTone(r.relevanceClassification)}>{RELEVANCE_LABEL[r.relevanceClassification]}</Badge>
              {r.tags.map((t) => <Badge key={t}>#{t}</Badge>)}
            </div>
            {r.personalNotes && <p className="rounded border border-border bg-surface-2 p-2 text-xs">{r.personalNotes}</p>}
            <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <label className="sr-only" htmlFor={`st-${r.id}`}>Status of {r.title}</label>
                <Select id={`st-${r.id}`} className="h-8 w-auto text-xs" value={r.status} onChange={(e) => void update(r, { status: e.target.value as ResourceDto["status"] })}>{RESOURCE_STATUS.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</Select>
                <Badge tone={statusTone(r.status)}>{titleCase(r.status)}</Badge>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" aria-label={`Edit ${r.title}`} onClick={() => setEditing(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" aria-label={`Delete ${r.title}`} onClick={() => setDeleting(r)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </Card></li>
        ))}</ul>
      )}</Async>

      {editing && <ResourceForm resource={editing === "new" ? null : editing} days={days.data?.items ?? []} categories={categories} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void query.reload(); void all.reload(); }} />}
      <ConfirmDialog open={!!deleting} title="Delete resource?" message={`"${deleting?.title}" will be deleted and unlinked from tasks and notes.`} onCancel={() => setDeleting(null)} onConfirm={remove} />
    </div>
  );
}

function ResourceForm({ resource, days, categories, onClose, onSaved }: { resource: ResourceDto | null; days: RoadmapDayDto[]; categories: string[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = React.useState(resource ? { ...resource, tags: resource.tags.join(", ") } : blank);
  const [errs, setErrs] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrs({});
    const body = { title: f.title, description: f.description, url: f.url, category: f.category, resourceType: f.resourceType, difficulty: f.difficulty, costStatus: f.costStatus, relevanceClassification: f.relevanceClassification, tags: parseTags(f.tags), linkedRoadmapDayIds: f.linkedRoadmapDayIds, personalNotes: f.personalNotes };
    try {
      if (resource) await patch(`/resources/${resource.id}`, body); else await post("/resources", body);
      toast.success(resource ? "Resource updated" : "Resource added");
      onSaved();
    } catch (er) { setErrs((er as ApiError).fields); toast.error((er as Error).message); } finally { setBusy(false); }
  }
  return (
    <Dialog open onClose={onClose} title={resource ? "Edit resource" : "Add resource"} wide>
      <form onSubmit={save} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title" error={errs.title}><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} autoFocus /></Field>
          <Field label="URL" error={errs.url} hint="https://..."><Input value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} inputMode="url" /></Field>
        </div>
        <Field label="Description" error={errs.description}><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Category" error={errs.category}><Input list="res-cats" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /><datalist id="res-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist></Field>
          <Field label="Type"><Select value={f.resourceType} onChange={(e) => setF({ ...f, resourceType: e.target.value })}>{RESOURCE_TYPES.map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}</Select></Field>
          <Field label="Difficulty"><Select value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value })}>{DIFFICULTIES.map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}</Select></Field>
          <Field label="Cost"><Select value={f.costStatus} onChange={(e) => setF({ ...f, costStatus: e.target.value })}>{COST_STATUS.map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}</Select></Field>
          <Field label="Exam relevance"><Select value={f.relevanceClassification} onChange={(e) => setF({ ...f, relevanceClassification: e.target.value })}>{RELEVANCE.map((c) => <option key={c} value={c}>{RELEVANCE_LABEL[c]}</option>)}</Select></Field>
          <Field label="Tags" hint="Comma separated"><Input value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} /></Field>
        </div>
        <Field label="Linked roadmap days" hint="Hold Ctrl/Cmd to select several"><Select multiple className="h-32" value={f.linkedRoadmapDayIds} onChange={(e) => setF({ ...f, linkedRoadmapDayIds: [...e.target.selectedOptions].map((o) => o.value) })}>{days.map((d) => <option key={d.id} value={d.id}>Day {d.dayNumber}: {d.title}</option>)}</Select></Field>
        <Field label="Personal notes"><Textarea value={f.personalNotes} onChange={(e) => setF({ ...f, personalNotes: e.target.value })} /></Field>
        <div className="flex justify-end gap-2"><Button onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" loading={busy}>{resource ? "Save changes" : "Add resource"}</Button></div>
      </form>
    </Dialog>
  );
}
