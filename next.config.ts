import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 纯客户端工具:导出静态站点到 out/,可直接用 Nginx 发文件,无需 Node 进程。
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
