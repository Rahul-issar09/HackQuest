import { NextResponse } from "next/server";
import { route } from "@/lib/server/api";
import { exportBackup } from "@/lib/server/backup";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const backup = await exportBackup();
  const stamp = backup.exportedAt.slice(0, 19).replace(/[:T]/g, "-");
  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="hackquest-prep-backup-${stamp}.json"`,
    },
  });
});
