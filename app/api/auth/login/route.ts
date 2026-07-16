import { db } from "@/lib/server/db";
import { signToken, verifyPassword, type UserRow } from "@/lib/server/auth";
import { fail, ok } from "@/lib/server/respond";
import { mapUser } from "@/lib/server/vo";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return fail("请求格式错误");
  }
  const username = body.username?.trim();
  const password = body.password ?? "";
  if (!username || !password) return fail("请输入用户名和密码");

  const row = db
    .prepare(
      "SELECT id, username, email, nickname, avatar_url, created_at, password_hash FROM users WHERE username = ?",
    )
    .get(username) as (UserRow & { password_hash: string }) | undefined;

  if (!row || !verifyPassword(password, row.password_hash)) {
    return fail("用户名或密码错误");
  }
  return ok({ token: signToken(row.id), user: mapUser(row) });
}
