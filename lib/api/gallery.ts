import { request } from "./client";
import type { GalleryVO, PageResult } from "./types";

export type GallerySort = "new" | "hot";

/** 公开:作品广场列表(登录时会带上 likedByMe)。 */
export function apiListGallery(
  sort: GallerySort = "new",
  page = 1,
  size = 12,
): Promise<PageResult<GalleryVO>> {
  return request<PageResult<GalleryVO>>("/api/gallery", {
    auth: true, // 带上 token(有就带,没有也不报错)以便返回是否已点赞
    query: { sort, page, size },
  });
}

/** 公开:单个作品详情(分享链接用)。 */
export function apiGalleryDetail(id: number): Promise<GalleryVO> {
  return request<GalleryVO>(`/api/gallery/${id}`, { auth: true });
}

/** 点赞,返回最新点赞数。 */
export function apiLike(id: number): Promise<number> {
  return request<number>(`/api/gallery/${id}/like`, { method: "POST", auth: true });
}

/** 取消点赞,返回最新点赞数。 */
export function apiUnlike(id: number): Promise<number> {
  return request<number>(`/api/gallery/${id}/like`, { method: "DELETE", auth: true });
}
