import { request } from "./client";
import type { GenerationVO, PageResult } from "./types";

export interface CreateGenerationPayload {
  presetKey: string;
  intensity: number;
  seed?: string;
  watermark?: string;
  resize: boolean;
  originalName?: string;
  resultWidth?: number;
  resultHeight?: number;
  ageYears?: number;
  ageUploads?: number;
  ageScreenshots?: number;
  ageCompressions?: number;
}

/** 保存一条生成记录:成品图 blob + 元数据一起以 multipart 提交,后端上传 R2。 */
export function apiCreateGeneration(
  payload: CreateGenerationPayload,
  file: Blob,
  fileName: string,
): Promise<GenerationVO> {
  const form = new FormData();
  form.append("file", file, fileName);
  for (const [k, v] of Object.entries(payload)) {
    if (v !== undefined && v !== null && v !== "") form.append(k, String(v));
  }
  return request<GenerationVO>("/api/generations", { method: "POST", form, auth: true });
}

export function apiListGenerations(page = 1, size = 12): Promise<PageResult<GenerationVO>> {
  return request<PageResult<GenerationVO>>("/api/generations", {
    auth: true,
    query: { page, size },
  });
}

export function apiDeleteGeneration(id: number): Promise<void> {
  return request<void>(`/api/generations/${id}`, { method: "DELETE", auth: true });
}

/** 发布到作品广场。 */
export function apiPublishGeneration(id: number, title?: string): Promise<GenerationVO> {
  return request<GenerationVO>(`/api/generations/${id}/publish`, {
    method: "POST",
    auth: true,
    body: { title: title ?? "" },
  });
}

/** 从作品广场撤下。 */
export function apiUnpublishGeneration(id: number): Promise<GenerationVO> {
  return request<GenerationVO>(`/api/generations/${id}/unpublish`, {
    method: "POST",
    auth: true,
  });
}
