import "server-only";
import mongoose, { Types } from "mongoose";
import { Readable } from "node:stream";

/** Attachment storage strategy: file bytes live in MongoDB GridFS (bucket "attachments");
 *  metadata lives in the `attachments` collection. */
function bucket() {
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database not connected");
  return new mongoose.mongo.GridFSBucket(db, { bucketName: "attachments" });
}

export async function putGridFile(fileName: string, mimeType: string, data: Buffer): Promise<Types.ObjectId> {
  const stream = bucket().openUploadStream(fileName, { metadata: { mimeType } });
  await new Promise<void>((resolve, reject) => {
    Readable.from(data).pipe(stream).on("error", reject).on("finish", () => resolve());
  });
  return stream.id as Types.ObjectId;
}

export async function readGridFile(id: Types.ObjectId | string): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const stream = bucket().openDownloadStream(new Types.ObjectId(String(id)));
  for await (const c of stream) chunks.push(c as Buffer);
  return Buffer.concat(chunks);
}

export async function deleteGridFile(id: Types.ObjectId | string): Promise<void> {
  try {
    await bucket().delete(new Types.ObjectId(String(id)));
  } catch {
    /* already gone */
  }
}
