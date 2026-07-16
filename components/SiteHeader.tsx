"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthDialog } from "@/components/AuthDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthContext";

export function SiteHeader() {
  const { user, ready, logout } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-neutral-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between px-6">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            电子包浆生成器
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/gallery" className="text-neutral-600 hover:text-neutral-900">
              作品广场
            </Link>
            <span className="text-neutral-300">·</span>
            {ready && user ? (
              <>
                <Link href="/history" className="text-neutral-600 hover:text-neutral-900">
                  我的历史
                </Link>
                <span className="text-neutral-400">·</span>
                <span className="text-neutral-700">{user.nickname || user.username}</span>
                <Button variant="outline" size="sm" onClick={logout}>
                  退出
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => setAuthOpen(true)} disabled={!ready}>
                登录 / 注册
              </Button>
            )}
          </nav>
        </div>
      </header>
      {/* 弹窗放在 header 之外,避免被 header 的 backdrop-blur 限制定位而无法全屏居中 */}
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
