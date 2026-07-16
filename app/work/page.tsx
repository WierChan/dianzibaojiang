"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { GalleryLikeButton } from "@/components/GalleryLikeButton";
import { ShareButton } from "@/components/ShareButton";
import { apiGalleryDetail } from "@/lib/api/gallery";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthContext";
import type { GalleryVO } from "@/lib/api/types";

function WorkContent() {
  const params = useSearchParams();
  const idStr = params.get("id");
  const id = idStr ? Number(idStr) : NaN;
  const { ready } = useAuth();

  const [work, setWork] = useState<GalleryVO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!idStr || Number.isNaN(id)) {
      setError("链接无效");
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    apiGalleryDetail(id)
      .then((w) => alive && setWork(w))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : "加载失败"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [ready, id, idStr]);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col gap-5 px-6 py-10">
      <div className="flex items-center justify-between">
        <Link href="/gallery" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← 作品广场
        </Link>
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900">
          去做一张 →
        </Link>
      </div>

      {loading && <p className="text-sm text-neutral-400">加载中…</p>}
      {error && !loading && <p className="text-sm text-red-500">{error}</p>}

      {work && (
        <>
          <div className="overflow-hidden rounded-lg border border-neutral-100 bg-neutral-50">
            {work.resultUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={work.resultUrl} alt={work.title ?? work.presetKey} className="mx-auto max-h-[70vh] w-auto object-contain" />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-lg font-semibold tracking-tight">
              {work.title || <span className="text-neutral-400">未命名作品</span>}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
              <span>作者 {work.authorName}</span>
              <span>·</span>
              <span>预设 {work.presetKey}</span>
              <span>·</span>
              <span>强度 {work.intensity}</span>
              {work.ageYears != null && (
                <>
                  <span>·</span>
                  <span>{work.ageYears} 年包浆</span>
                </>
              )}
              {work.resultWidth && work.resultHeight && (
                <>
                  <span>·</span>
                  <span>{work.resultWidth}×{work.resultHeight}px</span>
                </>
              )}
            </div>
            <div className="mt-1 flex items-center gap-4">
              <GalleryLikeButton id={work.id} initialLiked={work.likedByMe} initialCount={work.likeCount} />
              <ShareButton id={work.id} />
            </div>
          </div>
        </>
      )}
    </main>
  );
}

export default function WorkPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-2xl px-6 py-10 text-sm text-neutral-400">加载中…</main>}>
      <WorkContent />
    </Suspense>
  );
}
