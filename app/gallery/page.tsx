"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { GalleryLikeButton } from "@/components/GalleryLikeButton";
import { ShareButton } from "@/components/ShareButton";
import { Button } from "@/components/ui/button";
import { apiListGallery, type GallerySort } from "@/lib/api/gallery";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthContext";
import type { GalleryVO } from "@/lib/api/types";

const PAGE_SIZE = 12;

export default function GalleryPage() {
  const { ready } = useAuth();
  const [items, setItems] = useState<GalleryVO[]>([]);
  const [sort, setSort] = useState<GallerySort>("new");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (s: GallerySort, p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiListGallery(s, p, PAGE_SIZE);
      setItems(res.records);
      setTotal(res.total);
      setPage(res.page);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  // 等 auth 就绪再拉,保证带上 token 以返回 likedByMe
  useEffect(() => {
    if (ready) void load(sort, 1);
  }, [ready, sort, load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">作品广场</h1>
        <div className="flex items-center gap-1 text-sm">
          <button
            type="button"
            onClick={() => setSort("new")}
            className={sort === "new" ? "font-medium text-neutral-900" : "text-neutral-400 hover:text-neutral-700"}
          >
            最新
          </button>
          <span className="text-neutral-300">/</span>
          <button
            type="button"
            onClick={() => setSort("hot")}
            className={sort === "hot" ? "font-medium text-neutral-900" : "text-neutral-400 hover:text-neutral-700"}
          >
            最热
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {loading && <p className="text-sm text-neutral-400">加载中…</p>}
      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-neutral-500">
          广场还空着。去 <Link href="/" className="underline">生成器</Link> 做一张,在「我的历史」里发布到广场吧。
        </p>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {items.map((g) => (
            <div key={g.id} className="flex flex-col gap-2 rounded-lg border border-neutral-100 p-2">
              <Link href={`/work?id=${g.id}`} className="relative block aspect-square w-full overflow-hidden rounded bg-neutral-50">
                {g.resultUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.resultUrl} alt={g.title ?? g.presetKey} className="h-full w-full object-contain" loading="lazy" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-neutral-400">无图</div>
                )}
              </Link>
              <div className="min-h-[1rem] truncate text-xs text-neutral-700" title={g.title ?? ""}>
                {g.title || <span className="text-neutral-400">未命名</span>}
              </div>
              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                <span className="truncate">{g.authorName} · {g.presetKey}</span>
              </div>
              <div className="flex items-center justify-between">
                <GalleryLikeButton id={g.id} initialLiked={g.likedByMe} initialCount={g.likeCount} />
                <ShareButton id={g.id} />
              </div>
            </div>
          ))}
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-4 pt-2 text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => void load(sort, page - 1)}>
            上一页
          </Button>
          <span className="text-neutral-500">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => void load(sort, page + 1)}>
            下一页
          </Button>
        </div>
      )}
    </main>
  );
}
