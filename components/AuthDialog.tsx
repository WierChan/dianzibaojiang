"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/AuthContext";
import { ApiError } from "@/lib/api/client";

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Mode = "login" | "register";

export function AuthDialog({ open, onClose, onSuccess }: AuthDialogProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await login({ username, password });
      } else {
        await register({ username, password, email: email || undefined });
      }
      onSuccess?.();
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "操作失败,请重试");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{mode === "login" ? "登录" : "注册"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="auth-username">用户名</Label>
            <Input
              id="auth-username"
              value={username}
              autoComplete="username"
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          {mode === "register" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="auth-email">邮箱(可选)</Label>
              <Input
                id="auth-email"
                type="email"
                value={email}
                autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="auth-password">密码</Label>
            <Input
              id="auth-password"
              type="password"
              value={password}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submit();
              }}
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <Button className="mt-1 w-full" onClick={submit} disabled={busy || !username || !password}>
            {busy ? "处理中…" : mode === "login" ? "登录" : "注册"}
          </Button>

          <button
            type="button"
            className="text-center text-xs text-neutral-500 hover:text-neutral-800"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
            }}
          >
            {mode === "login" ? "没有账号?去注册" : "已有账号?去登录"}
          </button>
        </div>
      </div>
    </div>
  );
}
