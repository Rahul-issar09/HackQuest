import { NextResponse } from "next/server";
import { Note, NoteFolder } from "@/lib/db/models";
import { route } from "@/lib/server/api";
import { noteToMarkdown } from "@/lib/export/markdown";

export const dynamic = "force-dynamic";

/** Export all notes as a single Markdown document (each note has a front-matter-style header). */
export const GET = route(async () => {
  const [notes, folders] = await Promise.all([Note.find().sort({ updatedAt: -1 }).lean(), NoteFolder.find().lean()]);
  const fname = new Map(folders.map((f) => [String(f._id), f.name]));
  const md = notes
    .map((n) => noteToMarkdown({ title: n.title, body: n.markdownBody, tags: n.tags, folder: n.folderId ? fname.get(String(n.folderId)) ?? "" : "", updatedAt: n.updatedAt?.toISOString() ?? "" }))
    .join("\n\n---\n\n");
  return new NextResponse(md || "# My Notes\n\n(no notes yet)\n", {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": 'attachment; filename="hackquest-notes.md"' },
  });
});
