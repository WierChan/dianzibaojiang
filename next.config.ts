import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 后端已并入本仓库(app/api/*),需要 Node 运行时,故不再静态导出。
  serverExternalPackages: ["better-sqlite3"],
  images: { unoptimized: true },
};

export default nextConfig;
