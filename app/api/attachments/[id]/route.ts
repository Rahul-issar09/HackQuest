import { Attachment, Note } from "@/lib/db/models";
import { HttpError, ok, route } from "@/lib/server/api";
import { deleteGridFile, readGridFile } from "@/lib/server/gridfs";
import { zId } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export const GET = route<{ id: string }>(async (_req, { id }) => {
  zId.parse(id);
  const att = await Attachment.findById(id).lean();
  if (!att) throw new HttpError(404, "Not found");
  const bytes = await readGridFile(att.gridFsId);
  const inline = att.mimeType.startsWith("image/");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": att.mimeType,
      "Content-Length": String(bytes.length),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(att.fileName)}"`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "Cache-Control": "private, max-age=3600",
    },
  });
});

export const DELETE = route<{ id: string }>(async (_req, { id }) => {
  zId.parse(id);
  const att = await Attachment.findById(id).lean();
  if (!att) throw new HttpError(404, "Not found");
  await deleteGridFile(att.gridFsId);
  await Note.updateMany({}, { $pull: { attachmentIds: att._id } });
  await Attachment.deleteOne({ _id: att._id });
  return ok({ deleted: true });
});
