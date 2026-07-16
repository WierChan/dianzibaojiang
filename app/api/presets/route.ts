import { db } from "@/lib/server/db";
import { ok } from "@/lib/server/respond";
import type { PresetVO } from "@/lib/api/types";

export const runtime = "nodejs";

interface PresetRow {
  id: number;
  preset_key: string;
  name: string;
  description: string | null;
  sort_order: number;
  enabled: number;
}

export async function GET() {
  const rows = db
    .prepare("SELECT * FROM presets WHERE enabled = 1 ORDER BY sort_order")
    .all() as PresetRow[];
  const data: PresetVO[] = rows.map((r) => ({
    id: r.id,
    presetKey: r.preset_key,
    name: r.name,
    description: r.description,
    sortOrder: r.sort_order,
    enabled: r.enabled,
  }));
  return ok(data);
}
