/** 后端 (Spring Boot) 返回的数据结构镜像。 */

export interface ApiResult<T> {
  code: number;
  message: string;
  data: T;
}

export interface PageResult<T> {
  total: number;
  page: number;
  size: number;
  records: T[];
}

export interface UserVO {
  id: number;
  username: string;
  email?: string | null;
  nickname?: string | null;
  avatarUrl?: string | null;
  createdAt?: string;
}

export interface LoginVO {
  token: string;
  user: UserVO;
}

export interface PresetVO {
  id: number;
  presetKey: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
  enabled?: number;
  baseYears?: number | null;
  baseUploads?: number | null;
  baseScreenshots?: number | null;
  baseCompressions?: number | null;
}

export interface GenerationVO {
  id: number;
  presetKey: string;
  intensity: number;
  seed?: string | null;
  watermark?: string | null;
  resize?: boolean;
  originalName?: string | null;
  resultUrl?: string | null;
  resultWidth?: number | null;
  resultHeight?: number | null;
  ageYears?: number | null;
  ageUploads?: number | null;
  ageScreenshots?: number | null;
  ageCompressions?: number | null;
  isPublic?: boolean;
  title?: string | null;
  likeCount?: number;
  publishedAt?: string | null;
  createdAt?: string;
}

export interface GalleryVO {
  id: number;
  presetKey: string;
  intensity: number;
  title?: string | null;
  resultUrl?: string | null;
  resultWidth?: number | null;
  resultHeight?: number | null;
  ageYears?: number | null;
  likeCount: number;
  publishedAt?: string | null;
  authorName: string;
  likedByMe: boolean;
}
