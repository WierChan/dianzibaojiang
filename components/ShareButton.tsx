"use client";

import { useState } from "react";

interface ShareButtonProps {
  /** 作品(生成记录)ID,拼成 /work?id= 分享链接。 */
  id: number;
  className?: string;
}

export function ShareButton({ id, className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = `${window.location.origin}/work?id=${id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "电子包浆作品", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 用户取消分享或剪贴板不可用时静默处理
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className={className ?? "text-xs text-neutral-400 hover:text-neutral-700"}
    >
      {copied ? "已复制链接" : "分享"}
    </button>
  );
}
