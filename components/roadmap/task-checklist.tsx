"use client";
import * as React from "react";
import { toast } from "sonner";
import { Badge, Checkbox, statusTone } from "@/components/ui";
import { patch } from "@/lib/client/api";
import { minutesLabel, titleCase } from "@/lib/utils";
import type { LearningTaskDto } from "@/lib/types";

/** Task checklist: toggling persists immediately; failures revert and toast. */
export function TaskChecklist({ tasks, onChanged }: { tasks: LearningTaskDto[]; onChanged: (t: LearningTaskDto) => void }) {
  const [busy, setBusy] = React.useState<string | null>(null);
  async function toggle(t: LearningTaskDto, done: boolean) {
    setBusy(t.id);
    const completedAt = done ? new Date().toISOString() : null;
    onChanged({ ...t, status: done ? "completed" : "todo", completedAt }); // optimistic
    try {
      const updated = await patch<LearningTaskDto>(`/learningTasks/${t.id}`, { status: done ? "completed" : "todo", completedAt });
      onChanged(updated);
    } catch (e) {
      onChanged(t); // revert
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  async function skip(t: LearningTaskDto) {
    setBusy(t.id);
    try {
      onChanged(await patch<LearningTaskDto>(`/learningTasks/${t.id}`, { status: t.status === "skipped" ? "todo" : "skipped", completedAt: null }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  return (
    <ul className="divide-y divide-border">
      {tasks.map((t) => (
        <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
          <Checkbox checked={t.status === "completed"} disabled={busy === t.id} onChange={(v) => void toggle(t, v)}
            label={`${t.title}`} />
          <div className="flex items-center gap-2">
            <Badge>{titleCase(t.taskType)}</Badge>
            <span className="text-xs text-muted">{minutesLabel(t.estimatedMinutes)}</span>
            {t.status === "skipped" && <Badge tone={statusTone("skipped")}>Skipped</Badge>}
            <button className="text-xs text-muted underline hover:text-fg" disabled={busy === t.id} onClick={() => void skip(t)}>
              {t.status === "skipped" ? "Unskip" : "Skip"}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
