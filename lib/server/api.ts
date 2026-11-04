import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ConfigError, connectDb } from "../db/mongodb";
import { ensureSeeded } from "./seed";

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(err: unknown) {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message, details: err.details }, { status: err.status });
  }
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) fields[issue.path.join(".") || "_"] = issue.message;
    return NextResponse.json({ error: "Validation failed", details: fields }, { status: 422 });
  }
  if (err instanceof ConfigError) {
    return NextResponse.json({ error: err.message, code: "DB_UNAVAILABLE" }, { status: 503 });
  }
  const name = (err as { name?: string })?.name;
  if (name === "CastError" || name === "ValidationError") {
    return NextResponse.json({ error: "Invalid data", details: (err as Error).message }, { status: 400 });
  }
  if ((err as { code?: number })?.code === 11000) {
    return NextResponse.json({ error: "A record with that unique value already exists" }, { status: 409 });
  }
  console.error("API error:", (err as Error)?.message);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

type Ctx<P> = { params: Promise<P> };

/** Wraps a route handler: connects to Mongo, ensures one-time seed, converts errors to JSON. */
export function route<P = Record<string, string>>(
  handler: (req: Request, params: P) => Promise<Response>,
  opts: { seed?: boolean } = {},
) {
  return async (req: Request, ctx: Ctx<P>) => {
    try {
      await connectDb();
      if (opts.seed !== false) await ensureSeeded();
      return await handler(req, await ctx.params);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export async function readJson(req: Request, maxBytes = 2_000_000): Promise<unknown> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > maxBytes) throw new HttpError(413, "Request body too large");
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Body must be valid JSON");
  }
}
