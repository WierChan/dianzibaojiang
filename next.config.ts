import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 导出纯静态站点到 out/,可直接部署到 Nginx
  output: "export",
  // 静态导出下 next/image 无法用优化服务;本项目用普通 <img>,这里关掉以防万一
  images: { unoptimized: true },
};

export default nextConfig;
