import { db } from "@/lib/server/db";
import { getUser } from "@/lib/server/auth";
import { fail, ok, unauthorized } from "@/lib/server/respond";
import { saveUpload } from "@/lib/server/storage";
import { mapGeneration, type GenerationRow } from "@/lib/server/vo";
import type { PageResult, GenerationVO } from "@/lib/api/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIKE_COUNT = "(SELECT COUNT(*) FROM likes l WHERE l.generation_id = g.id) AS like_count";

export async function GET(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const size = Math.min(50, Math.max(1, parseInt(searchParams.get("size") ?? "12", 10) || 12));

  const total = (
    db.prepare("SELECT COUNT(*) AS c FROM generations WHERE user_id = ?").get(user.id) as { c: number }
  ).c;
  const rows = db
    .prepare(
      `SELECT g.*, ${LIKE_COUNT} FROM generations g
       WHERE g.user_id = ? ORDER BY g.created_at DESC, g.id DESC LIMIT ? OFFSET ?`,
    )
    .all(user.id, size, (page - 1) * size) as GenerationRow[];

  const data: PageResult<GenerationVO> = { total, page, size, records: rows.map(mapGeneration) };
  return ok(data);
}

export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("请求格式错误");
  }
  const file = form.get("file");
  if (!(file instanceof Blob)) return fail("缺少成品图");
  const presetKey = form.get("presetKey");
  if (typeof presetKey !== "string" || !presetKey) return fail("缺少预设");

  const str = (k: string): string | null => {
    const v = form.get(k);
    return typeof v === "string" && v !== "" ? v : null;
  };
  const num = (k: string): number | null => {
    const v = str(k);
    return v == null ? null : Number(v);
  };

  const resultFile = await saveUpload(file);
  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO generations
        (user_id, preset_key, intensity, seed, watermark, resize, original_name,
         result_file, result_width, result_height,
         age_years, age_uploads, age_screenshots, age_compressions, created_at)
       VALUES (@user_id, @preset_key, @intensity, @seed, @watermark, @resize, @original_name,
         @result_file, @result_width, @result_height,
         @age_years, @age_uploads, @age_screenshots, @age_compressions, @created_at)`,
    )
    .run({
      user_id: user.id,
      preset_key: presetKey,
      intensity: num("intensity") ?? 0,
      seed: str("seed"),
      watermark: str("watermark"),
      resize: str("resize") === "false" ? 0 : 1,
      original_name: str("originalName"),
      result_file: resultFile,
      result_width: num("resultWidth"),
      result_height: num("resultHeight"),
      age_years: num("ageYears"),
      age_uploads: num("ageUploads"),
      age_screenshots: num("ageScreenshots"),
      age_compressions: num("ageCompressions"),
      created_at: now,
    });

  const row = db
    .prepare(`SELECT g.*, 0 AS like_count FROM generations g WHERE g.id = ?`)
    .get(info.lastInsertRowid) as GenerationRow;
  return ok(mapGeneration(row));
}
