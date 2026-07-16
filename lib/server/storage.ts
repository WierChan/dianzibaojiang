import { mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";

const UPLOAD_DIR = process.env.PATINA_UPLOADS ?? join(process.cwd(), "data", "uploads");

/** Persist an uploaded blob as a JPEG; returns the opaque filename. */
export async function saveUpload(file: Blob): Promise<string> {
  mkdirSync(UPLOAD_DIR, { recursive: true });
  const name = `${randomUUID()}.jpg`;
  await writeFile(join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return name;
}

/** Public URL the frontend uses as an <img src> (served by /api/files). */
export function fileUrl(name: string): string {
  return `/api/files/${name}`;
}

/** Read a stored file by name, rejecting anything that isn't a plain filename. */
export async function readUpload(name: string): Promise<Buffer | null> {
  if (!/^[A-Za-z0-9._-]+$/.test(name)) return null; // no path traversal
  try {
    return await readFile(join(UPLOAD_DIR, name));
  } catch {
    return null;
  }
}
