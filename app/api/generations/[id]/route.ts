import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@/lib/server/db";
import { getUser } from "@/lib/server/auth";
import { fail, ok, unauthorized } from "@/lib/server/respond";

export const runtime = "nodejs";

const UPLOAD_DIR = process.env.PATINA_UPLOADS ?? join(process.cwd(), "data", "uploads");

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return fail("无效的 id");

  const row = db
    .prepare("SELECT result_file FROM generations WHERE id = ? AND user_id = ?")
    .get(id, user.id) as { result_file: string } | undefined;
  if (!row) return fail("记录不存在");

  db.prepare("DELETE FROM generations WHERE id = ? AND user_id = ?").run(id, user.id);
  void unlink(join(UPLOAD_DIR, row.result_file)).catch(() => {}); // best-effort file cleanup
  return ok(null);
}
