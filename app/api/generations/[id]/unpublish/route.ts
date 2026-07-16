import { db } from "@/lib/server/db";
import { getUser } from "@/lib/server/auth";
import { fail, ok, unauthorized } from "@/lib/server/respond";
import { mapGeneration, type GenerationRow } from "@/lib/server/vo";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return fail("无效的 id");

  const res = db
    .prepare("UPDATE generations SET is_public = 0, published_at = NULL WHERE id = ? AND user_id = ?")
    .run(id, user.id);
  if (res.changes === 0) return fail("记录不存在");

  const row = db
    .prepare(
      `SELECT g.*, (SELECT COUNT(*) FROM likes l WHERE l.generation_id = g.id) AS like_count
       FROM generations g WHERE g.id = ?`,
    )
    .get(id) as GenerationRow;
  return ok(mapGeneration(row));
}
