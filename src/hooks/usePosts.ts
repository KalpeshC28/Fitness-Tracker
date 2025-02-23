import { useState, useEffect } from 'react';
import { Post } from '../types/post';
import { useAuth } from '../context/AuthContext';
import { useActiveCommunity } from '../context/ActiveCommunityContext';

export const usePosts = () => {
  const { supabase, user } = useAuth();
  const { activeCommunityId } = useActiveCommunity();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCommName, setActiveCommName] = useState('All Communities');

  const fetchPosts = async () => {
    try {
      setRefreshing(true);
      const { data: memberOf } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user?.id)
        .eq('status', 'active');

      const communityIds = memberOf?.map(m => m.community_id) || [];
      let query = supabase
        .from('posts')
        .select(`
          *,
          author:profiles(id, full_name, username, avatar_url),
          community:communities(id, name)
        `)
        .order('created_at', { ascending: false });

      if (activeCommunityId) {
        query = query.eq('community_id', activeCommunityId);
      } else {
        query = query.in('community_id', communityIds);
      }

      const { data } = await query;
      setPosts(data || []);

      if (activeCommunityId && data?.[0]?.community) {
        setActiveCommName(data[0].community.name);
      } else {
        setActiveCommName('All Communities');
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    const channel = supabase
      .channel('posts_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchPosts)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCommunityId]);

  return { posts, loading, refreshing, fetchPosts, activeCommName };
};