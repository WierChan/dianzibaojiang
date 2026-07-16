import { db } from "@/lib/server/db";
import { getUser } from "@/lib/server/auth";
import { ok } from "@/lib/server/respond";
import { mapGallery, type GalleryRow } from "@/lib/server/vo";
import type { GalleryVO, PageResult } from "@/lib/api/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = getUser(req); // optional — used only for likedByMe
  const uid = user?.id ?? 0;

  const { searchParams } = new URL(req.url);
  const sort = searchParams.get("sort") === "hot" ? "hot" : "new";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const size = Math.min(50, Math.max(1, parseInt(searchParams.get("size") ?? "12", 10) || 12));

  const orderBy =
    sort === "hot" ? "like_count DESC, g.published_at DESC" : "g.published_at DESC, g.id DESC";

  const total = (
    db.prepare("SELECT COUNT(*) AS c FROM generations WHERE is_public = 1").get() as { c: number }
  ).c;

  const rows = db
    .prepare(
      `SELECT g.id, g.preset_key, g.intensity, g.title, g.result_file, g.result_width,
              g.result_height, g.age_years, g.published_at,
              COALESCE(u.nickname, u.username) AS author_name,
              (SELECT COUNT(*) FROM likes l WHERE l.generation_id = g.id) AS like_count,
              EXISTS(SELECT 1 FROM likes l2 WHERE l2.generation_id = g.id AND l2.user_id = ?) AS liked
       FROM generations g JOIN users u ON u.id = g.user_id
       WHERE g.is_public = 1
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
    )
    .all(uid, size, (page - 1) * size) as GalleryRow[];

  const data: PageResult<GalleryVO> = { total, page, size, records: rows.map(mapGallery) };
  return ok(data);
}
