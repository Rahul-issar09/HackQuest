import "server-only";
import { Types } from "mongoose";
import { z } from "zod";
import { SCHEMA_VERSION, SEED_VERSION } from "../constants";
import { MODELS, type CollectionName } from "../db/models";
import { SCHEMAS, zId } from "../validation/schemas";
import { HttpError } from "./api";
import { toDto } from "./serialize";

/** Backup order matters for import (parents before children). */
export const BACKUP_COLLECTIONS: CollectionName[] = [
  "settings", "roadmapDays", "resources", "learningTasks", "challenges", "mockSessions", "challengeAttempts",
  "mockChallengeResults", "noteFolders", "notes", "attachments", "practiceReports", "studySessions", "revisionItems",
];

/** Extra stored-only fields that SCHEMAS don't list (so they survive a round trip). Everything else is stripped. */
const envelope = z.object({
  app: z.literal("hackquest-prep"),
  schemaVersion: z.number().int().min(1).max(SCHEMA_VERSION),
  exportedAt: z.string(),
  data: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
});

export async function exportBackup() {
  const data: Record<string, unknown[]> = {};
  for (const name of BACKUP_COLLECTIONS) {
    data[name] = toDto<unknown[]>(await (MODELS[name] as unknown as import("mongoose").Model<unknown>).find().lean());
  }
  return {
    app: "hackquest-prep", schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(),
    note: "Attachment metadata is included; attachment file bytes (GridFS) are NOT included in this JSON backup.",
    data,
  };
}

export interface ImportReport {
  counts: Record<string, { valid: number; invalid: number }>;
  errors: string[];
  fatal?: string;
}

const REF_FIELDS = /Id$|Ids$/;

/** Validate every record with Zod (without writing). Returns cleaned records per collection. */
export function validateBackup(raw: unknown) {
  const report: ImportReport = { counts: {}, errors: [] };
  const parsed = envelope.safeParse(raw);
  if (!parsed.success) {
    report.fatal = "Not a valid HackQuest Prep backup (wrong app marker, schemaVersion, or structure). " + parsed.error.issues[0]?.message;
    return { report, clean: null };
  }
  const clean: Record<string, { id: string; doc: Record<string, unknown> }[]> = {};
  for (const name of BACKUP_COLLECTIONS) {
    const rows = parsed.data.data[name] ?? [];
    clean[name] = [];
    report.counts[name] = { valid: 0, invalid: 0 };
    for (const [i, row] of rows.entries()) {
      const idCheck = zId.safeParse(row.id);
      const extras: Record<string, unknown> = {};
      for (const k of ["dayNumber", "originalDate", "seedVersion", "key", "retryDate", "retryPriority", "retryDismissed", "gridFsId"]) {
        if (k in row) extras[k] = row[k];
      }
      const schema = (SCHEMAS[name] as unknown as z.ZodObject).partial();
      const r = schema.safeParse({ ...row, ...extras });
      if (!idCheck.success || !r.success) {
        report.counts[name].invalid++;
        if (report.errors.length < 25) {
          report.errors.push(`${name}[${i}]: ${!idCheck.success ? "missing/invalid id" : r.error?.issues[0]?.path.join(".") + " - " + r.error?.issues[0]?.message}`);
        }
        continue;
      }
      report.counts[name].valid++;
      clean[name].push({ id: row.id as string, doc: { ...(r.data as Record<string, unknown>), ...(name === "settings" ? { key: "singleton" } : {}) } });
    }
  }
  return { report, clean };
}

function castRefs(doc: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc)) {
    if (REF_FIELDS.test(k) && k !== "gridFsId") {
      if (Array.isArray(v)) out[k] = v.map((x) => new Types.ObjectId(String(x)));
      else out[k] = v ? new Types.ObjectId(String(v)) : null;
    } else if (k === "gridFsId" && v) out[k] = new Types.ObjectId(String(v));
    else out[k] = v;
  }
  return out;
}

export async function importBackup(raw: unknown, mode: "merge" | "replace", dryRun: boolean) {
  const { report, clean } = validateBackup(raw);
  if (report.fatal || !clean) return { report, applied: false };
  if (dryRun) return { report, applied: false };
  const invalid = Object.values(report.counts).reduce((s, c) => s + c.invalid, 0);
  if (invalid > 0) throw new HttpError(422, "Backup contains invalid records; nothing was imported.", report);

  if (mode === "replace") {
    for (const name of BACKUP_COLLECTIONS) {
      if (name === "settings" && !clean.settings.length) continue; // never leave the app without settings
      await (MODELS[name] as unknown as import("mongoose").Model<unknown>).deleteMany({});
    }
  }
  for (const name of BACKUP_COLLECTIONS) {
    const model = MODELS[name] as unknown as import("mongoose").Model<Record<string, unknown>>;
    if (!clean[name].length) continue;
    if (name === "settings") {
      if (mode === "merge") continue; // keep current settings when merging
      // seedVersion is pinned so the first-launch seed never runs on top of restored data
      await model.create({ ...castRefs(clean[name][0].doc), key: "singleton", seedVersion: SEED_VERSION, schemaVersion: SCHEMA_VERSION });
      continue;
    }
    const ops = clean[name].map(({ id, doc }) => ({
      updateOne: { filter: { _id: new Types.ObjectId(id) }, update: { $set: castRefs(doc) }, upsert: true },
    }));
    await model.bulkWrite(ops);
  }
  return { report, applied: true };
}
