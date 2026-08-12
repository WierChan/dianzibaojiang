"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { AgeStats } from "@/lib/age";

export function AgeCard({ stats }: { stats: AgeStats }) {
  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center gap-4 py-6">
        <div className="text-center">
          <p className="text-xs tracking-widest text-neutral-400">互联网年龄</p>
          <p className="text-4xl font-semibold tabular-nums">{stats.years} 年</p>
        </div>
        <p className="text-xs text-neutral-400">这张图大约经历了</p>
        <div className="grid w-full grid-cols-3 gap-2 text-center">
          <Stat value={stats.uploads} label="次上传" />
          <Stat value={stats.screenshots} label="次截图" />
          <Stat value={stats.compressions} label="次 JPEG 压缩" />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg bg-neutral-50 px-2 py-3">
      <p className="text-xl font-medium tabular-nums">{value}</p>
      <p className="text-xs text-neutral-400">{label}</p>
    </div>
  );
}
