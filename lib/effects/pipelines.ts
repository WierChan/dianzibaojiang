import { gaussianBlur } from "./blur";
import { blueTint, chromaticAberration, saturate, shiftColors } from "./colors";
import { degradeChroma, jpegGreenPass } from "./chroma";
import { compressJPEG, nudgeGrid } from "./compress";
import { adjustContrast, reduceContrast } from "./contrast";
import { capCanvas, cloneCanvas } from "./core";
import { addNoise } from "./noise";
import { pixelate } from "./pixelate";
import { addWatermark } from "./watermark";
import { clamp, createRng, lerp, param, type RNG } from "./random";
import { capLongEdge, resizeRoundTrip, resizeTo } from "./resize";
import { crop, simulateScreenshot } from "./screenshot";
import { realMoire, simulateScreenPhoto } from "./screenphoto";
import { sharpen } from "./sharpen";
import { simulateCRT, simulateLCD, vignette } from "./crt";

export type PresetId =
  | "classic"
  | "qq2008"
  | "tieba"
  | "wechat"
  | "screenshotception"
  | "screenphoto"
  | "survivor";

export interface PipelineOptions {
  preset: PresetId;
  /** 0–100 */
  intensity: number;
  seed: string;
  /** Bottom-right "@username" watermark, stamped before aging so it ages too. */
  watermark?: string;
  /** Cap the working resolution (for fast previews). Omit for full-res. */
  maxDim?: number;
  /**
   * Let the output pixel dimensions actually shrink to each preset's real
   * platform size cap (default true). When false, only quality degrades and
   * the original dimensions are kept.
   */
  resize?: boolean;
  onProgress?: (done: number, total: number, label: string) => void;
}

/**
 * Where each preset's transfer chain bottoms out, as a long-edge cap
 * [at intensity 0, at intensity 100]. Kept ≤ the preview cap so preview and
 * full-res converge to the same final size. Dimensions only ratchet down.
 * The 100 end is deliberately brutal — a heavily-reposted image is tiny.
 */
const SIZE_CAP: Record<PresetId, readonly [number, number]> = {
  classic: [1600, 640],
  qq2008: [1280, 340],
  tieba: [1024, 230],
  wechat: [1280, 400],
  screenshotception: [1170, 300],
  screenphoto: [1280, 460],
  survivor: [1080, 200],
};

interface Step {
  label: string;
  run: (c: HTMLCanvasElement) => Promise<HTMLCanvasElement> | HTMLCanvasElement;
}

const yieldToUI = () => new Promise<void>((r) => setTimeout(r, 0));

/** Pixel-unit scale so radii/shifts look the same at preview and full res. */
const sizeFactor = (w: number, h: number) => clamp(Math.min(w, h) / 1000, 0.35, 6);

export async function runPipeline(
  source: HTMLCanvasElement,
  opts: PipelineOptions,
): Promise<HTMLCanvasElement> {
  let canvas = opts.maxDim ? capCanvas(source, opts.maxDim) : cloneCanvas(source);
  const t = clamp(opts.intensity / 100, 0, 1);
  const rng = createRng(`${opts.seed}::${opts.preset}`);
  const steps = BUILDERS[opts.preset](rng, t, canvas.width, canvas.height);
  const watermark = opts.watermark?.trim();
  if (watermark) {
    steps.unshift({ label: "盖水印", run: (c) => addWatermark(c, { text: watermark }) });
  }
  // Real transfer chains shrink the actual pixels; bottom out at the preset's
  // cap. Applied last so size-dependent effects still see the full canvas.
  if (opts.resize ?? true) {
    const [hi, lo] = SIZE_CAP[opts.preset];
    const capRng = createRng(`${opts.seed}::cap`);
    const target = Math.round(lerp(hi, lo, t) * capRng.range(0.85, 1));
    steps.push({ label: "尺寸缩水", run: (c) => capLongEdge(c, target) });
  } else {
    // Toggle off means "keep my dimensions": undo intrinsic shrink (screenshots,
    // crops) by scaling the long edge back to the original, aspect preserved.
    const origLong = Math.max(canvas.width, canvas.height);
    steps.push({
      label: "还原尺寸",
      run: (c) => {
        const long = Math.max(c.width, c.height);
        if (long === origLong) return c;
        const k = origLong / long;
        return resizeTo(c, c.width * k, c.height * k, "medium");
      },
    });
  }
  for (let i = 0; i < steps.length; i++) {
    opts.onProgress?.(i, steps.length, steps[i].label);
    canvas = await steps[i].run(canvas);
    await yieldToUI();
  }
  opts.onProgress?.(steps.length, steps.length, "完成");
  return canvas;
}

/* ---------------------------------------------------------------- presets */

type Builder = (rng: RNG, t: number, w: number, h: number) => Step[];

function noiseSeed(rng: RNG): number {
  return rng.int(1, 0x7fffffff);
}

/** ±1, for randomizing a direction each generation. */
const sign = (rng: RNG): number => (rng.chance(0.5) ? 1 : -1);

/** One "someone screenshotted this" round: frame → compress → sloppy crop. */
function screenshotRound(rng: RNG, t: number, quality: number): Step[] {
  const screenWidth = rng.pick([540, 640, 690, 750, 828, 1080, 1170]);
  const dark = rng.chance(0.6);
  const jitter = () => rng.int(0, Math.round(1 + 4 * t));
  let barH = 0;
  return [
    {
      label: "模拟截图",
      run: (c) => {
        const res = simulateScreenshot(c, { screenWidth, dark, rng });
        barH = res.barHeight;
        return res.canvas;
      },
    },
    { label: "JPEG 压缩", run: (c) => compressJPEG(c, quality) },
    {
      label: "手抖裁剪",
      // Occasionally under-crops the bar, leaving the telltale 1–2px sliver.
      run: (c) => {
        const sliver = rng.chance(0.3 * t) ? rng.int(1, 3) : 0;
        return crop(c, jitter(), Math.max(0, barH - sliver + rng.int(0, 3)), jitter(), jitter());
      },
    },
  ];
}

const classic: Builder = (rng, t, w, h) => {
  const s = sizeFactor(w, h);
  return [
    {
      label: "缩放损失",
      run: (c) => resizeRoundTrip(c, param(rng, t, [0.995, 1], [0.3, 0.62]), "low"),
    },
    { label: "JPEG 压缩", run: (c) => compressJPEG(c, param(rng, t, [0.88, 0.95], [0.14, 0.36])) },
    {
      label: "色度损失",
      // Every re-encode subsamples chroma; model it honestly, no color bias.
      run: (c) =>
        degradeChroma(c, {
          sub: Math.round(param(rng, t, [1, 1], [2, 4])),
          quant: param(rng, t, [1, 1], [4, 10]),
        }),
    },
    {
      label: "加噪",
      run: (c) => addNoise(c, param(rng, t, [0, 0.4], [2, 5]), noiseSeed(rng), rng.chance(0.7)),
    },
    { label: "锐化", run: (c) => sharpen(c, param(rng, t, [0, 0.08], [0.4, 0.95])) },
    { label: "对比度衰减", run: (c) => reduceContrast(c, param(rng, t, [0, 0.06], [0.3, 0.6])) },
    {
      label: "偏色",
      run: (c) =>
        shiftColors(c, rng.range(-14, 14) * t, rng.range(-12, 12) * t, rng.range(-14, 14) * t),
    },
    {
      label: "色散",
      run: (c) =>
        rng.chance(0.6 * t)
          ? chromaticAberration(c, Math.round(param(rng, t, [0, 0], [0.8, 2.2]) * s) * sign(rng))
          : c,
    },
    { label: "错开网格", run: (c) => nudgeGrid(c, rng.int(-2, 2), rng.int(-2, 2)) },
    { label: "再次 JPEG 压缩", run: (c) => compressJPEG(c, param(rng, t, [0.85, 0.92], [0.08, 0.28])) },
  ];
};

const qq2008: Builder = (rng, t, w, h) => {
  const s = sizeFactor(w, h);
  return [
    {
      label: "降分辨率",
      run: (c) => resizeRoundTrip(c, param(rng, t, [0.99, 1], [0.22, 0.46]), "low"),
    },
    { label: "JPEG 压缩", run: (c) => compressJPEG(c, param(rng, t, [0.86, 0.92], [0.12, 0.3])) },
    { label: "蓝色偏色", run: (c) => blueTint(c, param(rng, t, [0.05, 0.15], [0.8, 1.15])) },
    { label: "过度锐化", run: (c) => sharpen(c, param(rng, t, [0.05, 0.12], [1.0, 1.8])) },
    {
      label: "加噪",
      run: (c) => addNoise(c, param(rng, t, [0.2, 0.5], [2, 4.5]), noiseSeed(rng), rng.chance(0.4)),
    },
    {
      label: "CRT 显示器",
      run: (c) =>
        simulateCRT(c, {
          softness: param(rng, t, [0, 0.2], [0.5, 1.2]) * s,
          scanlineAlpha: param(rng, t, [0, 0.02], [0.06, 0.12]),
          scanlinePitch: Math.max(2, Math.round(3 * s)),
          bloom: param(rng, t, [0.05, 0.1], [0.3, 0.6]),
        }),
    },
    { label: "再次 JPEG 压缩", run: (c) => compressJPEG(c, param(rng, t, [0.8, 0.9], [0.1, 0.28])) },
  ];
};

const tieba: Builder = (rng, t, w, h) => {
  const s = sizeFactor(w, h);
  return [
    {
      label: "降分辨率",
      run: (c) => resizeRoundTrip(c, param(rng, t, [0.99, 1], [0.25, 0.52]), "low"),
    },
    { label: "JPEG 压缩", run: (c) => compressJPEG(c, param(rng, t, [0.87, 0.93], [0.1, 0.3])) },
    {
      label: "整数 YUV 漂绿",
      // The real Tieba green: bit-exact integer YUV round-trips, compounded.
      // Near 100 this stacks a dozen-plus passes → the whole image marches green.
      run: (c) => jpegGreenPass(c, 1 + Math.round(param(rng, t, [0, 0], [7, 14]))),
    },
    {
      label: "色度崩坏",
      // Chroma-plane collapse: blocky bleed + hard color banding + green bias.
      run: (c) =>
        degradeChroma(c, {
          sub: Math.round(param(rng, t, [1, 1], [2, 6])),
          quant: param(rng, t, [1, 2], [8, 22]),
          biasCb: -param(rng, t, [0, 0], [2, 8]),
          biasCr: -param(rng, t, [0, 1], [4, 12]),
        }),
    },
    { label: "锐化光边", run: (c) => sharpen(c, param(rng, t, [0.03, 0.1], [0.7, 1.3])) },
    {
      label: "彩噪",
      run: (c) => addNoise(c, param(rng, t, [0.1, 0.4], [1.5, 4]), noiseSeed(rng), false),
    },
    {
      label: "错开网格",
      run: (c) => nudgeGrid(c, rng.int(-3, 3), rng.int(-3, 3)),
    },
    {
      label: "再绿一层",
      // Each repost compounded the cast — reposts of green images went greener.
      run: (c) => (rng.chance(0.5 + 0.5 * t) ? jpegGreenPass(c, 1 + Math.round(rng.range(0, 6) * t)) : c),
    },
    {
      label: "压暗成黑绿",
      // Heavy reposts don't just go green, they go *dark* green — pull the
      // luminance down and flatten, so the cast reads murky rather than neon.
      run: (c) => adjustContrast(c, param(rng, t, [1, 1], [0.72, 0.9]), -param(rng, t, [0, 0], [16, 46])),
    },
    {
      label: "轻微模糊",
      run: (c) => gaussianBlur(c, param(rng, t, [0, 0.1], [0.3, 1.1]) * s),
    },
    { label: "再次 JPEG 压缩", run: (c) => compressJPEG(c, param(rng, t, [0.82, 0.9], [0.06, 0.22])) },
  ];
};

const wechat: Builder = (rng, t, w, h) => {
  const s = sizeFactor(w, h);
  const steps: Step[] = [
    {
      label: "压到 640px",
      run: (c) => {
        const targetW = Math.round(lerp(c.width, Math.min(c.width, 640), t));
        return targetW < c.width ? resizeRoundTrip(c, targetW / c.width, "medium") : c;
      },
    },
    { label: "JPEG 压缩", run: (c) => compressJPEG(c, param(rng, t, [0.9, 0.95], [0.25, 0.5])) },
    { label: "轻微模糊", run: (c) => gaussianBlur(c, param(rng, t, [0, 0.15], [0.3, 1.0]) * s) },
  ];
  if (t > 0.05 && rng.chance(0.4 + 0.55 * t)) {
    steps.push(...screenshotRound(rng, t, param(rng, t, [0.85, 0.92], [0.4, 0.62])));
  }
  steps.push(
    { label: "褪色", run: (c) => saturate(c, param(rng, t, [0.97, 1], [0.72, 0.86])) },
    {
      label: "对比度衰减",
      run: (c) =>
        adjustContrast(c, param(rng, t, [0.99, 1], [0.85, 0.94]), param(rng, t, [0, 1], [3, 9])),
    },
    { label: "再次 JPEG 压缩", run: (c) => compressJPEG(c, param(rng, t, [0.88, 0.93], [0.28, 0.52])) },
  );
  return steps;
};

const screenshotception: Builder = (rng, t) => {
  const rounds = clamp(1 + Math.round(t * 6 + rng.range(0, 1.5)), 1, 8);
  const steps: Step[] = [];
  for (let r = 0; r < rounds; r++) {
    steps.push(...screenshotRound(rng, t, param(rng, t, [0.82, 0.9], [0.32, 0.6])));
    if (rng.chance(0.5)) {
      steps.push({
        label: "亮度漂移",
        run: (c) => adjustContrast(c, rng.range(0.965, 0.995), rng.range(-4, 5)),
      });
    }
  }
  steps.push({
    label: "最后一次 JPEG 压缩",
    run: (c) => compressJPEG(c, param(rng, t, [0.85, 0.92], [0.3, 0.55])),
  });
  return steps;
};

const screenphoto: Builder = (rng, t, w, h) => {
  const s = sizeFactor(w, h);
  return [
    // A touch of prior aging so it's a photo *of an already-online image*.
    {
      label: "降分辨率",
      run: (c) => resizeRoundTrip(c, param(rng, t, [0.98, 1], [0.45, 0.72]), "low"),
    },
    { label: "JPEG 压缩", run: (c) => compressJPEG(c, param(rng, t, [0.9, 0.95], [0.4, 0.62])) },
    // The re-shoot: full optical + sensor + camera-JPEG chain.
    { label: "手机拍屏", run: (c) => simulateScreenPhoto(c, { rng, t, s }) },
    { label: "褪色", run: (c) => saturate(c, param(rng, t, [0.99, 1], [0.8, 0.92])) },
    { label: "再次 JPEG 压缩", run: (c) => compressJPEG(c, param(rng, t, [0.86, 0.92], [0.28, 0.5])) },
  ];
};

const survivor: Builder = (rng, t, w, h) => {
  const s = sizeFactor(w, h);
  const loops = 2 + Math.round(t * 4);
  const steps: Step[] = [];
  for (let i = 0; i < loops; i++) {
    steps.push(
      {
        label: `第 ${i + 1} 轮:缩放损失`,
        run: (c) => resizeRoundTrip(c, param(rng, t, [0.97, 1], [0.4, 0.72]), "low"),
      },
      {
        label: `第 ${i + 1} 轮:JPEG 压缩`,
        run: (c) => compressJPEG(c, param(rng, t, [0.9, 0.96], [0.12, 0.36])),
      },
      {
        label: `第 ${i + 1} 轮:加噪`,
        run: (c) =>
          addNoise(c, param(rng, t, [0, 0.3], [1.5, 3.5]), noiseSeed(rng), rng.chance(0.6)),
      },
      {
        label: `第 ${i + 1} 轮:锐化`,
        run: (c) => sharpen(c, param(rng, t, [0, 0.15], [0.4, 1.0])),
      },
    );
    // Interleave one-off degradations between the loops.
    if (i === 0 && t > 0.05 && rng.chance(0.8)) {
      steps.push(...screenshotRound(rng, t, param(rng, t, [0.8, 0.88], [0.4, 0.6])));
    }
    if (i === 1) {
      steps.push(
        {
          label: "偏色",
          run: (c) =>
            rng.chance(0.6)
              ? blueTint(c, param(rng, t, [0.1, 0.2], [0.4, 0.8]))
              : shiftColors(c, rng.range(-16, 16) * t, rng.range(-13, 13) * t, rng.range(-16, 16) * t),
        },
        {
          label: "色度崩坏",
          // Fifteen years of subsampling: blocky chroma with a real drift.
          run: (c) =>
            degradeChroma(c, {
              sub: Math.round(param(rng, t, [1, 1], [2, 5])),
              quant: param(rng, t, [1, 2], [6, 16]),
              biasCr: -param(rng, t, [0, 0], [3, 9]),
            }),
        },
        {
          label: "LCD 屏摄",
          run: (c) => (rng.chance(0.7) ? simulateLCD(c, param(rng, t, [0.1, 0.2], [0.4, 0.8])) : c),
        },
        {
          label: "波普像素格",
          run: (c) =>
            t > 0.3 && rng.chance(0.6)
              ? pixelate(c, Math.round(param(rng, t, [1, 1], [2, 5]) * s))
              : c,
        },
        {
          label: "摩尔纹",
          // Orientation fully random each generation — a re-shoot is never squared up.
          run: (c) =>
            rng.chance(0.7)
              ? realMoire(c, {
                  pitch: Math.max(2, Math.round(rng.range(2.5, 4) * s)),
                  ratio: rng.range(1.05, 1.14),
                  angle: rng.range(-1.4, 1.4),
                  strength: param(rng, t, [0.04, 0.08], [0.12, 0.28]),
                })
              : c,
        },
      );
    }
  }
  steps.push(
    {
      label: "色散",
      run: (c) => chromaticAberration(c, Math.round(param(rng, t, [0, 0.4], [1, 3]) * s) * sign(rng)),
    },
    { label: "对比度衰减", run: (c) => reduceContrast(c, param(rng, t, [0.02, 0.08], [0.35, 0.6])) },
    { label: "暗角", run: (c) => vignette(c, param(rng, t, [0.02, 0.06], [0.3, 0.6])) },
    {
      label: "CRT 显示器",
      run: (c) =>
        simulateCRT(c, {
          softness: param(rng, t, [0, 0.15], [0.3, 0.8]) * s,
          scanlineAlpha: param(rng, t, [0, 0.015], [0.03, 0.07]),
          scanlinePitch: Math.max(2, Math.round(3 * s)),
          bloom: param(rng, t, [0, 0.1], [0.2, 0.45]),
        }),
    },
    { label: "最后一次 JPEG 压缩", run: (c) => compressJPEG(c, param(rng, t, [0.88, 0.94], [0.08, 0.24])) },
  );
  return steps;
};

const BUILDERS: Record<PresetId, Builder> = {
  classic,
  qq2008,
  tieba,
  wechat,
  screenshotception,
  screenphoto,
  survivor,
};

/**
 * 本地实现了算法的预设键。预设的名称/描述等展示数据来自后端
 * /api/presets,前端用这份列表过滤掉本地没有对应算法的条目。
 */
export const PRESET_IDS = Object.keys(BUILDERS) as PresetId[];
