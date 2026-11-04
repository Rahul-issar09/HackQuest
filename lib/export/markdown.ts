export interface NoteExport {
  title: string; body: string; tags: string[]; folder: string; updatedAt: string;
}

export function noteToMarkdown(n: NoteExport): string {
  const meta = [
    n.folder && `Folder: ${n.folder}`,
    n.tags.length && `Tags: ${n.tags.join(", ")}`,
    n.updatedAt && `Updated: ${n.updatedAt}`,
  ].filter(Boolean);
  return [`# ${n.title || "Untitled note"}`, meta.length ? `> ${meta.join(" | ")}` : "", n.body].filter((x) => x !== "").join("\n\n");
}

export interface ReportExport {
  title: string; category: string; difficulty: string; challenge: string; objective: string; initialObservations: string;
  toolsUsed: string[]; methodologyMarkdown: string; findings: string; flagRetrievalExplanation: string;
  evidenceNotes: string; conclusion: string;
}

const NOTICE =
  "> **Practice report.** For the actual contest, use the current official TCS-provided report template, size limit and submission instructions. This is a preparation template only.";

export function reportToMarkdown(r: ReportExport): string {
  const sec = (h: string, v: string) => `## ${h}\n\n${v.trim() || "_Not filled in._"}`;
  return [
    `# ${r.title}`,
    NOTICE,
    `**Challenge:** ${r.challenge || "-"}  \n**Category:** ${r.category || "-"}  \n**Difficulty:** ${r.difficulty || "-"}`,
    sec("Objective / problem statement", r.objective),
    sec("Initial observations", r.initialObservations),
    sec("Tools and commands", r.toolsUsed.length ? r.toolsUsed.map((t) => `- \`${t}\``).join("\n") : ""),
    sec("Step-by-step methodology", r.methodologyMarkdown),
    sec("Finding / weakness", r.findings),
    sec("Flag retrieval explanation", r.flagRetrievalExplanation),
    sec("Evidence (screenshots with timestamps)", r.evidenceNotes),
    sec("Conclusion", r.conclusion),
  ].join("\n\n") + "\n";
}

export function slug(s: string) {
  return (s || "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "untitled";
}

export function downloadText(filename: string, text: string, type = "text/markdown") {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
