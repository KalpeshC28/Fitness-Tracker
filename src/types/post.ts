export interface Post {
  id: string;
  content: string;
  media_urls: string[];
  media_type: 'none' | 'image' | 'video';
  author_id: string;
  community_id: string | null;
  likes_count:any;
  comments_count:any;
  created_at: string;
  updated_at: string;
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