"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Plus, Search, ShieldCheck, Swords, X } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { daysUntil } from "@/lib/dates";
import { DISCLAIMER } from "@/lib/constants";
import { NAV } from "./nav";
import { SettingsProvider, useSettings } from "./settings-context";
import { ErrorBoundary } from "./error-boundary";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link key={href} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined}
            className={cn("flex min-h-[2.5rem] items-center gap-3 rounded-lg px-3 text-sm transition",
              active ? "bg-accent/15 font-medium text-accent" : "text-muted hover:bg-surface-2 hover:text-fg")}>
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 px-3 py-2 font-bold tracking-tight">
      <ShieldCheck className="h-5 w-5 text-accent" aria-hidden /> HackQuest Prep
    </Link>
  );
}

function Countdown() {
  const { data } = useSettings();
  if (!data) return null;
  const n = daysUntil(data.examDate);
  const text = n > 0 ? `${n} day${n === 1 ? "" : "s"} to Round 1` : n === 0 ? "Round 1 is today" : `Round 1 date passed ${-n}d ago`;
  return <span className="hidden rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted sm:inline" title="Your configured exam date (Settings)">{text}</span>;
}

function TopSearch() {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  return (
    <form role="search" onSubmit={(e) => { e.preventDefault(); if (q.trim()) router.push(`/notes?q=${encodeURIComponent(q.trim())}`); }} className="relative hidden md:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
      <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search notes" placeholder="Search notes..."
        className="h-9 w-56 rounded-lg border border-border bg-surface pl-9 pr-3 text-sm placeholder:text-muted/70" />
    </form>
  );
}

function Inner({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const path = usePathname();
  React.useEffect(() => setOpen(false), [path]);
  const current = NAV.find((n) => (n.href === "/" ? path === "/" : path.startsWith(n.href)));
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-fg">Skip to content</a>
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-border bg-surface lg:flex">
        <Brand />
        <div className="flex-1 overflow-y-auto px-3 py-2"><NavLinks /></div>
        <p className="border-t border-border p-3 text-[11px] leading-snug text-muted">{DISCLAIMER}</p>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} aria-hidden />
          <aside role="dialog" aria-modal="true" aria-label="Navigation" className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-surface shadow-xl">
            <div className="flex items-center justify-between pr-2"><Brand />
              <Button variant="ghost" size="icon" aria-label="Close navigation" onClick={() => setOpen(false)}><X className="h-5 w-5" /></Button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2"><NavLinks onNavigate={() => setOpen(false)} /></div>
            <p className="border-t border-border p-3 text-[11px] text-muted">{DISCLAIMER}</p>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-bg/90 px-4 backdrop-blur">
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" aria-expanded={open} onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></Button>
          <div className="min-w-0 flex-1 truncate text-sm font-semibold">{current?.label ?? "HackQuest Prep"}</div>
          <TopSearch />
          <Countdown />
          <Link href="/notes?new=1" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-sm hover:border-accent/60"><Plus className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">Note</span><span className="sr-only sm:hidden">New note</span></Link>
          <Link href="/challenges?log=1" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-medium text-accent-fg hover:opacity-90"><Swords className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">Log challenge</span><span className="sr-only sm:hidden">Log challenge</span></Link>
        </header>
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <Inner>{children}</Inner>
    </SettingsProvider>
  );
}
