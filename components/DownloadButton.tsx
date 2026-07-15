"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { estimateAge } from "@/lib/age";
import { canvasToBlob } from "@/lib/effects/core";
import { runPipeline, type PresetId } from "@/lib/effects/pipelines";
import { createRng } from "@/lib/effects/random";
import { buildExifApp1, formatExifDate, injectExif, pickCamera } from "@/lib/exif";

type Format = "png" | "jpeg" | "webp";

const MIME: Record<Format, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

interface DownloadButtonProps {
  /** Full-resolution source; the pipeline re-runs on it with the same seed. */
  source: HTMLCanvasElement | null;
  preset: PresetId;
  intensity: number;
  seed: string | null;
  watermark: string;
  resize: boolean;
  disabled: boolean;
}

export function DownloadButton({
  source,
  preset,
  intensity,
  seed,
  watermark,
  resize,
  disabled,
}: DownloadButtonProps) {
  const [format, setFormat] = useState<Format>("jpeg");
  const [busy, setBusy] = useState(false);

  const download = async () => {
    if (!source || !seed) return;
    setBusy(true);
    try {
      const canvas = await runPipeline(source, { preset, intensity, seed, watermark, resize });
      let blob = await canvasToBlob(canvas, MIME[format], format === "png" ? undefined : 0.92);
      // Stamp fake camera EXIF: capture date set back by the same "years online"
      // the AgeCard shows, with a period-correct camera. JPEG carries EXIF natively.
      if (format === "jpeg") {
        const years = estimateAge(preset, intensity, createRng(`${seed}::age`)).years;
        const rng = createRng(`${seed}::exif`);
        const d = new Date();
        d.setFullYear(d.getFullYear() - Math.round(years));
        d.setMonth(rng.int(0, 11), rng.int(1, 28));
        d.setHours(rng.int(6, 23), rng.int(0, 59), rng.int(0, 59), 0);
        const cam = pickCamera(d.getFullYear(), rng);
        blob = await injectExif(blob, buildExifApp1({ ...cam, dateTime: formatExifDate(d) }));
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
      a.download = `patina-${preset}-${seed}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex w-full items-center gap-3">
      <Select value={format} onValueChange={(v) => setFormat(v as Format)}>
        <SelectTrigger className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="jpeg">JPEG</SelectItem>
          <SelectItem value="png">PNG</SelectItem>
          <SelectItem value="webp">WebP</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" className="flex-1" onClick={download} disabled={disabled || busy}>
        {busy ? "导出中…" : "下载"}
      </Button>
    </div>
  );
}
