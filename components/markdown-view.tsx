"use client";
import * as React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";

/**
 * Safe Markdown renderer. Raw HTML in the source is NOT parsed (react-markdown ignores it by default), and the
 * resulting tree is additionally passed through rehype-sanitize. Syntax highlighting runs after sanitizing.
 */
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ["className", /^language-[\w-]+$/]],
  },
  protocols: { ...defaultSchema.protocols, href: ["http", "https", "mailto"], src: ["http", "https"] },
};

const components: Components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow">{children}</a>
  ),
  // Only allow images served by this app (attachments) or over https; no data: or javascript: URLs.
  // eslint-disable-next-line @next/next/no-img-element
  img: ({ src, alt }) => (typeof src === "string" ? <img src={src} alt={alt ?? ""} loading="lazy" /> : null),
};

function MarkdownViewBase({ source }: { source: string }) {
  if (!source.trim()) return <p className="text-sm text-muted">Nothing to preview yet.</p>;
  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeSanitize, schema], [rehypeHighlight, { detect: false, ignoreMissing: true }]]} components={components}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
export const MarkdownView = React.memo(MarkdownViewBase);
