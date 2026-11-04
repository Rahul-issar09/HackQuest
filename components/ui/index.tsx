"use client";
import * as React from "react";
import { AlertTriangle, Inbox, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/client/api";

/* ---------- Button ---------- */
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "icon";
  loading?: boolean;
};
export const Button = React.forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { className, variant = "secondary", size = "md", loading, disabled, children, type = "button", ...p }, ref,
) {
  const v = {
    primary: "bg-accent text-accent-fg hover:opacity-90 font-medium",
    secondary: "bg-surface-2 border border-border hover:border-accent/60",
    ghost: "hover:bg-surface-2",
    danger: "bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25",
  }[variant];
  const s = { sm: "h-8 px-3 text-sm", md: "h-10 px-4 text-sm", icon: "h-10 w-10" }[size];
  return (
    <button ref={ref} type={type} disabled={disabled || loading}
      className={cn("inline-flex items-center justify-center gap-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed min-w-[2.5rem]", v, s, className)} {...p}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

/* ---------- Card ---------- */
export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-card border border-border bg-surface p-4 sm:p-5", className)} {...p} />;
}
export function CardTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{children}</h2>
      {action}
    </div>
  );
}

/* ---------- Badge ---------- */
const tones = {
  neutral: "bg-surface-2 text-muted border-border",
  accent: "bg-accent/15 text-accent border-accent/40",
  success: "bg-success/15 text-success border-success/40",
  warning: "bg-warning/15 text-warning border-warning/40",
  danger: "bg-danger/15 text-danger border-danger/40",
};
export function Badge({ tone = "neutral", className, children, ...p }: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap", tones[tone], className)} {...p}>{children}</span>;
}
export const difficultyTone = (d: string) => (d === "beginner" ? "success" : d === "intermediate" ? "warning" : d === "expert" ? "danger" : "neutral") as keyof typeof tones;
export const statusTone = (s: string) =>
  (({ solved: "success", completed: "success", failed: "danger", attempted: "warning", in_progress: "warning", skipped: "neutral", todo: "neutral", not_started: "neutral", active: "accent", planned: "neutral", abandoned: "danger" }) as Record<string, keyof typeof tones>)[s] ?? "neutral";
export const relevanceTone = (r: string) => (r === "official_round1" ? "accent" : r === "later_round" ? "warning" : "neutral") as keyof typeof tones;

/* ---------- Form fields ---------- */
const inputCls = "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm placeholder:text-muted/70 focus:border-accent disabled:opacity-60";
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn(inputCls, "h-10", className)} {...p} />;
});
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} className={cn(inputCls, "min-h-[90px] resize-y", className)} {...p} />;
});
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...p }, ref) {
  return <select ref={ref} className={cn(inputCls, "h-10", className)} {...p} />;
});
export function Field({ label, error, hint, children, className }: { label: string; error?: string; hint?: string; children: React.ReactNode; className?: string }) {
  const id = React.useId();
  const child = React.isValidElement(children) ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, { id, "aria-invalid": !!error || undefined, "aria-describedby": error ? `${id}-e` : undefined }) : children;
  return (
    <div className={cn("space-y-1", className)}>
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      {child}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p id={`${id}-e`} role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  );
}

/* ---------- Dialog ---------- */
export function Dialog({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  const ref = React.useRef<HTMLDialogElement>(null);
  React.useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} onCancel={onClose}
      className={cn("m-auto w-[calc(100%-2rem)] rounded-card border border-border bg-surface p-0 text-fg backdrop:bg-black/60", wide ? "max-w-3xl" : "max-w-lg")}>
      {open && (
        <div className="max-h-[85vh] overflow-y-auto p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold">{title}</h2>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close dialog"><X className="h-4 w-4" /></Button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Delete", requireText, onConfirm, onCancel, busy }: {
  open: boolean; title: string; message: React.ReactNode; confirmLabel?: string; requireText?: string;
  onConfirm: () => void | Promise<void>; onCancel: () => void; busy?: boolean;
}) {
  const [typed, setTyped] = React.useState("");
  React.useEffect(() => { if (!open) setTyped(""); }, [open]);
  const blocked = !!requireText && typed !== requireText;
  return (
    <Dialog open={open} onClose={onCancel} title={title}>
      <div className="space-y-4">
        <div className="text-sm text-muted">{message}</div>
        {requireText && (
          <Field label={`Type "${requireText}" to confirm`}><Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" /></Field>
        )}
        <div className="flex justify-end gap-2">
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="danger" disabled={blocked} loading={busy} onClick={() => void onConfirm()}>{confirmLabel}</Button>
        </div>
      </div>
    </Dialog>
  );
}

/* ---------- States ---------- */
export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-border px-4 py-10 text-center">
      <div className="text-muted">{icon ?? <Inbox className="h-8 w-8" aria-hidden />}</div>
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
export function ErrorState({ error, onRetry }: { error: Error | ApiError | string; onRetry?: () => void }) {
  const msg = typeof error === "string" ? error : error.message;
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-card border border-danger/40 bg-danger/10 p-4">
      <div className="flex items-center gap-2 font-medium text-danger"><AlertTriangle className="h-4 w-4" aria-hidden /> Something went wrong</div>
      <p className="text-sm">{msg}</p>
      {onRetry && <Button size="sm" onClick={onRetry}>Retry</Button>}
    </div>
  );
}
export function Loading({ label = "Loading..." }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2 py-10 text-sm text-muted justify-center">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {label}
    </div>
  );
}
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-surface-2", className)} aria-hidden />;
}

/** Renders loading / error / content for a useApi query. */
export function Async<T>({ q, children }: { q: { data: T | null; error: Error | null; loading: boolean; reload: () => Promise<void> }; children: (d: T) => React.ReactNode }) {
  if (q.loading && !q.data) return <Loading />;
  if (q.error && !q.data) return <ErrorState error={q.error} onRetry={() => void q.reload()} />;
  if (!q.data) return null;
  return <>{children(q.data)}</>;
}

/* ---------- Misc ---------- */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Progress({ value, label, tone = "accent" }: { value: number; label: string; tone?: "accent" | "success" }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)} className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <div className={cn("h-full rounded-full transition-all", tone === "success" ? "bg-success" : "bg-accent")} style={{ width: `${v}%` }} />
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {hint && <div className="text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function Checkbox({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className="flex min-h-[2.25rem] cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--accent))]" />
      <span>{label}</span>
    </label>
  );
}

export function ExternalLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return <a href={href} target="_blank" rel="noopener noreferrer nofollow" className={cn("text-accent underline-offset-2 hover:underline", className)}>{children}</a>;
}
