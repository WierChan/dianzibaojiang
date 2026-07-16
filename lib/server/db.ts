import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";

/**
 * SQLite handle (synchronous — ideal for route handlers). Cached on globalThis
 * so Next's dev module reloads don't reopen / lock the file repeatedly.
 */
const DB_PATH = process.env.PATINA_DB ?? join(process.cwd(), "data", "patina.db");

const PRESET_SEED: ReadonlyArray<[string, string, string]> = [
  ["classic", "互联网经典", "泛用型网络老化:反复压缩、缩放、加噪"],
  ["qq2008", "QQ 2008", "蓝调、狠压缩、过度锐化、CRT 柔光"],
  ["tieba", "百度贴吧", "经典变绿、色度崩坏、锐化光边、反复压缩"],
  ["wechat", "微信转发", "640px、压缩、轻糊、截图痕迹、褪色"],
  ["screenshotception", "截图套截图", "被反复截图,状态栏残影与漂移"],
  ["screenphoto", "手机屏摄", "拿手机拍屏幕:透视、失焦、真摩尔纹、眩光、传感器噪点"],
  ["survivor", "互联网活化石", "所有算法轮番上阵,十五年包浆"],
];

function open(): Database.Database {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      email         TEXT,
      nickname      TEXT,
      avatar_url    TEXT,
      created_at    TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS presets (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      preset_key  TEXT NOT NULL UNIQUE,
      name        TEXT NOT NULL,
      description TEXT,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      enabled     INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS generations (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      preset_key     TEXT NOT NULL,
      intensity      INTEGER NOT NULL,
      seed           TEXT,
      watermark      TEXT,
      resize         INTEGER NOT NULL DEFAULT 1,
      original_name  TEXT,
      result_file    TEXT NOT NULL,
      result_width   INTEGER,
      result_height  INTEGER,
      age_years      REAL,
      age_uploads    INTEGER,
      age_screenshots INTEGER,
      age_compressions INTEGER,
      is_public      INTEGER NOT NULL DEFAULT 0,
      title          TEXT,
      published_at   TEXT,
      created_at     TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS likes (
      generation_id INTEGER NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at    TEXT NOT NULL,
      PRIMARY KEY (generation_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_gen_user ON generations(user_id);
    CREATE INDEX IF NOT EXISTS idx_gen_public ON generations(is_public, published_at);
  `);

  const seed = db.prepare(
    `INSERT INTO presets (preset_key, name, description, sort_order)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(preset_key) DO UPDATE SET name = excluded.name, description = excluded.description, sort_order = excluded.sort_order`,
  );
  PRESET_SEED.forEach(([key, name, desc], i) => seed.run(key, name, desc, i));
  return db;
}

const g = globalThis as unknown as { __patinaDb?: Database.Database };
export const db: Database.Database = g.__patinaDb ?? (g.__patinaDb = open());
