export interface Community {
  id: string;
  name: string;
  description: string | null;
  creator_id: string;
  cover_image: string | null;
  created_at: string;
  updated_at: string;
  is_private: boolean;
  member_count: number;
  creator?: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
} 