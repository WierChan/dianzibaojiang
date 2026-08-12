"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type { PresetInfo } from "@/lib/api";
import type { PresetId } from "@/lib/effects/pipelines";

interface ControlsProps {
  /** 预设列表,来自后端 /api/presets(已过滤为本地有算法实现的)。 */
  presets: PresetInfo[];
  preset: PresetId;
  onPresetChange: (p: PresetId) => void;
  intensity: number;
  onIntensityChange: (v: number) => void;
  seed: string;
  onSeedChange: (s: string) => void;
  watermark: string;
  onWatermarkChange: (s: string) => void;
  resize: boolean;
  onResizeChange: (v: boolean) => void;
  onGenerate: () => void;
  busy: boolean;
  disabled: boolean;
}

function intensityLabel(v: number): string {
  if (v < 13) return "几乎原图";
  if (v < 38) return "轻微网感";
  if (v < 63) return "明显被转发过很多次";
  if (v < 88) return "严重降解";
  return "互联网化石";
}

export function Controls({
  presets,
  preset,
  onPresetChange,
  intensity,
  onIntensityChange,
  seed,
  onSeedChange,
  watermark,
  onWatermarkChange,
  resize,
  onResizeChange,
  onGenerate,
  busy,
  disabled,
}: ControlsProps) {
  const info = presets.find((p) => p.presetKey === preset);
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label>预设</Label>
        <Select value={preset} onValueChange={(v) => onPresetChange(v as PresetId)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {presets.map((p) => (
              <SelectItem key={p.presetKey} value={p.presetKey}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {info && <p className="text-xs text-neutral-400">{info.description}</p>}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <Label>包浆强度</Label>
          <span className="text-xs text-neutral-400">
            {intensity} · {intensityLabel(intensity)}
          </span>
        </div>
        <Slider
          value={[intensity]}
          min={0}
          max={100}
          step={1}
          onValueChange={(v: number[]) => onIntensityChange(v[0])}
        />
        <div className="mt-1 flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <Label htmlFor="resize">缩小实际像素尺寸</Label>
            <span className="text-xs text-neutral-400">
              模拟平台上限,让图真的变小;关闭则只降画质、保留原尺寸
            </span>
          </div>
          <button
            id="resize"
            type="button"
            role="switch"
            aria-checked={resize}
            onClick={() => onResizeChange(!resize)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              resize ? "bg-neutral-800" : "bg-neutral-300"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                resize ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="watermark">水印用户名(可选)</Label>
        <Input
          id="watermark"
          value={watermark}
          placeholder="例如 @CHX,盖在右下角并一起包浆"
          onChange={(e) => onWatermarkChange(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="seed">随机种子(可选)</Label>
        <Input
          id="seed"
          value={seed}
          placeholder="留空则每次生成都不一样"
          onChange={(e) => onSeedChange(e.target.value)}
        />
      </div>

      <Button size="lg" className="w-full" onClick={onGenerate} disabled={disabled || busy}>
        {busy ? "包浆中…" : "生成"}
      </Button>
    </div>
  );
}
