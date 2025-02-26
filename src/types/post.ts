// types/post.ts
export interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  author: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export interface Post {
  id: string;
  content: string;
  media_urls: string[];
  media_type: 'none' | 'image' | 'video';
  author_id: string;
  community_id: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  isLiked?: boolean;
  comments: Comment[];
  author?: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  community?: {
    id: string;
    name: string;
  };
}