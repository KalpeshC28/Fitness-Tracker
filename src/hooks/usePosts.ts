// hooks/usePosts.ts
import { useState, useEffect } from 'react';
import { Post, Comment } from '../types/post';
import { useAuth } from '../context/AuthContext';
import { useActiveCommunity } from '../context/ActiveCommunityContext';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export const usePosts = () => {
  const { supabase, user } = useAuth();
  const { activeCommunityId } = useActiveCommunity();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCommName, setActiveCommName] = useState('All Communities');

  const fetchPosts = async (tab: string = 'community') => {
    try {
      setRefreshing(true);
      const { data: memberOf, error: memberError } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user?.id)
        .eq('status', 'active');

      if (memberError) throw memberError;

      const communityIds = memberOf?.map(m => m.community_id) || [];
      let query = supabase
        .from('posts')
        .select(`
          id, content, media_urls, media_type, author_id, community_id, 
          likes_count, comments_count, created_at, updated_at,
          author:profiles(id, full_name, username, avatar_url),
          community:communities(id, name),
          likes(user_id),
          comments(id, content, user_id, created_at, profiles(full_name, username, avatar_url))
        `)
        .order('created_at', { ascending: false });

      if (activeCommunityId) {
        query = query.eq('community_id', activeCommunityId);
      } else {
        query = query.in('community_id', communityIds);
      }

      if (tab === 'announcements') {
        const { data: admins, error: adminError } = await supabase
          .from('community_members')
          .select('user_id')
          .eq('community_id', activeCommunityId)
          .eq('role', 'admin');
        if (adminError) throw adminError;
        const adminIds = admins?.map(a => a.user_id) || [];
        query = query.in('author_id', adminIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      const enrichedPosts: Post[] = data?.map((post: any) => ({
        id: post.id,
        content: post.content,
        media_urls: post.media_urls || [],
        media_type: post.media_type || 'none',
        author_id: post.author_id,
        community_id: post.community_id || null,
        likes_count: post.likes_count || 0,
        comments_count: post.comments_count || 0,
        created_at: post.created_at,
        updated_at: post.updated_at,
        isLiked: post.likes.some((like: { user_id: string }) => like.user_id === user?.id),
        comments: post.comments.map((comment: any) => ({
          id: comment.id,
          content: comment.content,
          user_id: comment.user_id,
          created_at: comment.created_at,
          author: {
            full_name: comment.profiles?.full_name || null,
            username: comment.profiles?.username || null,
            avatar_url: comment.profiles?.avatar_url || null,
          },
        })),
        author: post.author
          ? {
              id: post.author.id,
              full_name: post.author.full_name || null,
              username: post.author.username || null,
              avatar_url: post.author.avatar_url || null,
            }
          : undefined,
        community: post.community
          ? { id: post.community.id, name: post.community.name }
          : undefined,
      })) || [];

      setPosts(enrichedPosts);

      // Set activeCommName based on activeCommunityId
      if (activeCommunityId) {
        const { data: communityData, error: communityError } = await supabase
          .from('communities')
          .select('name')
          .eq('id', activeCommunityId)
          .single();
        if (communityError) throw communityError;
        setActiveCommName(communityData?.name || 'Unknown Community');
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
    fetchPosts('community');

    const postsChannel = supabase
      .channel('posts_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        (payload: RealtimePostgresChangesPayload<any>) => {
          setPosts((prevPosts) => {
            if (payload.eventType === 'INSERT') {
              const newPost: Post = {
                id: payload.new.id,
                content: payload.new.content,
                media_urls: payload.new.media_urls || [],
                media_type: payload.new.media_type || 'none',
                author_id: payload.new.author_id,
                community_id: payload.new.community_id || null,
                likes_count: payload.new.likes_count || 0,
                comments_count: payload.new.comments_count || 0,
                created_at: payload.new.created_at,
                updated_at: payload.new.updated_at,
                isLiked: false,
                comments: [],
                author: undefined, // Fetch author separately if needed
                community: undefined, // Fetch community separately if needed
              };
              return [newPost, ...prevPosts];
            } else if (payload.eventType === 'UPDATE') {
              return prevPosts.map(post =>
                post.id === payload.new.id ? { ...post, ...payload.new } : post
              );
            } else if (payload.eventType === 'DELETE') {
              return prevPosts.filter(post => post.id !== payload.old.id);
            }
            return prevPosts;
          });
        }
      )
      .subscribe();

    const likesChannel = supabase
      .channel('likes_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () =>
        fetchPosts()
      )
      .subscribe();

    const commentsChannel = supabase
      .channel('comments_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments' },
        async (payload: RealtimePostgresChangesPayload<any>) => {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, username, avatar_url')
            .eq('id', payload.new.user_id)
            .single();

          if (profileError) {
            console.error('Error fetching profile for comment:', profileError);
            return;
          }

          const newComment: Comment = {
            id: payload.new.id,
            content: payload.new.content,
            user_id: payload.new.user_id,
            created_at: payload.new.created_at,
            author: {
              full_name: profile?.full_name || null,
              username: profile?.username || null,
              avatar_url: profile?.avatar_url || null,
            },
          };

          setPosts(prevPosts =>
            prevPosts.map(post =>
              post.id === payload.new.post_id
                ? { ...post, comments: [...post.comments, newComment] }
                : post
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, [activeCommunityId]);

  return { posts, loading, refreshing, fetchPosts, activeCommName };
};