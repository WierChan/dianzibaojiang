import { request } from "./client";
import type { PresetVO } from "./types";

/** 公开接口:拉取启用的预设列表(前端下拉数据来源,替代硬编码)。 */
export function apiListPresets(): Promise<PresetVO[]> {
  return request<PresetVO[]>("/api/presets");
}
