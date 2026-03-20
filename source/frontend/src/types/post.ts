import type { User } from "./user";

export interface PostFile {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
}

export interface Comment {
  id: string;
  content: string;
  author: User;
  createdAt: string;
  updatedAt: string;
}

export interface Like {
  id: string;
  userId: string;
  user: User;
  createdAt: string;
}

export interface Post {
  id: string;
  content: string;
  author: User;
  files: PostFile[];
  comments: Comment[];
  likes: Like[];
  likeCount: number;
  commentCount: number;
  isLikedByMe: boolean;
  postDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface PostDateCount {
  date: string;
  count: number;
}
