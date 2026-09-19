import axios from 'axios';

const JIKAN_API_URL = 'https://api.jikan.moe/v4';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// In-memory cache & in-flight request deduplication to prevent repeated calls & 429 rate limits
const memoryCache = new Map<string, { data: any; expiry: number }>();
const inFlightRequests = new Map<string, Promise<any>>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache

function getCachedData<T>(key: string): T | null {
  // Check memory cache first (fastest)
  const mem = memoryCache.get(key);
  if (mem && mem.expiry > Date.now()) {
    return mem.data as T;
  }

  // Check sessionStorage
  try {
    const raw = sessionStorage.getItem(`yuva_cache_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.expiry > Date.now()) {
        memoryCache.set(key, parsed);
        return parsed.data as T;
      }
      sessionStorage.removeItem(`yuva_cache_${key}`);
    }
  } catch {
    // Ignore storage issues
  }
  return null;
}

function setCachedData(key: string, data: any, ttl = CACHE_TTL_MS) {
  const item = { data, expiry: Date.now() + ttl };
  memoryCache.set(key, item);
  try {
    sessionStorage.setItem(`yuva_cache_${key}`, JSON.stringify(item));
  } catch {
    // Storage might be full or disabled, memory cache handles it
  }
}

async function fetchWithRetry(url: string, retries = 2, delay = 800) {
  // Check cache first
  const cached = getCachedData(url);
  if (cached) {
    return cached;
  }

  // Deduplicate in-flight request for identical URL
  if (inFlightRequests.has(url)) {
    return inFlightRequests.get(url);
  }

  const fetchPromise = (async () => {
    try {
      const response = await axios.get(url, { timeout: 8000 });
      const data = response.data.data;
      if (data) {
        setCachedData(url, data);
      }
      return data;
    } catch (error: any) {
      if (error.response?.status === 429 && retries > 0) {
        console.warn(`Rate limited by Jikan API. Retrying in ${delay}ms... (${retries} left)`);
        await sleep(delay);
        return fetchWithRetry(url, retries - 1, delay * 1.5);
      }
      // If we have stale cache, return it rather than failing
      const stale = memoryCache.get(url);
      if (stale) return stale.data;
      throw error;
    } finally {
      inFlightRequests.delete(url);
    }
  })();

  inFlightRequests.set(url, fetchPromise);
  return fetchPromise;
}

export interface AnimeSeason {
  id: number | string;
  mal_id?: number;
  anilist_id?: number;
  relationType: string;
  title: string;
  format?: string;
  status?: string;
  episodes?: number;
  year?: number;
  image?: string;
}

export interface AnimeRecommendation {
  id: number | string;
  mal_id?: number;
  anilist_id?: number;
  title: string;
  image: string;
  score: number;
  matchPercent: number;
  format?: string;
  episodes?: number;
  genres?: string[];
  synopsis?: string;
}

export interface Anime {
  mal_id: number;
  title: string;
  title_english?: string | null;
  title_japanese?: string | null;
  banner_image?: string;
  matchPercent?: number;
  images: {
    webp: {
      image_url: string;
      large_image_url: string;
    }
  };
  synopsis: string;
  type: string;
  episodes: number;
  status: string;
  score: number;
  rank: number;
  genres: { name: string }[];
  studios: { name: string }[];
  aired: { string: string };
  trailer: { embed_url?: string; youtube_id?: string; url?: string; thumbnail?: string };
  seasons?: AnimeSeason[];
  recommendations?: AnimeRecommendation[];
}

export const ONGOING_FALLBACK_ANIME: Anime[] = [
  {
    mal_id: 52299,
    title: "Solo Leveling",
    images: {
      webp: {
        image_url: "https://cdn.myanimelist.net/images/anime/1769/147321.webp",
        large_image_url: "https://cdn.myanimelist.net/images/anime/1769/147321l.webp"
      }
    },
    synopsis: "Ten years ago, the 'Gate' appeared and connected the real world with the realm of magic and monsters. To combat these vile beasts, ordinary people received superhuman powers and became known as 'Hunters.' Sung Jinwoo, known as the 'Weakest Hunter of All Mankind,' awakens a secret quest system.",
    type: "TV",
    episodes: 12,
    status: "Currently Airing",
    score: 8.52,
    rank: 1,
    genres: [{ name: "Action" }, { name: "Fantasy" }],
    studios: [{ name: "A-1 Pictures" }],
    aired: { string: "Jan 2024 to Ongoing" },
    trailer: { embed_url: "https://www.youtube-nocookie.com/embed/sFmHekR925A" }
  },
  {
    mal_id: 21,
    title: "One Piece: Egghead Arc",
    images: {
      webp: {
        image_url: "https://cdn.myanimelist.net/images/anime/6/73245.webp",
        large_image_url: "https://cdn.myanimelist.net/images/anime/6/73245l.webp"
      }
    },
    synopsis: "Barely surviving in a barrel arriving on shores, Monkey D. Luffy sets out on a journey with his crew to find the legendary treasure 'One Piece' and claim the title of Pirate King. The Egghead Island arc pushes the Straw Hats into the futuristic realm of Dr. Vegapunk.",
    type: "TV",
    episodes: 1120,
    status: "Currently Airing",
    score: 8.73,
    rank: 2,
    genres: [{ name: "Action" }, { name: "Adventure" }, { name: "Fantasy" }],
    studios: [{ name: "Toei Animation" }],
    aired: { string: "Oct 1999 to Ongoing" },
    trailer: { embed_url: "https://www.youtube-nocookie.com/embed/S8_YwFLCh4U" }
  },
  {
    mal_id: 57334,
    title: "DAN DA DAN",
    images: {
      webp: {
        image_url: "https://cdn.myanimelist.net/images/anime/1758/141208.webp",
        large_image_url: "https://cdn.myanimelist.net/images/anime/1758/141208l.webp"
      }
    },
    synopsis: "Momo Ayase, a high school girl who believes in ghosts, and Okarun, an occult nerd who believes in aliens, find themselves embroiled in a wild battle against supernatural yokai and extraterrestrial entities threatening their world.",
    type: "TV",
    episodes: 12,
    status: "Currently Airing",
    score: 8.64,
    rank: 3,
    genres: [{ name: "Action" }, { name: "Supernatural" }, { name: "Comedy" }],
    studios: [{ name: "Science SARU" }],
    aired: { string: "Oct 2024 to Ongoing" },
    trailer: { embed_url: "https://www.youtube-nocookie.com/embed/o0Qy259G0U8" }
  },
  {
    mal_id: 51009,
    title: "Jujutsu Kaisen: Shibuya Incident",
    images: {
      webp: {
        image_url: "https://cdn.myanimelist.net/images/anime/1792/138022.webp",
        large_image_url: "https://cdn.myanimelist.net/images/anime/1792/138022l.webp"
      }
    },
    synopsis: "On October 31st, a curtain falls over Shibuya, trapping countless civilians. To rescue them, Satoru Gojo descends into the depths of Shibuya station alone, walking directly into Kenjaku's deadly trap.",
    type: "TV",
    episodes: 23,
    status: "Currently Airing",
    score: 8.82,
    rank: 4,
    genres: [{ name: "Action" }, { name: "Dark Fantasy" }, { name: "Supernatural" }],
    studios: [{ name: "MAPPA" }],
    aired: { string: "Jul 2023 to Ongoing" },
    trailer: { embed_url: "https://www.youtube-nocookie.com/embed/pkZXflqUeew" }
  },
  {
    mal_id: 55701,
    title: "Demon Slayer: Kimetsu no Yaiba",
    images: {
      webp: {
        image_url: "https://cdn.myanimelist.net/images/anime/1065/141697.webp",
        large_image_url: "https://cdn.myanimelist.net/images/anime/1065/141697l.webp"
      }
    },
    synopsis: "Tanjiro Kamado trains with the strongest Demon Slayer Corps swordsmen, the Hashira, preparing for the looming final battle against the demon progenitor Muzan Kibutsuji.",
    type: "TV",
    episodes: 8,
    status: "Currently Airing",
    score: 8.68,
    rank: 5,
    genres: [{ name: "Action" }, { name: "Historical" }, { name: "Supernatural" }],
    studios: [{ name: "ufotable" }],
    aired: { string: "May 2024 to Ongoing" },
    trailer: { embed_url: "https://www.youtube-nocookie.com/embed/3d0yTzQ_6Kk" }
  },
  {
    mal_id: 41467,
    title: "Bleach: Thousand-Year Blood War",
    images: {
      webp: {
        image_url: "https://cdn.myanimelist.net/images/anime/1908/135406.webp",
        large_image_url: "https://cdn.myanimelist.net/images/anime/1908/135406l.webp"
      }
    },
    synopsis: "The peace is suddenly broken when warning sirens blare through the Soul Society. Residents are disappearing without a trace, and nobody knows who is behind it. A dark shadow extends toward Ichigo and his Soul Reaper comrades.",
    type: "TV",
    episodes: 13,
    status: "Currently Airing",
    score: 9.03,
    rank: 6,
    genres: [{ name: "Action" }, { name: "Supernatural" }],
    studios: [{ name: "Studio Pierrot" }],
    aired: { string: "Oct 2022 to Ongoing" },
    trailer: { embed_url: "https://www.youtube-nocookie.com/embed/78WIYzX_Bks" }
  }
];

export const animeService = {
  async getOngoing(): Promise<Anime[]> {
    try {
      const data = await fetchWithRetry(`${JIKAN_API_URL}/seasons/now?limit=10`);
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (err) {
      console.warn("Seasons/now endpoint rate limited, trying airing top", err);
    }

    try {
      const data = await fetchWithRetry(`${JIKAN_API_URL}/top/anime?filter=airing&limit=10`);
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (err) {
      console.warn("Top airing endpoint rate limited, using curated ongoing list", err);
    }

    return ONGOING_FALLBACK_ANIME;
  },

  async getTrending() {
    return fetchWithRetry(`${JIKAN_API_URL}/top/anime?filter=airing&limit=10`);
  },

  async getPopular() {
    const cacheKey = `${JIKAN_API_URL}/top/anime?limit=20`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;
    // Small stagger to avoid hitting the 3 req/sec limit when initial cold load calls together
    await sleep(350); 
    return fetchWithRetry(cacheKey);
  },

  async getTopRated() {
    const cacheKey = `${JIKAN_API_URL}/top/anime?filter=bypopularity&limit=20`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;
    await sleep(250);
    return fetchWithRetry(cacheKey);
  },

  async searchAnime(query: string) {
    return fetchWithRetry(`${JIKAN_API_URL}/anime?q=${query}&limit=20`);
  },

  async getDetails(id: string): Promise<Anime> {
    const cacheKey = `anime_details_${id}`;
    const cached = getCachedData<Anime>(cacheKey);
    if (cached) return cached;

    // 1. Try our server-side resolver first (AniList GraphQL -> ReAnime -> Jikan)
    try {
      const res = await fetch(`/api/anime/details/${encodeURIComponent(id)}`);
      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          setCachedData(cacheKey, json.data);
          return json.data;
        }
      }
    } catch (e) {
      console.warn("Backend anime details resolver failed, trying direct client fallback", e);
    }

    // 2. Direct client fallback for numeric MAL ID
    if (/^\d+$/.test(id)) {
      try {
        const direct = await fetchWithRetry(`${JIKAN_API_URL}/anime/${id}/full`, 1, 500);
        if (direct) {
          setCachedData(cacheKey, direct);
          return direct;
        }
      } catch (e) {
        console.warn("Jikan fallback failed", e);
      }
    }

    // 3. Match from local fallback catalog
    const localMatch = ONGOING_FALLBACK_ANIME.find(
      a => String(a.mal_id) === id || a.title.toLowerCase().includes(id.toLowerCase().replace(/[-_]/g, ' '))
    );
    if (localMatch) {
      return localMatch;
    }

    // 4. Guaranteed non-null fallback
    const title = id.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const fallback: Anime = {
      mal_id: parseInt(id, 10) || 1,
      title,
      images: {
        webp: {
          image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
          large_image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80'
        }
      },
      synopsis: `Stream ${title} episodes in high definition on Yuva.`,
      type: 'TV',
      episodes: 24,
      status: 'Currently Airing',
      score: 8.5,
      rank: 1,
      genres: [{ name: 'Action' }, { name: 'Fantasy' }],
      studios: [{ name: 'Animation Studio' }],
      aired: { string: 'Ongoing' },
      trailer: {}
    };

    setCachedData(cacheKey, fallback);
    return fallback;
  },

  async getEpisodes(id: string) {
    return fetchWithRetry(`${JIKAN_API_URL}/anime/${id}/episodes`);
  },

  // Note: Jikan doesn't provide direct streaming links. 
  // For a real app, you'd use a provider like Consumet.
  // For this prototype, I'll mock the streaming URL or use a public embed if found.
  getStreamingUrl(id: string, episode: number) {
    // This is a placeholder for educational purposes
    return `https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1`; 
  }
};
