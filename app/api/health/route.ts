import { connectDb } from "@/lib/db/mongodb";
import { errorResponse, ok } from "@/lib/server/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDb();
    return ok({ status: "ok" });
  } catch (e) {
    return errorResponse(e);
  }
}
