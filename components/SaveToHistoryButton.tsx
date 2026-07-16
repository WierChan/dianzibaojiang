"use client";

import { useState } from "react";
import { AuthDialog } from "@/components/AuthDialog";
import { Button } from "@/components/ui/button";
import { apiCreateGeneration } from "@/lib/api/generations";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthContext";
import type { AgeStats } from "@/lib/age";
import { canvasToBlob } from "@/lib/effects/core";
import { runPipeline, type PresetId } from "@/lib/effects/pipelines";

interface SaveToHistoryButtonProps {
  /** 全分辨率源;与下载一样用相同种子重跑成品。 */
  source: HTMLCanvasElement | null;
  preset: PresetId;
  intensity: number;
  seed: string | null;
  watermark: string;
  resize: boolean;
  stats: AgeStats | null;
  originalName: string | null;
  disabled: boolean;
}

export function SaveToHistoryButton({
  source,
  preset,
  intensity,
  seed,
  watermark,
  resize,
  stats,
  originalName,
  disabled,
}: SaveToHistoryButtonProps) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async () => {
    if (!source || !seed) return;
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      // 与下载一致:全分辨率重跑,导出 JPEG 上传后端 → R2
      const canvas = await runPipeline(source, { preset, intensity, seed, watermark, resize });
      const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
      await apiCreateGeneration(
        {
          presetKey: preset,
          intensity,
          seed,
          watermark: watermark || undefined,
          resize,
          originalName: originalName || undefined,
          resultWidth: canvas.width,
          resultHeight: canvas.height,
          ageYears: stats?.years,
          ageUploads: stats?.uploads,
          ageScreenshots: stats?.screenshots,
          ageCompressions: stats?.compressions,
        },
        blob,
        `patina-${preset}-${seed}.jpg`,
      );
      setMsg({ ok: true, text: "已保存到「我的历史」" });
    } catch (e) {
      const text = e instanceof ApiError ? e.message : "保存失败,请重试";
      setMsg({ ok: false, text });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-1.5">
      <Button variant="outline" className="w-full" onClick={save} disabled={disabled || busy}>
        {busy ? "上传中…" : user ? "保存到我的历史" : "登录后保存到历史"}
      </Button>
      {msg && (
        <p className={`text-xs ${msg.ok ? "text-emerald-600" : "text-red-500"}`}>{msg.text}</p>
      )}
      <AuthDialog
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => void save()}
      />
    </div>
  );
}
