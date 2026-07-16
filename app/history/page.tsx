"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ShareButton } from "@/components/ShareButton";
import {
  apiDeleteGeneration,
  apiListGenerations,
  apiPublishGeneration,
  apiUnpublishGeneration,
} from "@/lib/api/generations";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthContext";
import type { GenerationVO } from "@/lib/api/types";

const PAGE_SIZE = 12;

export default function HistoryPage() {
  const { user, ready } = useAuth();
  const [items, setItems] = useState<GenerationVO[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiListGenerations(p, PAGE_SIZE);
      setItems(res.records);
      setTotal(res.total);
      setPage(res.page);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready && user) void load(1);
  }, [ready, user, load]);

  const updateItem = (g: GenerationVO) =>
    setItems((prev) => prev.map((it) => (it.id === g.id ? g : it)));

  const togglePublish = async (g: GenerationVO) => {
    try {
      if (g.isPublic) {
        updateItem(await apiUnpublishGeneration(g.id));
      } else {
        const title = window.prompt("给作品起个标题(可选,直接确定即可)", g.title ?? "");
        if (title === null) return; // 取消
        updateItem(await apiPublishGeneration(g.id, title));
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "操作失败");
    }
  };

  const remove = async (id: number) => {
    try {
      await apiDeleteGeneration(id);
      // 删除后重新加载当前页(若当前页空了则回退一页)
      const nextTotal = total - 1;
      const lastPage = Math.max(1, Math.ceil(nextTotal / PAGE_SIZE));
      void load(Math.min(page, lastPage));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "删除失败");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">我的历史</h1>
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← 回到生成器
        </Link>
      </div>

      {ready && !user && (
        <p className="text-sm text-neutral-500">请先在右上角登录后查看你的历史记录。</p>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {user && !loading && items.length === 0 && !error && (
        <p className="text-sm text-neutral-500">
          还没有保存过。去 <Link href="/" className="underline">生成器</Link> 做一张,点「保存到我的历史」吧。
        </p>
      )}

      {loading && <p className="text-sm text-neutral-400">加载中…</p>}

      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {items.map((g) => (
            <div key={g.id} className="flex flex-col gap-2 rounded-lg border border-neutral-100 p-2">
              <div className="relative aspect-square w-full overflow-hidden rounded bg-neutral-50">
                {g.resultUrl ? (
                  // R2 图片来自外部域名;用普通 img 避免 next/image 域名白名单配置
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={g.resultUrl}
                    alt={g.presetKey}
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-neutral-400">
                    无图
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span>
                  {g.presetKey} · {g.intensity}
                </span>
                {g.ageYears != null && <span>{g.ageYears} 年</span>}
              </div>
              <div className="flex items-center justify-between">
                <span className="truncate text-[11px] text-neutral-400" title={g.seed ?? ""}>
                  {g.resultWidth}×{g.resultHeight}
                </span>
                <button
                  type="button"
                  onClick={() => remove(g.id)}
                  className="text-[11px] text-red-400 hover:text-red-600"
                >
                  删除
                </button>
              </div>
              <div className="flex items-center justify-between border-t border-neutral-100 pt-2">
                {g.isPublic ? (
                  <>
                    <span className="text-[11px] text-emerald-600">
                      已发布 · ♥{g.likeCount ?? 0}
                    </span>
                    <div className="flex items-center gap-2">
                      <ShareButton id={g.id} className="text-[11px] text-neutral-400 hover:text-neutral-700" />
                      <button
                        type="button"
                        onClick={() => togglePublish(g)}
                        className="text-[11px] text-neutral-400 hover:text-neutral-700"
                      >
                        撤下
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => togglePublish(g)}
                    className="text-[11px] text-blue-500 hover:text-blue-700"
                  >
                    发布到广场
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {user && total > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-4 pt-2 text-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => void load(page - 1)}
          >
            上一页
          </Button>
          <span className="text-neutral-500">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => void load(page + 1)}
          >
            下一页
          </Button>
        </div>
      )}
    </main>
  );
}
