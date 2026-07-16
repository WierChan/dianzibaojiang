import { db } from "@/lib/server/db";
import { hashPassword, signToken, type UserRow } from "@/lib/server/auth";
import { fail, ok } from "@/lib/server/respond";
import { mapUser } from "@/lib/server/vo";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { username?: string; password?: string; email?: string; nickname?: string };
  try {
    body = await req.json();
  } catch {
    return fail("请求格式错误");
  }
  const username = body.username?.trim();
  const password = body.password ?? "";
  if (!username || username.length < 2) return fail("用户名至少 2 个字符");
  if (password.length < 6) return fail("密码至少 6 位");

  const exists = db.prepare("SELECT 1 FROM users WHERE username = ?").get(username);
  if (exists) return fail("用户名已被占用");

  const now = new Date().toISOString();
  const info = db
    .prepare(
      "INSERT INTO users (username, password_hash, email, nickname, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(username, hashPassword(password), body.email?.trim() || null, body.nickname?.trim() || null, now);

  const user = db
    .prepare("SELECT id, username, email, nickname, avatar_url, created_at FROM users WHERE id = ?")
    .get(info.lastInsertRowid) as UserRow;

  return ok({ token: signToken(user.id), user: mapUser(user) });
}
