"use client";

import { useEffect, useRef, useState } from "react";

interface PreviewProps {
  original: HTMLCanvasElement | null;
  processed: HTMLCanvasElement | null;
  busy: boolean;
  progress: { done: number; total: number; label: string } | null;
}

/** Paint a source canvas into a target <canvas>, sizing it once. */
function paint(target: HTMLCanvasElement | null, src: HTMLCanvasElement | null) {
  if (!target || !src) return;
  if (target.width !== src.width) target.width = src.width;
  if (target.height !== src.height) target.height = src.height;
  const ctx = target.getContext("2d");
  ctx?.clearRect(0, 0, target.width, target.height);
  ctx?.drawImage(src, 0, 0);
}

export function Preview({ original, processed, busy, progress }: PreviewProps) {
  const originalRef = useRef<HTMLCanvasElement>(null);
  const processedRef = useRef<HTMLCanvasElement>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  // Draw each layer only when its source changes — never on toggle.
  useEffect(() => {
    paint(originalRef.current, original);
  }, [original]);
  useEffect(() => {
    paint(processedRef.current, processed);
  }, [processed]);

  if (!original) return null;

  const canCompare = !!processed;
  // Holding just flips this flag → the processed overlay's opacity. No redraw,
  // no reflow: the box is always sized by the *original*, so the processed (which
  // may be shrunk) is shown scaled up to that size, and holding reveals the
  // full-size original underneath at the same on-screen size.
  const hold = (on: boolean) => () => canCompare && setShowOriginal(on);

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <div
        className="relative flex touch-none select-none items-center justify-center"
        style={{ cursor: canCompare ? "pointer" : "default" }}
        onPointerDown={hold(true)}
        onPointerUp={hold(false)}
        onPointerLeave={hold(false)}
        onPointerCancel={hold(false)}
      >
        {/* Original is the base layer — it sizes the box. */}
        <canvas
          ref={originalRef}
          draggable={false}
          className="block max-h-[62vh] w-auto max-w-full rounded-lg border border-neutral-200 shadow-sm"
        />
        {/* Processed overlay, fitted to the same box; hidden while held. */}
        <canvas
          ref={processedRef}
          draggable={false}
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full rounded-lg object-contain transition-opacity duration-100"
          style={{ opacity: canCompare && !showOriginal ? 1 : 0 }}
        />
        {busy && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-white/60 backdrop-blur-[1px]">
            <p className="rounded-full bg-white px-4 py-1.5 text-sm text-neutral-600 shadow">
              {progress ? `${progress.label} (${progress.done}/${progress.total})` : "处理中…"}
            </p>
          </div>
        )}
      </div>
      {canCompare && (
        <button
          type="button"
          className="select-none text-xs text-neutral-400 hover:text-neutral-600"
          onPointerDown={hold(true)}
          onPointerUp={hold(false)}
          onPointerLeave={hold(false)}
          onPointerCancel={hold(false)}
        >
          {showOriginal ? "松开回到包浆版" : "按住图片对比原图"}
        </button>
      )}
    </div>
  );
}
