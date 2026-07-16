import type { GalleryVO, GenerationVO, UserVO } from "@/lib/api/types";
import type { UserRow } from "./auth";
import { fileUrl } from "./storage";

export interface GenerationRow {
  id: number;
  preset_key: string;
  intensity: number;
  seed: string | null;
  watermark: string | null;
  resize: number;
  original_name: string | null;
  result_file: string;
  result_width: number | null;
  result_height: number | null;
  age_years: number | null;
  age_uploads: number | null;
  age_screenshots: number | null;
  age_compressions: number | null;
  is_public: number;
  title: string | null;
  published_at: string | null;
  created_at: string;
  like_count?: number;
}

export interface GalleryRow {
  id: number;
  preset_key: string;
  intensity: number;
  title: string | null;
  result_file: string;
  result_width: number | null;
  result_height: number | null;
  age_years: number | null;
  published_at: string | null;
  author_name: string;
  like_count: number;
  liked: number;
}

export const mapUser = (u: UserRow): UserVO => ({
  id: u.id,
  username: u.username,
  email: u.email,
  nickname: u.nickname,
  avatarUrl: u.avatar_url,
  createdAt: u.created_at,
});

export const mapGeneration = (r: GenerationRow): GenerationVO => ({
  id: r.id,
  presetKey: r.preset_key,
  intensity: r.intensity,
  seed: r.seed,
  watermark: r.watermark,
  resize: !!r.resize,
  originalName: r.original_name,
  resultUrl: fileUrl(r.result_file),
  resultWidth: r.result_width,
  resultHeight: r.result_height,
  ageYears: r.age_years,
  ageUploads: r.age_uploads,
  ageScreenshots: r.age_screenshots,
  ageCompressions: r.age_compressions,
  isPublic: !!r.is_public,
  title: r.title,
  likeCount: r.like_count ?? 0,
  publishedAt: r.published_at,
  createdAt: r.created_at,
});

export const mapGallery = (r: GalleryRow): GalleryVO => ({
  id: r.id,
  presetKey: r.preset_key,
  intensity: r.intensity,
  title: r.title,
  resultUrl: fileUrl(r.result_file),
  resultWidth: r.result_width,
  resultHeight: r.result_height,
  ageYears: r.age_years,
  likeCount: r.like_count,
  publishedAt: r.published_at,
  authorName: r.author_name,
  likedByMe: !!r.liked,
});
