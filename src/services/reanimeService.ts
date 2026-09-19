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
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data) && json.data.length > 0) {
          return json;
        }
      }
    } catch {
      // fallback to Jikan API directly on client
    }

    // Direct client fallback to Jikan API (CORS friendly)
    try {
      const jRes = await fetch(`https://api.jikan.moe/v4/seasons/now?page=${page}&limit=${limit}`);
      if (jRes.ok) {
        const jData = await jRes.json();
        const mapped: ReanimeAnimeItem[] = (jData.data || []).map((item: any) => ({
          anime_id: String(item.mal_id),
          mal_id: item.mal_id,
          title: {
            english: item.title_english || item.title,
            romaji: item.title
          },
          cover_image: item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url || '',
          banner_image: item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url || '',
          description: item.synopsis || '',
          format: item.type || 'TV',
          episodes: item.episodes,
          average_score: item.score ? Math.round(item.score * 10) : 85,
          subbed: true,
          dubbed: true,
          episode: {
            episode_number: 1,
            title: `Episode 1`,
            playable: true
          }
        }));
        return { data: mapped, has_more: jData.pagination?.has_next_page ?? false };
      }
    } catch (e) {
      console.warn('Jikan fallback error:', e);
    }

    return { data: [], has_more: false };
  },

  async getUpcoming(page = 1, limit = 24): Promise<{ data: ReanimeAnimeItem[]; has_more: boolean }> {
    try {
      const res = await fetch(`/api/reanime/upcoming?page=${page}&limit=${limit}`);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data) && json.data.length > 0) {
          return json;
        }
      }
    } catch {
      // fallback
    }

    try {
      const jRes = await fetch(`https://api.jikan.moe/v4/seasons/upcoming?page=${page}&limit=${limit}`);
      if (jRes.ok) {
        const jData = await jRes.json();
        const mapped: ReanimeAnimeItem[] = (jData.data || []).map((item: any) => ({
          anime_id: String(item.mal_id),
          mal_id: item.mal_id,
          title: {
            english: item.title_english || item.title,
            romaji: item.title
          },
          cover_image: item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url || '',
          banner_image: item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url || '',
          description: item.synopsis || '',
          format: item.type || 'TV',
          episodes: item.episodes,
          average_score: item.score ? Math.round(item.score * 10) : 82,
          subbed: true,
          dubbed: false
        }));
        return { data: mapped, has_more: jData.pagination?.has_next_page ?? false };
      }
    } catch (e) {
      console.warn('Jikan upcoming fallback error:', e);
    }

    return { data: [], has_more: false };
  },

  async getSchedule(): Promise<{ schedule: ReanimeScheduleDay[]; timezone?: string }> {
    try {
      const res = await fetch('/api/reanime/schedule');
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.schedule) && json.schedule.length > 0) {
          return json;
        }
      }
    } catch {
      // fallback
    }

    try {
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const jRes = await fetch('https://api.jikan.moe/v4/schedules?filter=monday');
      if (jRes.ok) {
        const jData = await jRes.json();
        const schedule: ReanimeScheduleDay[] = days.map((day) => ({
          day: day.charAt(0).toUpperCase() + day.slice(1),
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          anime: (jData.data || []).slice(0, 5).map((a: any) => ({
            anime_id: String(a.mal_id),
            title: a.title_english || a.title,
            cover_image: a.images?.webp?.image_url || a.images?.jpg?.image_url || '',
            episode: 1,
            airing_time: '18:00 JST',
            subbed: true,
            dubbed: true
          }))
        }));
        return { schedule };
      }
    } catch (e) {
      console.warn('Schedule fallback error:', e);
    }

    return { schedule: [] };
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
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.anime) && json.anime.length > 0) {
          return json;
        }
      }
    } catch {
      // fallback
    }

    try {
      const jRes = await fetch('https://api.jikan.moe/v4/top/anime?filter=bypopularity&limit=10');
      if (jRes.ok) {
        const jData = await jRes.json();
        const mapped = (jData.data || []).map((item: any, idx: number) => ({
          anime_id: String(item.mal_id),
          title: {
            english: item.title_english || item.title,
            romaji: item.title
          },
          cover_image: item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url || '',
          score: item.score || 9.0,
          rank: idx + 1,
          genres: (item.genres || []).map((g: any) => g.name),
          format: item.type || 'TV'
        }));
        return { anime: mapped };
      }
    } catch (e) {
      console.warn('Leaderboard fallback error:', e);
    }

    return { anime: [] };
  },

  async search(query: string, limit = 20): Promise<ReanimeAnimeItem[]> {
    try {
      const res = await fetch(`/api/reanime/search?q=${encodeURIComponent(query)}&limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.results) && data.results.length > 0) {
          return data.results;
        }
      }
    } catch {
      // fallback
    }

    try {
      const jRes = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=${limit}`);
      if (jRes.ok) {
        const jData = await jRes.json();
        return (jData.data || []).map((item: any) => ({
          anime_id: String(item.mal_id),
          mal_id: item.mal_id,
          title: {
            english: item.title_english || item.title,
            romaji: item.title
          },
          cover_image: item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url || '',
          description: item.synopsis || '',
          format: item.type || 'TV',
          episodes: item.episodes,
          average_score: item.score ? Math.round(item.score * 10) : 80,
          subbed: true,
          dubbed: true
        }));
      }
    } catch (e) {
      console.warn('Search fallback error:', e);
    }

    return [];
  },

  async getAnimeBySlug(slug: string): Promise<any> {
    try {
      const res = await fetch(`/api/reanime/anime/${encodeURIComponent(slug)}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }

    // Direct Jikan fallback if slug is numeric MAL ID
    if (/^\d+$/.test(slug)) {
      try {
        const jRes = await fetch(`https://api.jikan.moe/v4/anime/${slug}/full`);
        if (jRes.ok) {
          const jData = await jRes.json();
          const item = jData.data;
          return {
            anime_id: String(item.mal_id),
            mal_id: item.mal_id,
            title: {
              english: item.title_english || item.title,
              romaji: item.title
            },
            cover_image: item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url || '',
            banner_image: item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url || '',
            description: item.synopsis || '',
            format: item.type || 'TV',
            episodes: item.episodes,
            status: item.status,
            genres: (item.genres || []).map((g: any) => g.name),
            average_score: item.score ? Math.round(item.score * 10) : 85,
            trailer: item.trailer?.embed_url || item.trailer?.url || null
          };
        }
      } catch (e) {
        console.warn('Anime detail fallback error:', e);
      }
    }

    return null;
  },

  async getEpisodes(slug: string): Promise<ReanimeEpisodeInfo[]> {
    try {
      const res = await fetch(`/api/reanime/anime/${encodeURIComponent(slug)}/episodes`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.data) && data.data.length > 0) {
          return data.data;
        }
      }
    } catch {
      // fallback
    }

    // Direct Jikan fallback if slug is numeric
    if (/^\d+$/.test(slug)) {
      try {
        const jRes = await fetch(`https://api.jikan.moe/v4/anime/${slug}/episodes`);
        if (jRes.ok) {
          const jData = await jRes.json();
          if (Array.isArray(jData.data) && jData.data.length > 0) {
            return jData.data.map((ep: any) => ({
              episode_number: ep.mal_id,
              title: ep.title || `Episode ${ep.mal_id}`,
              aired: ep.aired,
              duration: 24,
              subbed: true,
              dubbed: true,
              playable: true
            }));
          }
        }
      } catch (e) {
        console.warn('Episodes fallback error:', e);
      }
    }

    return [];
  }
};
