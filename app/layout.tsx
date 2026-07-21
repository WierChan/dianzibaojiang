import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://www.dianzibaojiang.com";
const DESC =
  "电子包浆生成器:纯浏览器端确定性图像处理,用反复 JPEG 压缩、缩放损失、加噪、截图、屏摄等算法,把任何图片做旧成在互联网上流传了十五年的「包浆」样子。免费、无需上传,图片不离开你的设备。";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "电子包浆生成器 — 一键把图片做旧成互联网流传十五年的样子",
    template: "%s | 电子包浆生成器",
  },
  description: DESC,
  keywords: [
    "电子包浆",
    "包浆生成器",
    "图片做旧",
    "图片包浆",
    "做旧滤镜",
    "复古滤镜",
    "JPEG 压缩",
    "互联网包浆",
    "表情包做旧",
    "屏摄效果",
    "meme 做旧",
    "patina",
    "image aging",
  ],
  applicationName: "电子包浆生成器",
  authors: [{ name: "CHX" }],
  creator: "CHX",
  publisher: "电子包浆生成器",
  category: "technology",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: SITE_URL,
    siteName: "电子包浆生成器",
    title: "电子包浆生成器 — 一键把图片做旧成互联网流传十五年的样子",
    description: DESC,
    images: [
      {
        url: "/example.jpg",
        width: 1000,
        height: 750,
        alt: "电子包浆效果示例",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "电子包浆生成器",
    description: "一键把图片做旧成互联网流传十五年的「包浆」效果,纯浏览器端处理、无需上传。",
    images: ["/example.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

/** 结构化数据:让搜索引擎理解这是一个免费的在线工具。 */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "电子包浆生成器",
  url: SITE_URL,
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Any",
  browserRequirements: "Requires JavaScript",
  inLanguage: "zh-CN",
  description: DESC,
  offers: { "@type": "Offer", price: "0", priceCurrency: "CNY" },
  author: { "@type": "Person", name: "CHX" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-neutral-900">
        {children}
        {/* 结构化数据(JSON-LD),写进静态 HTML 供搜索引擎读取 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Google AdSense:beforeInteractive 会被注入到初始 HTML 的 <head> 里 */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1295980536906647"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
