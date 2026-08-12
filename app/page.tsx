"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AgeCard } from "@/components/AgeCard";
import { Controls } from "@/components/Controls";
import { DownloadButton } from "@/components/DownloadButton";
import { Preview } from "@/components/Preview";
import { Uploader } from "@/components/Uploader";
import {
  fetchPresets,
  fetchStatsSummary,
  reportGeneration,
  type AgeStats,
  type PresetInfo,
} from "@/lib/api";
import { PRESET_IDS, runPipeline, type PresetId } from "@/lib/effects/pipelines";
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
  /** 来自后端 /api/generations 的互联网年龄;上报失败时为 null。 */
  stats: AgeStats | null;
  statsError: string | null;
}

interface Progress {
  done: number;
  total: number;
  label: string;
}

export default function Home() {
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [presets, setPresets] = useState<PresetInfo[] | null>(null);
  const [presetsError, setPresetsError] = useState<string | null>(null);
  const [totalGenerations, setTotalGenerations] = useState<number | null>(null);
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

  const refreshStats = useCallback(() => {
    fetchStatsSummary()
      .then((s) => setTotalGenerations(s.totalGenerations))
      .catch(() => {
        // 页脚计数拿不到就先不显示,不影响主流程
      });
  }, []);

  // 预设列表来自后端;过滤掉本地没有对应算法实现的条目
  const loadPresets = useCallback(() => {
    setPresetsError(null);
    fetchPresets()
      .then((list) => {
        const usable = list.filter((p) => (PRESET_IDS as string[]).includes(p.presetKey));
        if (!usable.length) {
          setPresetsError("后端预设与本地算法不匹配,请检查 patina-server 的预设数据");
          return;
        }
        setPresets(usable);
        setPreset((cur) => (usable.some((p) => p.presetKey === cur) ? cur : (usable[0].presetKey as PresetId)));
      })
      .catch((e) => {
        setPresetsError(e instanceof Error ? e.message : "加载预设失败");
      });
  }, []);

  useEffect(() => {
    loadPresets();
    refreshStats();
  }, [loadPresets, refreshStats]);

  const generate = useCallback(
    async (seedOverride?: string) => {
      if (!image) return;
      const seed = seedOverride ?? (seedInput.trim() || randomSeedString());
      const id = ++runId.current;
      lastRun.current = { preset, intensity, seed, watermark, resize };
      setBusy(true);
      try {
        const t0 = performance.now();
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
        // 上报后端并取回服务端计算的互联网年龄;失败则明确提示,不做本地兜底
        let stats: AgeStats | null = null;
        let statsError: string | null = null;
        try {
          const record = await reportGeneration({
            presetKey: preset,
            intensity,
            seed,
            watermark: watermark.trim() || undefined,
            resize,
            originalName: image.name,
            srcWidth: image.canvas.width,
            srcHeight: image.canvas.height,
            resultWidth: canvas.width,
            resultHeight: canvas.height,
            durationMs: Math.round(performance.now() - t0),
          });
          stats = record.ageStats;
          refreshStats();
        } catch (e) {
          statsError = e instanceof Error ? e.message : "上报失败";
        }
        if (id !== runId.current) return;
        setResult({ canvas, seed, stats, statsError });
      } finally {
        if (id === runId.current) {
          setBusy(false);
          setProgress(null);
        }
      }
    },
    [image, preset, intensity, seedInput, watermark, resize, refreshStats],
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

      {presetsError && (
        <div className="flex w-full flex-col items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center">
          <p className="text-sm text-red-600">{presetsError}</p>
          <button
            type="button"
            onClick={loadPresets}
            className="text-sm text-red-700 underline underline-offset-2 hover:text-red-900"
          >
            重试
          </button>
        </div>
      )}

      <Uploader onImage={handleImage} imageName={image?.name ?? null} />

      <Preview
        original={image?.canvas ?? null}
        processed={result?.canvas ?? null}
        busy={busy}
        progress={progress}
      />

      {image && !presets && !presetsError && (
        <p className="text-sm text-neutral-400">正在从后端加载预设…</p>
      )}

      {image && presets && (
        <Controls
          presets={presets}
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
            ageYears={result.stats?.years ?? null}
            disabled={busy}
          />
          {result.stats && <AgeCard stats={result.stats} />}
          {result.statsError && (
            <p className="text-xs text-red-500">互联网年龄获取失败:{result.statsError}</p>
          )}
          <p className="text-xs text-neutral-300">
            种子 {result.seed} · 成品 {result.canvas.width}×{result.canvas.height}px · 图片在你的浏览器里处理,不会上传;仅上报生成参数用于统计
          </p>
        </>
      )}

      <footer className="mt-auto flex flex-col items-center gap-1 pt-8 text-xs text-neutral-400">
        {totalGenerations != null && <p>全站已包浆 {totalGenerations} 张图</p>}
        <p>由 CHX 设计</p>
        <p>
          喜欢这类小玩意?更多创意工具在{" "}
          <a
            href="https://chenhengxi.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-neutral-700"
          >
            chenhengxi.com
          </a>
        </p>
      </footer>
    </main>
  );
}
