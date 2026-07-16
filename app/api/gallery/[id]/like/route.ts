import { db } from "@/lib/server/db";
import { getUser } from "@/lib/server/auth";
import { fail, ok, unauthorized } from "@/lib/server/respond";

export const runtime = "nodejs";

const countLikes = (id: number): number =>
  (db.prepare("SELECT COUNT(*) AS c FROM likes WHERE generation_id = ?").get(id) as { c: number }).c;

async function resolve(req: Request, params: Promise<{ id: string }>) {
  const user = getUser(req);
  if (!user) return { error: unauthorized() as Response };
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return { error: fail("无效的 id") };
  const pub = db.prepare("SELECT 1 FROM generations WHERE id = ? AND is_public = 1").get(id);
  if (!pub) return { error: fail("作品不存在或未公开") };
  return { user, id };
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await resolve(req, params);
  if ("error" in r) return r.error;
  db.prepare(
    "INSERT OR IGNORE INTO likes (generation_id, user_id, created_at) VALUES (?, ?, ?)",
  ).run(r.id, r.user.id, new Date().toISOString());
  return ok(countLikes(r.id));
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await resolve(req, params);
  if ("error" in r) return r.error;
  db.prepare("DELETE FROM likes WHERE generation_id = ? AND user_id = ?").run(r.id, r.user.id);
  return ok(countLikes(r.id));
}
