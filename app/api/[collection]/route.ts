import { HttpError, ok, readJson, route } from "@/lib/server/api";
import { create, isCrudKey, list } from "@/lib/server/repository";

export const dynamic = "force-dynamic";

export const GET = route<{ collection: string }>(async (req, { collection }) => {
  if (!isCrudKey(collection)) throw new HttpError(404, "Unknown collection");
  return ok(await list(collection, new URL(req.url).searchParams));
});

export const POST = route<{ collection: string }>(async (req, { collection }) => {
  if (!isCrudKey(collection)) throw new HttpError(404, "Unknown collection");
  return ok(await create(collection, await readJson(req)), 201);
});
