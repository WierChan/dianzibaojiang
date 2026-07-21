import type { MetadataRoute } from "next";

// 静态导出:生成 /sitemap.xml
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://www.dianzibaojiang.com",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
