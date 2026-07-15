"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AgeCard } from "@/components/AgeCard";
import { Controls } from "@/components/Controls";
import { DownloadButton } from "@/components/DownloadButton";
import { Preview } from "@/components/Preview";
import { Uploader } from "@/components/Uploader";
import { estimateAge, type AgeStats } from "@/lib/age";
import { runPipeline, type PresetId } from "@/lib/effects/pipelines";
import { createRng } from "@/lib/effects/random";
import { randomSeedString } from "@/lib/effects/seed";

/** Preview renders are capped for speed; download re-runs at full res. */
const PREVIEW_MAX_DIM = 1600;

interface LoadedImage {
  canvas: HTMLCanvasElement;
  name: string;
}

interface Result {
  canvas: HTMLCanvasElement;
  seed: string;
  stats: AgeStats;
}

interface Progress {
  done: number;
  total: number;
  label: string;
}

export default function Home() {
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [preset, setPreset] = useState<PresetId>("classic");
  const [intensity, setIntensity] = useState(60);
  const [seedInput, setSeedInput] = useState("");
  const [watermark, setWatermark] = useState("");
  const [resize, setResize] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const runId = useRef(0);
  const lastRun = useRef<{
    preset: PresetId;
    intensity: number;
    seed: string;
    watermark: string;
    resize: boolean;
  } | null>(null);

  const generate = useCallback(
    async (seedOverride?: string) => {
      if (!image) return;
      const seed = seedOverride ?? (seedInput.trim() || randomSeedString());
      const id = ++runId.current;
      lastRun.current = { preset, intensity, seed, watermark, resize };
      setBusy(true);
      try {
        const canvas = await runPipeline(image.canvas, {
          preset,
          intensity,
          seed,
          watermark,
          resize,
          maxDim: PREVIEW_MAX_DIM,
          onProgress: (done, total, label) => {
            if (id === runId.current) setProgress({ done, total, label });
          },
        });
        if (id !== runId.current) return;
        setResult({
          canvas,
          seed,
          stats: estimateAge(preset, intensity, createRng(`${seed}::age`)),
        });
      } finally {
        if (id === runId.current) {
          setBusy(false);
          setProgress(null);
        }
      }
    },
    [image, preset, intensity, seedInput, watermark, resize],
  );

  const generateRef = useRef(generate);
  // Keep the ref pointing at the latest generate without making it an effect
  // dependency. Runs after commit, before the effects below that call it.
  useEffect(() => {
    generateRef.current = generate;
  });

  const handleImage = useCallback((canvas: HTMLCanvasElement, name: string) => {
    runId.current++;
    lastRun.current = null;
    setResult(null);
    setImage({ canvas, name });
  }, []);

  // First patina right after upload — upload → done.
  useEffect(() => {
    if (image) void generateRef.current();
  }, [image]);

  // Live preview: re-run with the same seed when preset/intensity/watermark move.
  useEffect(() => {
    const last = lastRun.current;
    if (
      !last ||
      (last.preset === preset &&
        last.intensity === intensity &&
        last.watermark === watermark &&
        last.resize === resize)
    )
      return;
    const h = setTimeout(() => void generateRef.current(last.seed), 300);
    return () => clearTimeout(h);
  }, [preset, intensity, watermark, resize]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center gap-8 px-6 py-14">
      <header className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">电子包浆生成器</h1>
        <p className="mt-2 text-sm text-neutral-400">假装这张图已经在互联网上流传了十五年</p>
      </header>

      <Uploader onImage={handleImage} imageName={image?.name ?? null} />

      <Preview
        original={image?.canvas ?? null}
        processed={result?.canvas ?? null}
        busy={busy}
        progress={progress}
      />

      {image && (
        <Controls
          preset={preset}
          onPresetChange={setPreset}
          intensity={intensity}
          onIntensityChange={setIntensity}
          seed={seedInput}
          onSeedChange={setSeedInput}
          watermark={watermark}
          onWatermarkChange={setWatermark}
          resize={resize}
          onResizeChange={setResize}
          onGenerate={() => void generate()}
          busy={busy}
          disabled={!image}
        />
      )}

      {result && (
        <>
          <DownloadButton
            source={image?.canvas ?? null}
            preset={preset}
            intensity={intensity}
            seed={result.seed}
            watermark={watermark}
            resize={resize}
            disabled={busy}
          />
          <AgeCard stats={result.stats} />
          <p className="text-xs text-neutral-300">
            种子 {result.seed} · 成品 {result.canvas.width}×{result.canvas.height}px · 全部处理都在你的浏览器里完成,图片不会上传
          </p>
        </>
      )}

      <footer className="mt-auto pt-8 text-xs text-neutral-400">由 CHX 设计</footer>
    </main>
  );
}
