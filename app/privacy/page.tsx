import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "隐私政策",
  description: "电子包浆生成器如何对待你的图片和数据：图片只在你的浏览器里处理，页面上的广告由 Google AdSense 提供。",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-12 text-sm leading-7 text-neutral-700">
      <h1 className="text-2xl font-semibold text-neutral-900">隐私政策</h1>
      <p className="text-xs text-neutral-400">更新日期：2026 年 11 月 1 日</p>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-medium text-neutral-900">你的图片</h2>
        <p>
          图片的读取、做旧和导出都在你的浏览器里完成，不会上传到我们的服务器。我们没有账号系统，也不保存你处理过的图片。
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-medium text-neutral-900">广告</h2>
        <p>
          这个网站通过 Google AdSense 展示广告。打开页面时，你的浏览器会连接 Google 的服务器。Google 及其合作伙伴可能使用
          Cookie 或类似技术，根据你访问这个网站和其他网站的记录投放广告，并统计广告效果。Google 接收的是这类访问信息，不是你处理的图片。
        </p>
        <p>
          你可以在{" "}
          <a
            href="https://adssettings.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-neutral-900"
          >
            Google 广告设置
          </a>{" "}
          里关闭个性化广告。Google 如何使用这些数据，见{" "}
          <a
            href="https://policies.google.com/technologies/partner-sites"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-neutral-900"
          >
            Google 的说明
          </a>
          。
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-medium text-neutral-900">联系</h2>
        <p>
          有疑问请写信到{" "}
          <a href="mailto:chenhengxi1104@gmail.com" className="underline underline-offset-2 hover:text-neutral-900">
            chenhengxi1104@gmail.com
          </a>
          。
        </p>
      </section>

      <Link href="/" className="text-xs text-neutral-400 underline underline-offset-2 hover:text-neutral-700">
        返回生成器
      </Link>
    </main>
  );
}
