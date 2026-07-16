/** {code, message, data} envelope the frontend `request()` helper expects. */

export function ok<T>(data: T): Response {
  return Response.json({ code: 0, message: "ok", data });
}

/** Business error: HTTP 200 with a non-zero code → client throws ApiError. */
export function fail(message: string, code = 1): Response {
  return Response.json({ code, message, data: null });
}

/** Auth failure: HTTP 401 → client clears the stored token. */
export function unauthorized(message = "未登录或登录已过期"): Response {
  return Response.json({ code: 401, message, data: null }, { status: 401 });
}
