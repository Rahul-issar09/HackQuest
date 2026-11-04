export type FormatKind =
  | "h1" | "h2" | "h3" | "bold" | "italic" | "code" | "codeblock" | "ul" | "ol" | "check" | "quote" | "link" | "table";

export interface Edit { text: string; start: number; end: number }

/** Pure Markdown formatting helper: applies `kind` to the selection [start, end] of `text`. */
export function applyFormat(kind: FormatKind, text: string, start: number, end: number): Edit {
  const sel = text.slice(start, end);
  const before = text.slice(0, start);
  const after = text.slice(end);

  const wrap = (l: string, r: string, placeholder: string): Edit => {
    const body = sel || placeholder;
    return { text: before + l + body + r + after, start: start + l.length, end: start + l.length + body.length };
  };
  const linePrefix = (prefix: (i: number) => string, placeholder: string): Edit => {
    const lineStart = before.lastIndexOf("\n") + 1;
    const block = text.slice(lineStart, end) || placeholder;
    const lines = block.split("\n").map((l, i) => prefix(i) + l);
    const out = lines.join("\n");
    return { text: text.slice(0, lineStart) + out + after, start: lineStart, end: lineStart + out.length };
  };

  switch (kind) {
    case "h1": return linePrefix(() => "# ", "Heading");
    case "h2": return linePrefix(() => "## ", "Heading");
    case "h3": return linePrefix(() => "### ", "Heading");
    case "bold": return wrap("**", "**", "bold text");
    case "italic": return wrap("_", "_", "italic text");
    case "code": return wrap("`", "`", "code");
    case "codeblock": {
      const lead = before && !before.endsWith("\n") ? "\n" : "";
      const body = sel || "command here";
      const l = `${lead}\`\`\`bash\n`;
      return { text: before + l + body + "\n```\n" + after, start: start + l.length, end: start + l.length + body.length };
    }
    case "ul": return linePrefix(() => "- ", "List item");
    case "ol": return linePrefix((i) => `${i + 1}. `, "List item");
    case "check": return linePrefix(() => "- [ ] ", "Task");
    case "quote": return linePrefix(() => "> ", "Quote");
    case "link": {
      const label = sel || "link text";
      const ins = `[${label}](https://)`;
      const s = start + label.length + 3;
      return { text: before + ins + after, start: s, end: s + 8 };
    }
    case "table": {
      const tbl = "\n| Column A | Column B |\n| --- | --- |\n| value | value |\n";
      return { text: before + tbl + after, start: start + 3, end: start + 11 };
    }
  }
}
