export interface Community {
  id: string;
  name: string;
  description: string | null;
  creator_id: string;
  is_private: boolean;
  member_count: number;
  created_at: string;
  updated_at: string;
  cover_image: string | null;
  video_url: string | null; // New field
  price: number | null; // New field
  discounted_price: number | null; // New field
  seats_left: number | null; // New field
  offer_end_time: string | null; // New field
  bonus_1: string | null; // New field
  bonus_2: string | null; // New field
  bonus_3: string | null; // New field
  is_paid: boolean; // New field
  creator?: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}