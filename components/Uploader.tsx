"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { loadImageFile } from "@/lib/loadImage";

interface UploaderProps {
  onImage: (canvas: HTMLCanvasElement, name: string) => void;
  imageName: string | null;
}

export function Uploader({ onImage, imageName }: UploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const canvas = await loadImageFile(file);
      onImage(canvas, file.name);
    } catch {
      setError("无法解码这张图片,换一个格式试试(JPG / PNG / WebP)");
    }
  };

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => {
        void handleFile(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );

  if (imageName) {
    return (
      <div className="flex items-center gap-3 text-sm text-neutral-500">
        {input}
        <span className="max-w-[16rem] truncate" title={imageName}>
          {imageName}
        </span>
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          换一张图
        </Button>
        {error && <span className="text-red-500">{error}</span>}
      </div>
    );
  }

  return (
    <div
      className={`flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-8 py-16 text-center transition-colors ${
        dragging ? "border-neutral-800 bg-neutral-50" : "border-neutral-300 hover:border-neutral-400"
      }`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void handleFile(e.dataTransfer.files?.[0]);
      }}
    >
      {input}
      <p className="text-lg font-medium text-neutral-800">上传图片</p>
      <p className="text-sm text-neutral-400">点击选择或拖拽到这里 · JPG / PNG / WebP · 最大 6000px</p>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
