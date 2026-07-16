import { getUser } from "@/lib/server/auth";
import { ok, unauthorized } from "@/lib/server/respond";
import { mapUser } from "@/lib/server/vo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  return ok(mapUser(user));
}
