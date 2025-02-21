export interface Course {
  id: string;
  title: string;
  description: string | null;
  community_id: string;
  creator_id: string;
  cover_image: string | null;
  price: number;
  created_at: string;
  updated_at: string;
  sections?: CourseSection[];
}

export interface CourseSection {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  lessons?: CourseLesson[];
}

export interface CourseLesson {
  id: string;
  section_id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null; // Add this field for thumbnails
  duration: number; // Duration in seconds
  order_index: number;
}

export interface UserProgress {
  user_id: string;
  lesson_id: string;
  completed_at: string;
}