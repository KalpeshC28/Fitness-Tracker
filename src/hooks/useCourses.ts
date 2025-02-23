import { useState, useEffect } from 'react';
import { Course } from '../types/course';
import { useAuth } from '../context/AuthContext';
import { useActiveCommunity } from '../context/ActiveCommunityContext';

export const useCourses = () => {
  const { supabase } = useAuth();
  const { activeCommunityId } = useActiveCommunity();
  const [courses, setCourses] = useState<Course[]>([]);

  const fetchCourses = async () => {
    if (!activeCommunityId) return;

    try {
      const { data } = await supabase
        .from('courses')
        .select(`
          *,
          sections:course_sections(
            *,
            lessons:course_lessons(id, title, description, video_url, duration, order_index, thumbnail_url)
          )
        `)
        .eq('community_id', activeCommunityId)
        .order('created_at', { ascending: false });

      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  return { courses, fetchCourses };
};