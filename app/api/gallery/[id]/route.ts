import { db } from "@/lib/server/db";
import { getUser } from "@/lib/server/auth";
import { fail, ok } from "@/lib/server/respond";
import { mapGallery, type GalleryRow } from "@/lib/server/vo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUser(req)?.id ?? 0;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return fail("无效的 id");

  const row = db
    .prepare(
      `SELECT g.id, g.preset_key, g.intensity, g.title, g.result_file, g.result_width,
              g.result_height, g.age_years, g.published_at,
              COALESCE(u.nickname, u.username) AS author_name,
              (SELECT COUNT(*) FROM likes l WHERE l.generation_id = g.id) AS like_count,
              EXISTS(SELECT 1 FROM likes l2 WHERE l2.generation_id = g.id AND l2.user_id = ?) AS liked
       FROM generations g JOIN users u ON u.id = g.user_id
       WHERE g.id = ? AND g.is_public = 1`,
    )
    .get(uid, id) as GalleryRow | undefined;

  if (!row) return fail("作品不存在或未公开");
  return ok(mapGallery(row));
}
