export interface Post {
  id: string;
  content: string;
  media_urls: string[];
  author_id: string;
  community_id: string | null;
  created_at: string;
  updated_at: string;
  likes_count: number;
  comments_count: number;
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