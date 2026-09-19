import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

app.use(express.json());

// Enable CORS for all environments (Vercel previews, custom domains, local)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "Yuva API" });
});

// In-memory cache for ReAnime anime lookups
const reanimeCache = new Map<string, { slug: string; anilistId: number; title: string; tmdbId?: number }>();

// ReAnime Resolver Endpoint
app.get("/api/reanime/resolve", async (req, res) => {
    try {
      const rawTitle = (req.query.title as string) || "";
      const englishTitle = (req.query.englishTitle as string) || "";
      const ep = parseInt((req.query.ep as string) || "1", 10);
      const malId = (req.query.malId as string) || "";

      if (!rawTitle && !englishTitle && !malId) {
        return res.status(400).json({ error: "Title or MAL ID is required" });
      }

      // Title cleaning queries
      const queriesToTry = [
        rawTitle.replace(/\s*\([^)]*\)/g, "").replace(/\s*Season\s*\d+.*/i, "").trim(),
        englishTitle.replace(/\s*\([^)]*\)/g, "").replace(/\s*Season\s*\d+.*/i, "").trim(),
        rawTitle.trim(),
        englishTitle.trim()
      ].filter(Boolean);

      let anilistId = 0;

      // 1. Resolve anilistId from MAL ID or title first if numeric
      if (malId && /^\d+$/.test(malId)) {
        try {
          const numMalId = parseInt(malId, 10);
          const q = `query ($idMal: Int) { Media(idMal: $idMal, type: ANIME) { id title { english romaji } } }`;
          const alResp = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({ query: q, variables: { idMal: numMalId } })
          });
          if (alResp.ok) {
            const alData = await alResp.json();
            if (alData.data?.Media?.id) {
              anilistId = alData.data.Media.id;
            }
          }
        } catch (e) {
          console.warn("Could not resolve anilistId from MAL ID:", e);
        }
      }

      const cacheKey = (queriesToTry[0] || malId).toLowerCase();
      let animeMeta = reanimeCache.get(cacheKey);

      if (!animeMeta) {
        const headers = {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "application/json, */*"
        };

        for (const query of queriesToTry) {
          try {
            const searchUrl = `https://reanime.to/api/v1/search?q=${encodeURIComponent(query)}&limit=10`;
            const searchResp = await fetch(searchUrl, { headers });
            if (searchResp.ok) {
              const searchData = await searchResp.json();
              const results: any[] = searchData.results || [];
              if (results.length > 0) {
                // Find exact match by anilistId if known, or title match
                let matched = anilistId > 0 ? results.find((r: any) => r.anilist_id === anilistId) : null;
                if (!matched) {
                  const qLower = query.toLowerCase();
                  matched = results.find((r: any) => {
                    const en = (r.title?.english || "").toLowerCase();
                    const ro = (r.title?.romaji || "").toLowerCase();
                    return en.includes(qLower) || ro.includes(qLower) || qLower.includes(en) || qLower.includes(ro);
                  });
                }
                const top = matched || results[0];
                animeMeta = {
                  slug: top.anime_id,
                  anilistId: top.anilist_id || anilistId || 0,
                  title: top.title?.english || top.title?.romaji || query,
                  tmdbId: top.themoviedb_id
                };
                reanimeCache.set(cacheKey, animeMeta);
                break;
              }
            }
          } catch {
            // try next query variant
          }
        }
      }

      const slug = animeMeta?.slug || (queriesToTry[0] || "anime").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      if (!anilistId && animeMeta?.anilistId) {
        anilistId = animeMeta.anilistId;
      }

      // Fallback AniList lookup if still 0
      if (!anilistId && queriesToTry[0]) {
        try {
          const query = `query ($search: String) { Media(search: $search, type: ANIME) { id title { english romaji } } }`;
          const alResp = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({ query, variables: { search: queriesToTry[0] } })
          });
          if (alResp.ok) {
            const alData = await alResp.json();
            if (alData.data?.Media?.id) {
              anilistId = alData.data.Media.id;
            }
          }
        } catch (e) {
          console.error("AniList GraphQL fallback error:", e);
        }
      }

      // Dedicated pure video player embeds ONLY (Never open full website pages)
      const resolvedServers: Array<{
        id: string;
        name: string;
        type: "sub" | "dub" | "universal" | "custom";
        tag: string;
        quality: string;
        badge: string;
        url: string;
      }> = [];

      // Fetch live FlixCloud video player streams directly from ReAnime API
      if (anilistId > 0) {
        try {
          const flixUrl = `https://reanime.to/api/flix/${anilistId}/${ep}`;
          const flixResp = await fetch(flixUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              "Accept": "application/json, */*"
            }
          });

          if (flixResp.ok) {
            const flixData = await flixResp.json();
            const rawServers = flixData.servers || [];

            // ReAnime HD-1 Sub & Dub
            const hd1Sub = rawServers.find((s: any) => s.serverName === "HD-1" && s.dataType === "sub");
            const hd1Dub = rawServers.find((s: any) => s.serverName === "HD-1" && s.dataType === "dub");
            const hd1Any = rawServers.find((s: any) => s.serverName === "HD-1");

            if (hd1Sub?.dataLink || hd1Any?.dataLink) {
              const link = hd1Sub?.dataLink || hd1Any?.dataLink;
              resolvedServers.push({
                id: "server_1_sub",
                name: "Server 1 Sub",
                type: "sub",
                tag: "ReAnime HD-1",
                quality: "1080p Full HD",
                badge: "Server 1 Sub",
                url: `${link}${link.includes("?") ? "&" : "?"}autoPlay=true`
              });
            }

            if (hd1Dub?.dataLink || (hd1Any?.dataLink && rawServers.some((s: any) => s.dataType === "dub"))) {
              const link = hd1Dub?.dataLink || `${hd1Any.dataLink}${hd1Any.dataLink.includes("?") ? "&" : "?"}a=1`;
              resolvedServers.push({
                id: "server_1_dub",
                name: "Server 1 Dub",
                type: "dub",
                tag: "ReAnime HD-1 Dub",
                quality: "1080p Full HD",
                badge: "Server 1 Dub",
                url: `${link}${link.includes("?") ? "&" : "?"}autoPlay=true`
              });
            }

            // ReAnime HD-2 Sub & Dub
            const hd2Sub = rawServers.find((s: any) => s.serverName === "HD-2" && s.dataType === "sub");
            const hd2Dub = rawServers.find((s: any) => s.serverName === "HD-2" && s.dataType === "dub");
            const hd2Any = rawServers.find((s: any) => s.serverName === "HD-2");

            if (hd2Sub?.dataLink || hd2Any?.dataLink) {
              const link = hd2Sub?.dataLink || hd2Any?.dataLink;
              resolvedServers.push({
                id: "server_2_sub",
                name: "Server 2 Sub",
                type: "sub",
                tag: "ReAnime HD-2",
                quality: "1080p HD",
                badge: "Server 2 Sub",
                url: `${link}${link.includes("?") ? "&" : "?"}autoPlay=true`
              });
            }

            if (hd2Dub?.dataLink || (hd2Any?.dataLink && rawServers.some((s: any) => s.dataType === "dub"))) {
              const link = hd2Dub?.dataLink || `${hd2Any.dataLink}${hd2Any.dataLink.includes("?") ? "&" : "?"}a=1`;
              resolvedServers.push({
                id: "server_2_dub",
                name: "Server 2 Dub",
                type: "dub",
                tag: "ReAnime HD-2 Dub",
                quality: "1080p HD",
                badge: "Server 2 Dub",
                url: `${link}${link.includes("?") ? "&" : "?"}autoPlay=true`
              });
            }
          }
        } catch (e) {
          console.error("Error fetching ReAnime flix servers:", e);
        }
      }

      // Fallback ReAnime servers if Flix API temporarily returned empty
      if (resolvedServers.length === 0) {
        resolvedServers.push(
          {
            id: "server_1_sub",
            name: "Server 1 Sub",
            type: "sub",
            tag: "ReAnime HD-1",
            quality: "1080p Full HD",
            badge: "Server 1 Sub",
            url: `https://flixcloud.cc/e/${anilistId || malId || 'stream'}?v=1&autoPlay=true`
          },
          {
            id: "server_1_dub",
            name: "Server 1 Dub",
            type: "dub",
            tag: "ReAnime HD-1 Dub",
            quality: "1080p Full HD",
            badge: "Server 1 Dub",
            url: `https://flixcloud.cc/e/${anilistId || malId || 'stream'}?v=1&a=1&autoPlay=true`
          },
          {
            id: "server_2_sub",
            name: "Server 2 Sub",
            type: "sub",
            tag: "ReAnime HD-2",
            quality: "1080p HD",
            badge: "Server 2 Sub",
            url: `https://flixcloud.cc/e/${anilistId || malId || 'stream'}?v=2&autoPlay=true`
          },
          {
            id: "server_2_dub",
            name: "Server 2 Dub",
            type: "dub",
            tag: "ReAnime HD-2 Dub",
            quality: "1080p HD",
            badge: "Server 2 Dub",
            url: `https://flixcloud.cc/e/${anilistId || malId || 'stream'}?v=2&a=1&autoPlay=true`
          }
        );
      }

      // Vidstuck Standalone Server (ONLY ONE dedicated server)
      const targetId = anilistId || (malId && /^\d+$/.test(malId) ? malId : 101922);
      resolvedServers.push({
        id: "vidstuck",
        name: "Vidstuck Server",
        type: "universal",
        tag: "Vidstuck Cloud",
        quality: "1080p Multi-Audio",
        badge: "Vidstuck",
        url: `https://vidstuck.xyz/embed/anime/${targetId}/${ep}?dub=false`
      });

      res.json({
        success: true,
        slug,
        anilistId,
        title: animeMeta?.title || rawTitle,
        servers: resolvedServers
      });
    } catch (err: any) {
      console.error("ReAnime resolve error:", err);
      res.status(500).json({ error: "Failed to resolve ReAnime streams", details: err?.message });
    }
  });

  // Generic cached proxy helper for ReAnime API
  const apiCache = new Map<string, { data: any; expiresAt: number }>();
  async function fetchReanimeCached(endpoint: string, ttlMs = 60000) {
    const cached = apiCache.get(endpoint);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "application/json, */*"
    };
    const response = await fetch(`https://reanime.to${endpoint}`, { headers });
    if (!response.ok) {
      throw new Error(`ReAnime API error ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    apiCache.set(endpoint, { data, expiresAt: Date.now() + ttlMs });
    return data;
  }

  // ReAnime Latest Aired Episodes
  app.get("/api/reanime/latest-aired", async (req, res) => {
    try {
      const page = req.query.page || "1";
      const limit = req.query.limit || "24";
      const data = await fetchReanimeCached(`/api/v1/home/latest-aired?page=${page}&limit=${limit}`, 45000);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch latest episodes", details: err?.message });
    }
  });

  // ReAnime Upcoming Anime
  app.get("/api/reanime/upcoming", async (req, res) => {
    try {
      const page = req.query.page || "1";
      const limit = req.query.limit || "24";
      const data = await fetchReanimeCached(`/api/v1/home/upcoming?page=${page}&limit=${limit}`, 120000);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch upcoming anime", details: err?.message });
    }
  });

  // ReAnime Schedule
  app.get("/api/reanime/schedule", async (req, res) => {
    try {
      const data = await fetchReanimeCached("/api/v1/schedule", 300000);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch schedule", details: err?.message });
    }
  });

  // ReAnime Community Posts
  app.get("/api/reanime/community/posts", async (req, res) => {
    try {
      const page = req.query.page || "1";
      const limit = req.query.limit || "20";
      const cat = req.query.category ? `&category=${req.query.category}` : "";
      const data = await fetchReanimeCached(`/api/v1/community/posts?page=${page}&limit=${limit}${cat}`, 45000);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch community posts", details: err?.message });
    }
  });

  // ReAnime Community Categories
  app.get("/api/reanime/community/categories", async (req, res) => {
    try {
      const data = await fetchReanimeCached("/api/v1/community/categories", 600000);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch categories", details: err?.message });
    }
  });

  // ReAnime Leaderboard
  app.get("/api/reanime/leaderboard", async (req, res) => {
    try {
      const range = (req.query.range as string) || "week";
      const data = await fetchReanimeCached(`/api/v1/leaderboard?range=${encodeURIComponent(range)}`, 180000);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch leaderboard", details: err?.message });
    }
  });

  // ReAnime Anime Details
  app.get("/api/reanime/anime/:slug", async (req, res) => {
    try {
      const slug = req.params.slug;
      const data = await fetchReanimeCached(`/api/v1/anime/${encodeURIComponent(slug)}`, 300000);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch anime details", details: err?.message });
    }
  });

  // ReAnime Anime Episodes
  app.get("/api/reanime/anime/:slug/episodes", async (req, res) => {
    try {
      const slug = req.params.slug;
      const data = await fetchReanimeCached(`/api/v1/anime/${encodeURIComponent(slug)}/episodes`, 180000);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch episodes", details: err?.message });
    }
  });

  // ReAnime Search
  app.get("/api/reanime/search", async (req, res) => {
    try {
      const q = (req.query.q as string) || "";
      const limit = req.query.limit || "20";
      if (!q.trim()) return res.json({ results: [] });
      const data = await fetchReanimeCached(`/api/v1/search?q=${encodeURIComponent(q)}&limit=${limit}`, 60000);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to search anime", details: err?.message });
    }
  });

  // Universal Anime Details Resolver (AniList GraphQL -> ReAnime -> Jikan MAL -> Graceful Fallback)
  app.get("/api/anime/details/:id", async (req, res) => {
    const rawId = req.params.id;
    if (!rawId) {
      return res.status(400).json({ error: "Missing anime ID" });
    }

    const isNumeric = /^\d+$/.test(rawId);
    const numId = isNumeric ? parseInt(rawId, 10) : 0;
    const cleanSearch = rawId.replace(/[-_]/g, " ").trim();

    // Helper to format Media into rich Netflix-style object
    const formatMedia = (media: any) => {
      // 1. All Seasons and Relations
      const seasons: any[] = [];
      // Current anime as first/primary entry
      seasons.push({
        id: media.idMal || media.id,
        mal_id: media.idMal || media.id,
        anilist_id: media.id,
        relationType: "CURRENT",
        title: media.title?.english || media.title?.romaji || media.title?.userPreferred || cleanSearch,
        format: media.format || "TV",
        status: media.status || "Finished",
        episodes: media.episodes || 12,
        year: media.startDate?.year || null,
        image: media.coverImage?.large || media.coverImage?.medium || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600"
      });

      if (media.relations?.edges) {
        for (const edge of media.relations.edges) {
          const node = edge.node;
          if (!node || node.id === media.id) continue;
          if (["TV", "TV_SHORT", "MOVIE", "OVA", "ONA", "SPECIAL"].includes(node.format)) {
            seasons.push({
              id: node.idMal || node.id,
              mal_id: node.idMal || node.id,
              anilist_id: node.id,
              relationType: edge.relationType || "RELATED",
              title: node.title?.english || node.title?.romaji || "Season",
              format: node.format,
              status: node.status,
              episodes: node.episodes,
              year: node.seasonYear,
              image: node.coverImage?.large || node.coverImage?.medium || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600"
            });
          }
        }
      }

      // 2. More Like This Recommendations
      const recommendations: any[] = [];
      if (media.recommendations?.nodes) {
        for (const node of media.recommendations.nodes) {
          const rec = node.mediaRecommendation;
          if (rec && rec.id) {
            recommendations.push({
              id: rec.idMal || rec.id,
              mal_id: rec.idMal || rec.id,
              anilist_id: rec.id,
              title: rec.title?.english || rec.title?.romaji || "Anime",
              image: rec.coverImage?.large || rec.coverImage?.extraLarge || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600",
              score: rec.averageScore ? Number((rec.averageScore / 10).toFixed(1)) : 8.5,
              matchPercent: rec.averageScore ? Math.min(99, Math.max(76, rec.averageScore)) : 95,
              format: rec.format || "TV",
              episodes: rec.episodes || 12,
              genres: rec.genres || ["Action", "Adventure"],
              synopsis: (rec.description || "").replace(/<[^>]+>/g, "").trim()
            });
          }
        }
      }

      // 3. Trailer Embed
      let trailerObj: { embed_url?: string; youtube_id?: string; thumbnail?: string } = {};
      if (media.trailer?.site === "youtube" && media.trailer.id) {
        trailerObj = {
          embed_url: `https://www.youtube-nocookie.com/embed/${media.trailer.id}?autoplay=1&enablejsapi=1`,
          youtube_id: media.trailer.id,
          thumbnail: media.trailer.thumbnail || `https://i.ytimg.com/vi/${media.trailer.id}/hqdefault.jpg`
        };
      }

      return {
        mal_id: media.idMal || media.id,
        anilist_id: media.id,
        title: media.title?.english || media.title?.romaji || media.title?.userPreferred || cleanSearch,
        title_english: media.title?.english || null,
        title_japanese: media.title?.native || null,
        images: {
          webp: {
            image_url: media.coverImage?.large || media.coverImage?.medium || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600",
            large_image_url: media.coverImage?.extraLarge || media.coverImage?.large || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600"
          }
        },
        banner_image: media.bannerImage || media.coverImage?.extraLarge || media.coverImage?.large || "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600",
        synopsis: (media.description || "").replace(/<[^>]+>/g, "").trim() || "Stream high quality anime on Yuva.",
        type: media.format || "TV",
        episodes: media.episodes || 12,
        status: media.status || "Finished Airing",
        score: media.averageScore ? Number((media.averageScore / 10).toFixed(1)) : 8.5,
        matchPercent: media.averageScore ? Math.min(99, Math.max(76, media.averageScore)) : 95,
        rank: 1,
        genres: (media.genres || []).map((g: string) => ({ name: g })),
        studios: (media.studios?.nodes || []).map((s: any) => ({ name: s.name })),
        aired: { string: media.startDate?.year ? `${media.startDate.year}` : "Ongoing" },
        trailer: trailerObj,
        seasons,
        recommendations
      };
    };

    // 1. Try AniList GraphQL (Fast, high rate limit, rich metadata)
    try {
      const anilistQuery = `
        query ($id: Int, $idMal: Int, $search: String) {
          Media(id: $id, idMal: $idMal, search: $search, type: ANIME) {
            id
            idMal
            title {
              romaji
              english
              native
              userPreferred
            }
            coverImage {
              extraLarge
              large
              medium
            }
            bannerImage
            description
            format
            status
            episodes
            averageScore
            genres
            studios(isMain: true) {
              nodes {
                name
              }
            }
            startDate {
              year
              month
              day
            }
            trailer {
              id
              site
              thumbnail
            }
            relations {
              edges {
                relationType
                node {
                  id
                  idMal
                  title {
                    english
                    romaji
                  }
                  format
                  status
                  episodes
                  seasonYear
                  coverImage {
                    medium
                    large
                  }
                }
              }
            }
            recommendations(sort: RATING_DESC, page: 1, perPage: 12) {
              nodes {
                mediaRecommendation {
                  id
                  idMal
                  title {
                    english
                    romaji
                  }
                  coverImage {
                    large
                    extraLarge
                  }
                  averageScore
                  format
                  episodes
                  genres
                  description
                }
              }
            }
          }
        }
      `;

      const variables: Record<string, any> = {};
      if (isNumeric) {
        variables.id = numId;
      } else {
        variables.search = cleanSearch;
      }

      const alResp = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query: anilistQuery, variables })
      });

      if (alResp.ok) {
        const alData = await alResp.json();
        const media = alData?.data?.Media;
        if (media) {
          return res.json({ success: true, data: formatMedia(media) });
        }
      }

      // If numeric ID didn't match AniList ID, try idMal
      if (isNumeric) {
        const alRespMal = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ query: anilistQuery, variables: { idMal: numId } })
        });
        if (alRespMal.ok) {
          const alDataMal = await alRespMal.json();
          const media = alDataMal?.data?.Media;
          if (media) {
            return res.json({ success: true, data: formatMedia(media) });
          }
        }
      }
    } catch (err) {
      console.warn("AniList resolver failed:", err);
    }

    // 2. Try ReAnime API
    try {
      const reanimeData = await fetchReanimeCached(`/api/v1/anime/${encodeURIComponent(rawId)}`, 120000);
      if (reanimeData?.data) {
        const r = reanimeData.data;
        const title = r.title?.english || r.title?.romaji || r.title?.user_preferred || cleanSearch;
        const formatted = {
          mal_id: r.mal_id || (isNumeric ? numId : 1),
          anilist_id: r.anilist_id,
          title,
          images: {
            webp: {
              image_url: r.cover_image || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600",
              large_image_url: r.cover_image || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600"
            }
          },
          banner_image: r.banner_image || r.cover_image,
          synopsis: (r.description || "").replace(/<[^>]+>/g, "").trim() || "Stream high quality anime on Yuva.",
          type: r.format || "TV",
          episodes: r.episodes || 12,
          status: r.status || "Finished Airing",
          score: r.average_score ? Number((r.average_score / 10).toFixed(1)) : 8.5,
          rank: 1,
          genres: (r.genres || []).map((g: string) => ({ name: g })),
          studios: [{ name: "Anime Studio" }],
          aired: { string: r.season_year ? `${r.season_year}` : "Ongoing" },
          trailer: {}
        };
        return res.json({ success: true, data: formatted });
      }
    } catch (err) {
      // ignore
    }

    // 3. Try Jikan if numeric
    if (isNumeric) {
      try {
        const jikanResp = await fetch(`https://api.jikan.moe/v4/anime/${numId}/full`, {
          headers: { Accept: "application/json" }
        });
        if (jikanResp.ok) {
          const jData = await jikanResp.json();
          if (jData?.data) {
            return res.json({ success: true, data: jData.data });
          }
        }
      } catch (err) {
        // ignore
      }
    }

    // 4. Guaranteed Graceful Fallback
    const capitalizedTitle = cleanSearch
      .split(" ")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ") || "Anime Series";

    const fallbackAnime = {
      mal_id: isNumeric ? numId : 1,
      title: capitalizedTitle,
      images: {
        webp: {
          image_url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
          large_image_url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80"
        }
      },
      banner_image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop&q=80",
      synopsis: `Watch ${capitalizedTitle} in high definition streaming with Sub and Dub servers on Yuva.`,
      type: "TV",
      episodes: 24,
      status: "Currently Airing",
      score: 8.6,
      rank: 1,
      genres: [{ name: "Action" }, { name: "Adventure" }, { name: "Anime" }],
      studios: [{ name: "Yuva Anime Network" }],
      aired: { string: "2024 to Ongoing" },
      trailer: {}
    };

    return res.json({ success: true, data: fallbackAnime });
  });

  // Boot standalone HTTP server and Vite middleware only when not running in Vercel serverless
  if (!process.env.VERCEL) {
    async function startStandalone() {
      const PORT = 3000;
      if (process.env.NODE_ENV !== "production") {
        const { createServer: createViteServer } = await import("vite");
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: "spa",
        });
        app.use(vite.middlewares);
      } else {
        // Serve static files in production
        const distPath = path.join(process.cwd(), "dist");
        app.use(express.static(distPath));
        app.get("*", (req, res) => {
          res.sendFile(path.join(distPath, "index.html"));
        });
      }

      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Yuva Server running on http://localhost:${PORT}`);
      });
    }

    startStandalone();
  }

export default app;
