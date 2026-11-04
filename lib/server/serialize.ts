import "server-only";
import { Types } from "mongoose";

/**
 * Serialization convention: ObjectIds -> hex strings, BSON Dates -> ISO strings, `_id` -> `id`.
 * Raw Mongoose documents never leave the server.
 */
export function toDto<T = Record<string, unknown>>(value: unknown): T {
  return walk(value) as T;
}

function walk(v: unknown): unknown {
  if (v === null || v === undefined) return v ?? null;
  if (v instanceof Types.ObjectId) return v.toString();
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(walk);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof (o as { toHexString?: unknown }).toHexString === "function") return String(v);
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(o)) {
      if (k === "__v") continue;
      out[k === "_id" ? "id" : k] = walk(val);
    }
    return out;
  }
  return v;
}
