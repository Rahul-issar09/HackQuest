"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export class ApiError extends Error {
  constructor(message: string, public status: number, public details?: unknown) {
    super(message);
  }
  /** Field errors from Zod validation (422). */
  get fields(): Record<string, string> {
    return this.status === 422 && this.details && typeof this.details === "object" ? (this.details as Record<string, string>) : {};
  }
}

export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const headers: Record<string, string> = {};
  let body = init?.body;
  if (init?.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.json);
  }
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { ...init, headers: { ...headers, ...(init?.headers as object) }, body, cache: "no-store" });
  } catch {
    throw new ApiError("Cannot reach the server. Check your connection and that the app is running.", 0);
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON */
  }
  if (!res.ok) {
    const d = data as { error?: string; details?: unknown } | null;
    throw new ApiError(d?.error ?? `Request failed (${res.status})`, res.status, d?.details);
  }
  return data as T;
}

export const post = <T,>(path: string, json: unknown) => api<T>(path, { method: "POST", json });
export const patch = <T,>(path: string, json: unknown) => api<T>(path, { method: "PATCH", json });
export const del = <T = { deleted: boolean }>(path: string) => api<T>(path, { method: "DELETE" });

export function qs(params: Record<string, string | number | boolean | null | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "" && v !== "all") sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export interface Query<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  reload: () => Promise<void>;
  setData: (updater: (prev: T | null) => T | null) => void;
}

/** Minimal data hook: loading / error / reload. Pass null as path to skip. */
export function useApi<T>(path: string | null): Query<T> {
  const [data, setDataState] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (path === null) return;
    const mine = ++seq.current;
    try {
      const d = await api<T>(path);
      if (mine === seq.current) {
        setDataState(d);
        setError(null);
      }
    } catch (e) {
      if (mine === seq.current) setError(e as ApiError);
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    setLoading(path !== null);
    void load();
  }, [path, load]);

  return { data, error, loading, reload: load, setData: (u) => setDataState((p) => u(p)) };
}
