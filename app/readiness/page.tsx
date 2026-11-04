"use client";
import { Async, Badge, Card, CardTitle, PageHeader, Progress } from "@/components/ui";
import { useApi } from "@/lib/client/api";
import type { Readiness } from "@/lib/analytics";
import Link from "next/link";

export default function ReadinessPage() {
  const q = useApi<{ readiness: Readiness; settings: { readinessWeights: Record<string, number> } }>("/analytics");
  return (
    <div>
      <PageHeader title="Readiness Score" subtitle="Personal preparation readiness - a self-tracking indicator based on your own activity. It is not an official TCS assessment and not a qualification probability." />
      <Async q={q}>{({ readiness: r, settings }) => (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted">Personal preparation readiness</div>
                <div className="text-6xl font-bold tabular-nums">{r.score === null ? "n/a" : `${r.score}%`}</div>
                <div className="text-sm text-muted">{r.score === null ? "No evidence recorded yet" : `Based on components covering ${Math.round(r.evidenceWeight * 100)}% of the total weight`}</div>
              </div>
              <div className="min-w-[220px] flex-1">
                <Progress value={r.score ?? 0} label="Personal preparation readiness" tone="success" />
                {r.evidenceWeight < 1 && <p className="mt-2 text-sm text-warning">Some components have no evidence yet, so they are excluded rather than counted as zero. The score will shift as you add attempts, mocks and reports.</p>}
                <p className="mt-2 text-xs text-muted">Even a high score does not predict how you will do in Round 1.</p>
              </div>
            </div>
          </Card>
          <Card>
            <CardTitle action={<Link href="/settings" className="text-sm text-accent hover:underline">Adjust weights</Link>}>Component breakdown</CardTitle>
            <div className="overflow-x-auto"><table className="w-full text-left text-sm">
              <caption className="sr-only">Readiness components</caption>
              <thead className="text-xs text-muted"><tr><th scope="col" className="py-1 pr-3">Component</th><th scope="col" className="pr-3">Weight</th><th scope="col" className="pr-3">Value</th><th scope="col" className="pr-3">Contribution</th><th scope="col">Evidence</th></tr></thead>
              <tbody>{r.components.map((c) => {
                const total = r.components.filter((x) => x.value !== null).reduce((s, x) => s + x.weight, 0);
                return (
                  <tr key={c.key} className="border-t border-border align-top">
                    <th scope="row" className="py-2 pr-3 font-normal">{c.label}</th>
                    <td className="pr-3">{c.weight}</td>
                    <td className="pr-3">{c.value === null ? <Badge>Not assessed</Badge> : `${Math.round(c.value * 100)}%`}</td>
                    <td className="pr-3">{c.value === null || total === 0 ? "-" : `${((c.value * c.weight / total) * 100).toFixed(1)} pts`}</td>
                    <td className="text-muted">{c.detail}</td>
                  </tr>
                );
              })}</tbody>
            </table></div>
          </Card>
          <Card>
            <CardTitle>Formula</CardTitle>
            <p className="text-sm">{r.formula}</p>
            <p className="mt-2 text-sm text-muted">Current weights: learning {settings.readinessWeights.learning}, CTF performance {settings.readinessWeights.ctf}, domain coverage {settings.readinessWeights.coverage}, mock performance {settings.readinessWeights.mock}, reporting {settings.readinessWeights.reporting}. Defaults are 15 / 35 / 15 / 25 / 10.</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
              <li>Learning completion: completed / non-skipped roadmap tasks.</li>
              <li>CTF performance: solved counted attempts / counted attempts.</li>
              <li>Domain coverage: configured domains with at least one attempt / all configured domains.</li>
              <li>Mock performance: average personal score of completed mocks (your configured points, or solved/total). Mocks affect only this component.</li>
              <li>Reporting: solved challenges that have a linked practice report / solved challenges.</li>
            </ul>
          </Card>
        </div>
      )}</Async>
    </div>
  );
}
