export interface ReanimeTitle {
  english?: string;
  romaji?: string;
  native?: string;
  user_preferred?: string;
}

export interface ReanimeEpisodeInfo {
  episode_number: number;
  title: string;
  title_japanese?: string;
  title_romanji?: string;
  aired?: string;
  duration?: number;
  subbed?: boolean;
  dubbed?: boolean;
  is_filler?: boolean;
  is_recap?: boolean;
  playable?: boolean;
  thumbnail?: string;
}

export interface ReanimeAnimeItem {
  anime_id: string;
  anilist_id?: number;
  mal_id?: number;
  title: ReanimeTitle;
  cover_image: string;
  banner_image?: string;
  description?: string;
  format?: string;
  status?: string;
  genres?: string[];
  season?: string;
  season_year?: number;
  episodes?: number;
  duration?: number;
  subbed?: number | boolean;
  dubbed?: number | boolean;
  average_score?: number;
  mal_score?: number;
  popularity?: number;
  episode?: {
    episode_number: number;
    title: string;
    aired?: string;
    playable?: boolean;
  };
}

export interface ReanimeCommunityPost {
  id: string;
  title: string;
  content: string;
  author_display_name?: string;
  author_id?: string;
  author_avatar?: string;
  author_role?: string;
  author_level?: number;
  category?: string;
  category_id?: string;
  flair?: string;
  images?: string[];
  votes: number;
  user_vote?: number;
  comments: number;
  views?: number;
  created_at?: string;
  time?: string;
  pinned?: boolean;
  slug?: string;
}

export interface ReanimeCategoryItem {
  id: number | string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: string;
  count?: number;
}

export interface ReanimeScheduleDay {
  day: string;
  date: string;
  anime: Array<{
    anime_id: string;
    anilist_id?: number;
    title: string | ReanimeTitle;
    cover_image?: string;
    banner_image?: string;
    episode?: number;
    airing_time?: string;
    genres?: string[];
    subbed?: boolean;
    dubbed?: boolean;
  }>;
}

export const reanimeService = {
  async getLatestAired(page = 1, limit = 24): Promise<{ data: ReanimeAnimeItem[]; has_more: boolean }> {
    try {
      const res = await fetch(`/api/reanime/latest-aired?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch latest aired');
      return await res.json();
    } catch (e) {
      console.warn('ReAnime latest aired fetch error:', e);
      return { data: [], has_more: false };
    }
  },

  async getUpcoming(page = 1, limit = 24): Promise<{ data: ReanimeAnimeItem[]; has_more: boolean }> {
    try {
      const res = await fetch(`/api/reanime/upcoming?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch upcoming');
      return await res.json();
    } catch (e) {
      console.warn('ReAnime upcoming fetch error:', e);
      return { data: [], has_more: false };
    }
  },

  async getSchedule(): Promise<{ schedule: ReanimeScheduleDay[]; timezone?: string }> {
    try {
      const res = await fetch('/api/reanime/schedule');
      if (!res.ok) throw new Error('Failed to fetch schedule');
      return await res.json();
    } catch (e) {
      console.warn('ReAnime schedule fetch error:', e);
      return { schedule: [] };
    }
  },

  async getCommunityPosts(page = 1, limit = 15, category?: string): Promise<{ posts: ReanimeCommunityPost[]; hasMore: boolean }> {
    try {
      const catParam = category ? `&category=${encodeURIComponent(category)}` : '';
      const res = await fetch(`/api/reanime/community/posts?page=${page}&limit=${limit}${catParam}`);
      if (!res.ok) throw new Error('Failed to fetch community posts');
      return await res.json();
    } catch (e) {
      console.warn('ReAnime community posts fetch error:', e);
      return { posts: [], hasMore: false };
    }
  },

  async getCommunityCategories(): Promise<ReanimeCategoryItem[]> {
    const fallback: ReanimeCategoryItem[] = [
      { id: 1, name: 'General', slug: 'general', count: 6290 },
      { id: 2, name: 'News', slug: 'news', count: 28 },
      { id: 3, name: 'Recommendations', slug: 'recommendations', count: 301 },
      { id: 4, name: 'Art & Media', slug: 'art-media', count: 13 },
      { id: 5, name: 'Discussion', slug: 'discussion', count: 122 },
      { id: 6, name: 'Help & Support', slug: 'help-support', count: 364 },
      { id: 7, name: 'Feedback', slug: 'feedback', count: 220 }
    ];

    try {
      const res = await fetch('/api/reanime/community/categories');
      if (!res.ok) throw new Error('Failed to fetch categories');
      const data = await res.json();
      if (Array.isArray(data.categories)) {
        return data.categories.map((c: any) => {
          if (typeof c === 'string') {
            return { id: c, name: c, slug: c.toLowerCase().replace(/\s+/g, '-') };
          }
          return {
            id: c.id ?? c.slug,
            name: c.name || c.slug,
            slug: c.slug || String(c.id),
            description: c.description,
            color: c.color,
            icon: c.icon,
            count: c.count
          };
        });
      }
      return fallback;
    } catch {
      return fallback;
    }
  },

  async getLeaderboard(range: 'day' | 'week' | 'month' | 'all' = 'week'): Promise<{ anime: any[]; ranking?: any[] }> {
    try {
      const res = await fetch(`/api/reanime/leaderboard?range=${range}`);
      if (!res.ok) throw new Error('Failed to fetch leaderboard');
      return await res.json();
    } catch (e) {
      console.warn('ReAnime leaderboard fetch error:', e);
      return { anime: [] };
    }
  },

  async search(query: string, limit = 20): Promise<ReanimeAnimeItem[]> {
    try {
      const res = await fetch(`/api/reanime/search?q=${encodeURIComponent(query)}&limit=${limit}`);
      if (!res.ok) throw new Error('Failed to search ReAnime');
      const data = await res.json();
      return data.results || [];
    } catch (e) {
      console.warn('ReAnime search error:', e);
      return [];
    }
  },

  async getAnimeBySlug(slug: string): Promise<any> {
    try {
      const res = await fetch(`/api/reanime/anime/${encodeURIComponent(slug)}`);
      if (!res.ok) throw new Error('Failed to fetch anime details');
      return await res.json();
    } catch (e) {
      console.warn('ReAnime getAnimeBySlug error:', e);
      return null;
    }
  },

  async getEpisodes(slug: string): Promise<ReanimeEpisodeInfo[]> {
    try {
      const res = await fetch(`/api/reanime/anime/${encodeURIComponent(slug)}/episodes`);
      if (!res.ok) throw new Error('Failed to fetch episodes');
      const data = await res.json();
      return data.data || [];
    } catch (e) {
      console.warn('ReAnime getEpisodes error:', e);
      return [];
    }
  }
};
