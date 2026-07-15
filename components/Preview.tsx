"use client";

import { useEffect, useRef, useState } from "react";

interface PreviewProps {
  original: HTMLCanvasElement | null;
  processed: HTMLCanvasElement | null;
  busy: boolean;
  progress: { done: number; total: number; label: string } | null;
}

export function Preview({ original, processed, busy, progress }: PreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  const shown = showOriginal ? original : (processed ?? original);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el || !shown) return;
    el.width = shown.width;
    el.height = shown.height;
    el.getContext("2d")?.drawImage(shown, 0, 0);
  }, [shown]);

  if (!original) return null;

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <div className="relative flex w-full items-center justify-center">
        <canvas
          ref={canvasRef}
          className="max-h-[62vh] w-auto max-w-full rounded-lg border border-neutral-200 shadow-sm"
        />
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/60 backdrop-blur-[1px]">
            <p className="rounded-full bg-white px-4 py-1.5 text-sm text-neutral-600 shadow">
              {progress ? `${progress.label} (${progress.done}/${progress.total})` : "处理中…"}
            </p>
          </div>
        )}
      </div>
      {processed && (
        <button
          type="button"
          className="select-none text-xs text-neutral-400 hover:text-neutral-600"
          onPointerDown={() => setShowOriginal(true)}
          onPointerUp={() => setShowOriginal(false)}
          onPointerLeave={() => setShowOriginal(false)}
        >
          {showOriginal ? "松开回到包浆版" : "按住对比原图"}
        </button>
      )}
    </div>
  );
}
