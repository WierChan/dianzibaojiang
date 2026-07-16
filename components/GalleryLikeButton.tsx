"use client";

import { useState } from "react";
import { AuthDialog } from "@/components/AuthDialog";
import { apiLike, apiUnlike } from "@/lib/api/gallery";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthContext";

interface GalleryLikeButtonProps {
  id: number;
  initialLiked: boolean;
  initialCount: number;
}

export function GalleryLikeButton({ id, initialLiked, initialCount }: GalleryLikeButtonProps) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const toggle = async () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    if (busy) return;
    setBusy(true);
    // 乐观更新
    const prevLiked = liked;
    const prevCount = count;
    setLiked(!prevLiked);
    setCount(prevCount + (prevLiked ? -1 : 1));
    try {
      const newCount = prevLiked ? await apiUnlike(id) : await apiLike(id);
      setCount(newCount);
    } catch (e) {
      // 回滚
      setLiked(prevLiked);
      setCount(prevCount);
      if (e instanceof ApiError && e.code === 401) setAuthOpen(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={`inline-flex items-center gap-1 text-xs transition-colors ${
          liked ? "text-red-500" : "text-neutral-400 hover:text-red-400"
        }`}
        aria-pressed={liked}
        aria-label={liked ? "取消点赞" : "点赞"}
      >
        <span className="text-sm leading-none">{liked ? "♥" : "♡"}</span>
        <span>{count}</span>
      </button>
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={() => void toggle()} />
    </>
  );
}
