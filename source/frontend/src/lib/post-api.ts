import { api } from "./api";
import { API_ENDPOINTS } from "./constants";
import type { Post, PostFile, Comment, Like, PostDateCount } from "@/types/post";
import type { PaginatedResponse } from "@/types/api";

export const postApi = {
  /**
   * 投稿一覧を取得
   */
  getPosts(params: {
    date?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Post>> {
    const query: Record<string, string> = {};
    if (params.date) query.date = params.date;
    if (params.page) query.page = String(params.page);
    if (params.limit) query.limit = String(params.limit);
    return api.get<PaginatedResponse<Post>>(API_ENDPOINTS.POSTS, query);
  },

  /**
   * 日付ごとの投稿件数を取得
   */
  getDateCounts(startDate: string, endDate: string): Promise<PostDateCount[]> {
    return api.get<PostDateCount[]>(API_ENDPOINTS.POST_DATES, {
      start_date: startDate,
      end_date: endDate,
    });
  },

  /**
   * 投稿を1件取得
   */
  getPostById(id: string): Promise<Post> {
    return api.get<Post>(API_ENDPOINTS.POST_BY_ID(id));
  },

  /**
   * 投稿を作成（ファイル添付対応）
   */
  createPost(data: {
    content: string;
    postDate: string;
    title?: string;
    files?: File[];
  }): Promise<Post> {
    if (data.files && data.files.length > 0) {
      const formData = new FormData();
      formData.append("content", data.content);
      formData.append("postDate", data.postDate);
      if (data.title) formData.append("title", data.title);
      data.files.forEach((f) => formData.append("files", f));
      return api.request<Post>(API_ENDPOINTS.POSTS, {
        method: "POST",
        body: formData,
      });
    }
    return api.post<Post>(API_ENDPOINTS.POSTS, {
      content: data.content,
      postDate: data.postDate,
      title: data.title,
    });
  },

  /**
   * 投稿を更新
   */
  updatePost(id: string, data: { content: string; postDate?: string }): Promise<Post> {
    return api.put<Post>(API_ENDPOINTS.POST_BY_ID(id), data);
  },

  /**
   * 投稿を削除
   */
  deletePost(id: string): Promise<void> {
    return api.delete<void>(API_ENDPOINTS.POST_BY_ID(id));
  },

  /**
   * いいねする
   */
  likePost(id: string, reactionType?: string): Promise<void> {
    return api.post<void>(API_ENDPOINTS.POST_LIKE(id), { reactionType: reactionType ?? "like" });
  },

  /**
   * いいね解除
   */
  unlikePost(id: string): Promise<void> {
    return api.delete<void>(API_ENDPOINTS.POST_UNLIKE(id));
  },

  /**
   * いいね一覧を取得
   */
  getLikes(id: string): Promise<Like[]> {
    return api.get<Like[]>(`/posts/${id}/likes`);
  },

  /**
   * コメント一覧を取得
   */
  getComments(
    postId: string,
    page?: number,
  ): Promise<PaginatedResponse<Comment>> {
    const query: Record<string, string> = {};
    if (page) query.page = String(page);
    return api.get<PaginatedResponse<Comment>>(
      API_ENDPOINTS.POST_COMMENTS(postId),
      query,
    );
  },

  /**
   * コメントを投稿
   */
  createComment(postId: string, content: string): Promise<Comment> {
    return api.post<Comment>(API_ENDPOINTS.POST_COMMENTS(postId), { content });
  },

  /**
   * コメントを削除
   */
  deleteComment(commentId: string): Promise<void> {
    return api.delete<void>(`/comments/${commentId}`);
  },
};
