import { HttpError, ok, readJson, route } from "@/lib/server/api";
import { getOne, isCrudKey, remove, update } from "@/lib/server/repository";

export const dynamic = "force-dynamic";
type P = { collection: string; id: string };

function key(c: string) {
  if (!isCrudKey(c)) throw new HttpError(404, "Unknown collection");
  return c;
}

export const GET = route<P>(async (_req, { collection, id }) => ok(await getOne(key(collection), id)));
export const PATCH = route<P>(async (req, { collection, id }) => ok(await update(key(collection), id, await readJson(req))));
export const DELETE = route<P>(async (_req, { collection, id }) => {
  await remove(key(collection), id);
  return ok({ deleted: true });
});
