import type { ApiResult } from "./types";

const BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:7010").replace(
  /\/+$/,
  "",
);

const TOKEN_KEY = "patina_token";

export class ApiError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
    this.name = "ApiError";
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

type Options = {
  method?: string;
  /** JSON body — 与 form 互斥 */
  body?: unknown;
  /** FormData(文件上传)— 与 body 互斥,不设置 Content-Type */
  form?: FormData;
  /** 需要携带 JWT */
  auth?: boolean;
  query?: Record<string, string | number | undefined>;
};

/** 统一请求:自动带 token、解包 {code,message,data}、非 0 抛 ApiError。 */
export async function request<T>(path: string, opts: Options = {}): Promise<T> {
  const { method = "GET", body, form, auth = false, query } = opts;

  let url = `${BASE_URL}${path}`;
  if (query) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) qs.append(k, String(v));
    }
    const s = qs.toString();
    if (s) url += `?${s}`;
  }

  const headers: Record<string, string> = {};
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let payload: BodyInit | undefined;
  if (form) {
    payload = form; // 浏览器自动带 multipart boundary
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(url, { method, headers, body: payload });
  } catch {
    throw new ApiError(-1, "无法连接后端服务,请确认后端已启动");
  }

  if (res.status === 401) {
    setToken(null);
    throw new ApiError(401, "未登录或登录已过期");
  }

  let json: ApiResult<T>;
  try {
    json = (await res.json()) as ApiResult<T>;
  } catch {
    throw new ApiError(res.status, `请求失败 (${res.status})`);
  }

  if (json.code !== 0) {
    throw new ApiError(json.code, json.message || "请求失败");
  }
  return json.data;
}
