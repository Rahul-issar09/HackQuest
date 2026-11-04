"use client";
import * as React from "react";
import { Play, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { api, patch, post } from "@/lib/client/api";
import { formatClock } from "@/lib/mock/timer";
import type { ListResult, StudySessionDto } from "@/lib/types";

/** Study session stopwatch. The running session is stored in MongoDB (endedAt = null) so it survives reloads. */
export function StudyTimer({ dayId, onChanged }: { dayId?: string | null; onChanged?: () => void }) {
  const [active, setActive] = React.useState<StudySessionDto | null>(null);
  const [now, setNow] = React.useState(() => Date.now());
  const [busy, setBusy] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    api<ListResult<StudySessionDto>>("/studySessions?limit=5")
      .then((r) => setActive(r.items.find((s) => s.endedAt === null) ?? null))
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);
  React.useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);

  async function start() {
    setBusy(true);
    try {
      setActive(await post<StudySessionDto>("/studySessions", { startedAt: new Date().toISOString(), linkedRoadmapDayId: dayId ?? null }));
      toast.success("Study session started");
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function stop() {
    if (!active) return;
    setBusy(true);
    try {
      const end = new Date();
      const minutes = Math.max(1, Math.round((end.getTime() - Date.parse(active.startedAt)) / 60000));
      await patch(`/studySessions/${active.id}`, { endedAt: end.toISOString(), durationMinutes: minutes });
      setActive(null);
      toast.success(`Study session saved: ${minutes} min`);
      onChanged?.();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  if (!ready) return null;
  return active ? (
    <div className="flex items-center gap-3">
      <span className="font-mono text-lg tabular-nums" aria-live="off">{formatClock(now - Date.parse(active.startedAt))}</span>
      <Button variant="danger" loading={busy} onClick={() => void stop()}><Square className="h-4 w-4" aria-hidden /> Stop session</Button>
    </div>
  ) : (
    <Button variant="primary" loading={busy} onClick={() => void start()}><Play className="h-4 w-4" aria-hidden /> Start study session</Button>
  );
}
