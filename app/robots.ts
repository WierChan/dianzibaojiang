import type { MetadataRoute } from "next";

// 静态导出:生成 /robots.txt
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://www.dianzibaojiang.com/sitemap.xml",
    host: "https://www.dianzibaojiang.com",
  };
}
