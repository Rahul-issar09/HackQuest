import { Attachment, Note } from "@/lib/db/models";
import { ALLOWED_ATTACHMENT_TYPES, MAX_ATTACHMENT_BYTES } from "@/lib/constants";
import { HttpError, ok, route } from "@/lib/server/api";
import { putGridFile } from "@/lib/server/gridfs";
import { toDto } from "@/lib/server/serialize";
import { zId } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  const noteId = new URL(req.url).searchParams.get("noteId");
  const filter = noteId ? { noteId: zId.parse(noteId) } : {};
  return ok({ items: toDto(await Attachment.find(filter).sort({ createdAt: -1 }).limit(200).lean()) });
});

/** multipart/form-data: file + noteId. Stored in GridFS; metadata in `attachments`. */
export const POST = route(async (req) => {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const noteId = zId.parse(String(form?.get("noteId") ?? ""));
  if (!(file instanceof File)) throw new HttpError(400, "A file is required");
  if (file.size === 0) throw new HttpError(422, "File is empty");
  if (file.size > MAX_ATTACHMENT_BYTES) throw new HttpError(413, `File too large (max ${MAX_ATTACHMENT_BYTES / 1024 / 1024} MB)`);
  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    throw new HttpError(415, `File type "${file.type || "unknown"}" is not allowed. Allowed: ${ALLOWED_ATTACHMENT_TYPES.join(", ")}`);
  }
  const note = await Note.findById(noteId).select("_id").lean();
  if (!note) throw new HttpError(404, "Note not found");
  const safeName = file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 200) || "file";
  const gridFsId = await putGridFile(safeName, file.type, Buffer.from(await file.arrayBuffer()));
  const att = await Attachment.create({ noteId, fileName: safeName, mimeType: file.type, sizeBytes: file.size, gridFsId });
  await Note.updateOne({ _id: noteId }, { $addToSet: { attachmentIds: att._id } });
  return ok(toDto(att.toObject()), 201);
});
