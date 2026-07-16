import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { db } from "./db";

const SECRET =
  process.env.AUTH_SECRET ?? "patina-dev-secret-change-me-in-production";
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface UserRow {
  id: number;
  username: string;
  email: string | null;
  nickname: string | null;
  avatar_url: string | null;
  created_at: string;
}

const b64url = (buf: Buffer): string =>
  buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64urlJson = (obj: unknown): string => b64url(Buffer.from(JSON.stringify(obj)));

/* ------------------------------------------------------------- passwords */

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/* ------------------------------------------------------------- jwt (HS256) */

export function signToken(userId: number): string {
  const header = b64urlJson({ alg: "HS256", typ: "JWT" });
  const payload = b64urlJson({ sub: userId, exp: Date.now() + TOKEN_TTL_MS });
  const sig = b64url(createHmac("sha256", SECRET).update(`${header}.${payload}`).digest());
  return `${header}.${payload}.${sig}`;
}

function verifyToken(token: string): number | null {
  const [header, payload, sig] = token.split(".");
  if (!header || !payload || !sig) return null;
  const expected = b64url(createHmac("sha256", SECRET).update(`${header}.${payload}`).digest());
  // constant-time compare
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64").toString()) as { sub: number; exp: number };
    if (!data.exp || data.exp < Date.now()) return null;
    return data.sub;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------- request → user */

/** Resolve the caller from the Bearer token, or null if absent/invalid. */
export function getUser(req: Request): UserRow | null {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const userId = verifyToken(auth.slice(7));
  if (userId == null) return null;
  const row = db
    .prepare("SELECT id, username, email, nickname, avatar_url, created_at FROM users WHERE id = ?")
    .get(userId) as UserRow | undefined;
  return row ?? null;
}
