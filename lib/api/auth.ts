import { request } from "./client";
import type { LoginVO, UserVO } from "./types";

export interface RegisterPayload {
  username: string;
  password: string;
  email?: string;
  nickname?: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export function apiRegister(payload: RegisterPayload): Promise<LoginVO> {
  return request<LoginVO>("/api/auth/register", { method: "POST", body: payload });
}

export function apiLogin(payload: LoginPayload): Promise<LoginVO> {
  return request<LoginVO>("/api/auth/login", { method: "POST", body: payload });
}

export function apiMe(): Promise<UserVO> {
  return request<UserVO>("/api/auth/me", { auth: true });
}
