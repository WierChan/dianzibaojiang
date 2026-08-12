/**
 * 后端 API 封装(patina-server)。
 *
 * 预设列表、互联网年龄、全站统计均来自后端,前端不内置这些数据;
 * 后端不可用时抛出 ApiError,由界面显示明确错误,不做本地兜底。
 *
 * 基地址:开发环境 .env.development 指向 http://localhost:7010,
 * 生产构建留空 = 同域相对路径 /api,由 Nginx 反代到后端。
 */

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export class ApiError extends Error {
  readonly code?: number;
  constructor(message: string, code?: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

interface ApiResult<T> {
  code: number;
  message: string;
  data: T;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, init);
  } catch {
    throw new ApiError("无法连接后端服务,请确认 patina-server 已启动");
  }
  let body: ApiResult<T>;
  try {
    body = (await res.json()) as ApiResult<T>;
  } catch {
    throw new ApiError(`后端响应异常(HTTP ${res.status})`);
  }
  if (body.code !== 0) {
    throw new ApiError(body.message || "后端返回错误", body.code);
  }
  return body.data;
}

/* ------------------------------------------------------------- presets */

export interface PresetInfo {
  /** 前端算法键,对应 lib/effects/pipelines.ts 的 PresetId。 */
  presetKey: string;
  name: string;
  description: string;
  sortOrder: number;
}

export function fetchPresets(): Promise<PresetInfo[]> {
  return request<PresetInfo[]>("/api/presets");
}

/* --------------------------------------------------------- generations */

/** 与 AgeCard 展示对应的互联网年龄统计(服务端按预设基数 + 种子计算)。 */
export interface AgeStats {
  years: number;
  uploads: number;
  screenshots: number;
  compressions: number;
}

export interface GenerationReport {
  presetKey: string;
  intensity: number;
  seed: string;
  watermark?: string;
  resize: boolean;
  originalName?: string;
  srcWidth?: number;
  srcHeight?: number;
  resultWidth?: number;
  resultHeight?: number;
  durationMs?: number;
}

export interface GenerationRecord {
  id: string;
  ageStats: AgeStats;
}

interface GenerationVO {
  id: string;
  ageYears: number;
  ageUploads: number;
  ageScreenshots: number;
  ageCompressions: number;
}

/** 上报一次生成,返回服务端计算的互联网年龄。 */
export async function reportGeneration(report: GenerationReport): Promise<GenerationRecord> {
  const vo = await request<GenerationVO>("/api/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report),
  });
  return {
    id: vo.id,
    ageStats: {
      years: vo.ageYears,
      uploads: vo.ageUploads,
      screenshots: vo.ageScreenshots,
      compressions: vo.ageCompressions,
    },
  };
}

/* --------------------------------------------------------------- stats */

export interface StatsSummary {
  totalGenerations: number;
  todayGenerations: number;
  presetCounts: { presetKey: string; name: string; count: number }[];
}

export function fetchStatsSummary(): Promise<StatsSummary> {
  return request<StatsSummary>("/api/stats/summary");
}
