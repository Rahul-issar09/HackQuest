export interface TimerState {
  status: "planned" | "active" | "completed" | "abandoned";
  durationMinutes: number;
  startedAt: string | null;
  pausedAt: string | null;
  pausedTotalMs: number;
  endedAt: string | null;
}

/** Remaining milliseconds, derived purely from persisted timestamps (never from an in-memory counter). */
export function remainingMs(t: TimerState, now: number = Date.now()): number {
  const total = t.durationMinutes * 60_000;
  if (!t.startedAt) return total;
  const start = Date.parse(t.startedAt);
  const end = t.endedAt ? Date.parse(t.endedAt) : t.pausedAt ? Date.parse(t.pausedAt) : now;
  const elapsed = Math.max(0, end - start - t.pausedTotalMs);
  return Math.max(0, total - elapsed);
}

export function elapsedMs(t: TimerState, now: number = Date.now()): number {
  return t.durationMinutes * 60_000 - remainingMs(t, now);
}

export const isPaused = (t: TimerState) => t.status === "active" && !!t.pausedAt;
export const isExpired = (t: TimerState, now: number = Date.now()) => t.status === "active" && !t.pausedAt && remainingMs(t, now) === 0;

export function formatClock(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
}

export type TimerAction = "start" | "pause" | "resume" | "finish" | "discard";

/** State transition used by the API (server clock). Returns the patch to persist. */
export function applyAction(t: TimerState, action: TimerAction, now: Date = new Date()): Partial<TimerState> {
  const iso = now.toISOString();
  switch (action) {
    case "start":
      if (t.status !== "planned") throw new Error("Only a planned mock can be started");
      return { status: "active", startedAt: iso, pausedAt: null, pausedTotalMs: 0, endedAt: null };
    case "pause":
      if (t.status !== "active" || t.pausedAt) throw new Error("Mock is not running");
      return { pausedAt: iso };
    case "resume":
      if (t.status !== "active" || !t.pausedAt) throw new Error("Mock is not paused");
      return { pausedAt: null, pausedTotalMs: t.pausedTotalMs + (now.getTime() - Date.parse(t.pausedAt)) };
    case "finish":
      if (t.status !== "active") throw new Error("Mock is not active");
      return { status: "completed", endedAt: t.pausedAt ?? iso, pausedAt: null };
    case "discard":
      if (t.status !== "active") throw new Error("Mock is not active");
      return { status: "abandoned", endedAt: iso, pausedAt: null };
  }
}
