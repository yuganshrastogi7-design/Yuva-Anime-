import { useState, useEffect } from 'react';
import { 
  Flame, 
  MessageSquare, 
  ChevronRight, 
  Trophy,
  Subtitles,
  Mic,
  Heart,
  Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { User } from 'firebase/auth';
import { db, collection, query, orderBy, limit, onSnapshot } from '../firebase';
import NetflixHero from '../components/NetflixHero';
import NetflixTop10Row from '../components/NetflixTop10Row';
import NetflixRow from '../components/NetflixRow';
import DemonSlayerWallpaper from '../components/DemonSlayerWallpaper';
import { AnimeSpinner, NetflixRowSkeleton } from '../components/AnimeLoader';
import { reanimeService, ReanimeAnimeItem } from '../services/reanimeService';
import { animeService, ONGOING_FALLBACK_ANIME } from '../services/animeService';
import { getAnimeImageUrl, handleImageError } from '../utils/imageHelper';

interface HomeProps {
  user?: User | null;
  onAuthOpen?: () => void;
}

interface RealHomePost {
  id: string;
  title: string;
  content: string;
  category: string;
  authorName: string;
  votes: number;
  commentsCount: number;
}

export default function HomePage({ user, onAuthOpen }: HomeProps) {
  const [spotlights, setSpotlights] = useState<ReanimeAnimeItem[]>([]);
  const [latestEpisodes, setLatestEpisodes] = useState<ReanimeAnimeItem[]>([]);
  const [upcoming, setUpcoming] = useState<ReanimeAnimeItem[]>([]);
  const [topTrending, setTopTrending] = useState<any[]>([]);
  const [userRecs, setUserRecs] = useState<ReanimeAnimeItem[]>([]);
  const [realCommunityPosts, setRealCommunityPosts] = useState<RealHomePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [audioFilter, setAudioFilter] = useState<'all' | 'sub' | 'dub'>('all');
  const [trendingRange, setTrendingRange] = useState<'day' | 'week' | 'month'>('week');

  // Real user community discussions from Firestore
  useEffect(() => {
    const q = query(
      collection(db, 'community_posts'),
      orderBy('createdAt', 'desc'),
      limit(4)
    );
    const unsub = onSnapshot(q, (snap) => {
      const posts: RealHomePost[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title || '',
          content: data.content || '',
          category: data.category || 'General',
          authorName: data.authorName || 'Anime Fan',
          votes: data.votes || 0,
          commentsCount: data.commentsCount || 0
        };
      });
      setRealCommunityPosts(posts);
    }, (err) => {
      console.error("Home community snapshot error:", err);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const fetchHomeContent = async () => {
      setLoading(true);
      try {
        const [latestRes, upcomingRes, leaderboardRes, trendingAnime, topRated] = await Promise.all([
          reanimeService.getLatestAired(1, 24),
          reanimeService.getUpcoming(1, 16),
          reanimeService.getLeaderboard(trendingRange),
          animeService.getTrending(),
          animeService.getTopRated()
        ]);

        setLatestEpisodes(latestRes.data || []);
        setUpcoming(upcomingRes.data || []);

        if (leaderboardRes.anime && leaderboardRes.anime.length > 0) {
          setTopTrending(leaderboardRes.anime.slice(0, 10));
        } else {
          setTopTrending(trendingAnime.slice(0, 10));
        }

        // Spotlights: top items with high scores or popular covers
        const spotlightList: ReanimeAnimeItem[] = (latestRes.data && latestRes.data.length > 0)
          ? latestRes.data.slice(0, 6)
          : ONGOING_FALLBACK_ANIME.map(a => ({
              anime_id: String(a.mal_id),
              mal_id: a.mal_id,
              title: { english: a.title },
              cover_image: a.images.webp.large_image_url,
              banner_image: a.images.webp.large_image_url,
              description: a.synopsis,
              format: a.type,
              episodes: a.episodes,
              average_score: Math.round(a.score * 10),
              subbed: true,
              dubbed: true
            }));

        setSpotlights(spotlightList);

        // Transform real user-rated anime into Reanime format for the recommendation row
        const mappedUserRecs: ReanimeAnimeItem[] = (topRated && topRated.length > 0)
          ? topRated.slice(0, 16).map(item => ({
              anime_id: String(item.mal_id),
              mal_id: item.mal_id,
              title: { english: item.title, romaji: item.title_japanese || item.title },
              cover_image: item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url,
              banner_image: item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url,
              description: item.synopsis,
              format: item.type || 'TV',
              episodes: item.episodes,
              average_score: Math.round((item.score || 8.5) * 10),
              subbed: true,
              dubbed: true
            }))
          : [];
        setUserRecs(mappedUserRecs);

      } catch (err) {
        console.error('Error fetching Netflix home content:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeContent();
  }, [trendingRange]);

  // Filter latest episodes by audio preference
  const filteredLatest = latestEpisodes.filter(item => {
    if (audioFilter === 'sub') return Boolean(item.subbed);
    if (audioFilter === 'dub') return Boolean(item.dubbed);
    return true;
  });

  return (
    <div className="relative z-10 space-y-8 sm:space-y-12 pb-32 md:pb-24">
      {/* Demon Slayer Live Animated Wallpaper with Hinokami Flame Embers */}
      <DemonSlayerWallpaper />

      {/* 1. Cinematic Netflix Billboard Hero */}
      <NetflixHero spotlights={spotlights} user={user || null} onOpenAuth={onAuthOpen} />

      {loading ? (
        <div className="space-y-8 px-1">
          <NetflixRowSkeleton count={6} />
          <NetflixRowSkeleton count={6} />
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8 sm:space-y-12"
        >
          {/* 2. Netflix Top 10 Row with Iconic Giant Metallic Numbers */}
          <section id="netflix-top-10">
            <NetflixTop10Row items={topTrending} title="Top 10 Anime in Today" />
          </section>

          {/* 3. Trending Now Row (Click opens Anime Info page) */}
          <section id="netflix-trending">
            <NetflixRow 
              title="Trending Now" 
              items={spotlights} 
              badgeColor="#E50914" 
              badgeLabel="HOT"
              showEpisode={false}
            />
          </section>

          {/* 4. Latest Episodes Just Released (Watch opens Player directly) */}
          <section id="netflix-latest-episodes" className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E50914] animate-pulse" />
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Latest Episodes
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-xs bg-[#E50914]/20 text-[#E50914] font-black border border-[#E50914]/40">
                  NEW RELEASE
                </span>
              </div>

              {/* Sub / Dub Audio Switcher */}
              <div className="flex items-center gap-1 p-1 rounded-md bg-[#181818]/90 border border-white/10 self-start sm:self-auto text-xs backdrop-blur-sm">
                {[
                  { id: 'all', label: 'All Audio' },
                  { id: 'sub', label: 'Subtitles Only', icon: Subtitles },
                  { id: 'dub', label: 'English Dub', icon: Mic },
                ].map((f) => {
                  const isSelected = audioFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setAudioFilter(f.id as any)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-xs font-bold text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white text-black shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {f.icon && <f.icon size={12} />}
                      <span>{f.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <NetflixRow 
              title="" 
              items={filteredLatest} 
              showEpisode={true}
            />
          </section>

          {/* 5. Community Picks: Real Fan Suggestions */}
          {userRecs.length > 0 && (
            <section id="netflix-user-picks">
              <NetflixRow 
                title="Community Picks: Real Fan Suggestions" 
                items={userRecs} 
                badgeColor="#46d369"
                badgeLabel="FAN FAVORITES"
                showEpisode={false}
              />
            </section>
          )}

          {/* 6. Upcoming Releases Row (Click opens Anime Info page) */}
          <section id="netflix-upcoming">
            <NetflixRow 
              title="Coming Soon to Yuva" 
              items={upcoming} 
              badgeColor="#564d4d" 
              badgeLabel="ANTICIPATED"
              showEpisode={false}
            />
          </section>

          {/* 7. Bottom Dual Section: Real User Community Discussions & Top Rated */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
            {/* Left 2 Cols: Real User Discussions ONLY */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare size={18} className="text-[#E50914]" />
                  <h2 className="text-xl font-black text-white tracking-tight">
                    Real Fan Discussions
                  </h2>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-xs bg-white/10 text-neutral-400 font-bold uppercase">
                    Live
                  </span>
                </div>
                <Link
                  to="/community"
                  className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors font-semibold"
                >
                  <span>Enter Community</span>
                  <ChevronRight size={14} />
                </Link>
              </div>

              {realCommunityPosts.length === 0 ? (
                <div className="p-6 rounded-md bg-[#181818]/90 border border-white/10 text-center space-y-3 backdrop-blur-sm">
                  <p className="text-xs text-neutral-300">
                    No discussions started yet. Be the first real anime fan to start a topic!
                  </p>
                  <Link
                    to="/community"
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-[#E50914] text-white text-xs font-bold hover:bg-[#c11119] transition-colors"
                  >
                    <Plus size={13} />
                    <span>Start Discussion</span>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {realCommunityPosts.map((post) => (
                    <Link
                      key={post.id}
                      to="/community"
                      className="group p-4 rounded-md bg-[#181818]/90 border border-white/10 hover:border-white/30 transition-all hover:bg-[#202020] space-y-2 backdrop-blur-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-xs bg-[#E50914]/20 text-[#E50914] font-bold uppercase">
                          {post.category}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          by {post.authorName}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white group-hover:text-[#E50914] transition-colors line-clamp-1">
                        {post.title}
                      </h4>
                      <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                        {post.content}
                      </p>
                      <div className="flex items-center gap-3 pt-1 text-[11px] text-neutral-400">
                        <span className="text-emerald-400 font-semibold">{post.votes} upvotes</span>
                        <span className="text-neutral-600">•</span>
                        <span>{post.commentsCount} replies</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Right Col: Top Rated Rankings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Trophy size={18} className="text-amber-400" />
                  <h2 className="text-xl font-black text-white tracking-tight">
                    Top Rated
                  </h2>
                </div>
                {/* Day / Week / Month Filter */}
                <div className="flex items-center gap-1 text-[11px] font-bold">
                  {(['day', 'week', 'month'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setTrendingRange(r)}
                      className={`px-2 py-0.5 rounded-xs capitalize transition-colors cursor-pointer ${
                        trendingRange === r
                          ? 'bg-[#E50914] text-white'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                {topTrending.slice(0, 5).map((anime, idx) => {
                  const title = typeof anime.title === 'string'
                    ? anime.title
                    : (anime.title?.english || anime.title?.romaji || 'Anime');
                  const animeId = anime.anime_id || anime.mal_id;
                  const img = getAnimeImageUrl(anime);
                  const score = anime.average_score
                    ? (anime.average_score / 10).toFixed(1)
                    : (anime.score ? Number(anime.score).toFixed(1) : '9.0');

                  return (
                    <Link
                      key={animeId}
                      to={`/anime/${animeId}`}
                      className="group flex items-center gap-3.5 p-2 rounded-md bg-[#181818]/90 border border-white/5 hover:border-white/20 transition-all hover:bg-[#202020] backdrop-blur-sm"
                    >
                      <span className={`w-6 text-center font-black text-lg ${
                        idx === 0 ? 'text-[#E50914]' : idx === 1 ? 'text-neutral-200' : idx === 2 ? 'text-amber-600' : 'text-neutral-500'
                      }`}>
                        {idx + 1}
                      </span>
                      <img
                        src={img}
                        alt={title}
                        onError={handleImageError}
                        className="w-12 h-16 rounded-xs object-cover bg-neutral-900 border border-white/10 group-hover:scale-105 transition-transform shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <h4 className="text-sm font-bold text-white truncate group-hover:text-[#E50914] transition-colors">
                          {title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-neutral-400">
                          <span className="text-[#46d369] font-black text-[11px]">
                            ★ {score}
                          </span>
                          <span>•</span>
                          <span className="text-[11px] text-neutral-400 font-semibold">
                            {anime.format || 'TV Series'}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
