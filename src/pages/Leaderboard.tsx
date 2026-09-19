import { useState, useEffect } from 'react';
import { Trophy, Star, Play, Flame, TrendingUp, Medal, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { reanimeService } from '../services/reanimeService';
import { animeService, Anime } from '../services/animeService';

export default function LeaderboardPage() {
  const [range, setRange] = useState<'day' | 'week' | 'month' | 'all'>('week');
  const [loading, setLoading] = useState(true);
  const [animeList, setAnimeList] = useState<any[]>([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const [reanimeData, trending] = await Promise.all([
          reanimeService.getLeaderboard(range),
          animeService.getPopular()
        ]);

        if (reanimeData.anime && reanimeData.anime.length > 0) {
          setAnimeList(reanimeData.anime);
        } else {
          setAnimeList(trending.slice(0, 15));
        }
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [range]);

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Trophy size={16} />
            <span>Re:ANIME Leaderboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Top Anime Rankings
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            The most watched, highest-rated, and discussed anime across the platform.
          </p>
        </div>

        {/* Range Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#12131f] border border-white/10 self-start sm:self-auto">
          {[
            { id: 'day', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'all', label: 'All Time' },
          ].map((tab) => {
            const isSelected = range === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setRange(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Leaderboard Table / Cards */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-[#12131f] border border-white/10 shimmer" />
          ))}
        </div>
      ) : animeList.length === 0 ? (
        <div className="py-20 text-center rounded-2xl bg-[#12131f] border border-white/10 space-y-3">
          <Trophy className="mx-auto text-neutral-600" size={40} />
          <p className="text-white font-medium text-sm">No rankings available</p>
        </div>
      ) : (
        <div className="space-y-3">
          {animeList.map((item: any, idx: number) => {
            const rank = idx + 1;
            const title = typeof item.title === 'string'
              ? item.title
              : (item.title?.english || item.title?.romaji || 'Anime');
            const animeId = item.anime_id || item.mal_id || String(idx);
            const image = item.cover_image || item.images?.webp?.large_image_url || item.images?.webp?.image_url;
            const score = item.average_score ? (item.average_score / 10).toFixed(1) : (item.score ? item.score.toFixed(1) : '8.7');
            const format = item.format || item.type || 'TV';
            const episodes = item.episodes || 12;

            return (
              <div
                key={animeId}
                className="group p-3 sm:p-4 rounded-2xl bg-[#12131f] border border-white/[0.08] hover:border-red-500/40 transition-all flex items-center justify-between gap-4 shadow-lg"
              >
                {/* Left: Rank & Anime info */}
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  {/* Rank Badge */}
                  <div className={`w-8 sm:w-10 text-center font-black text-sm sm:text-base shrink-0 ${
                    rank === 1 ? 'text-amber-400' :
                    rank === 2 ? 'text-neutral-300' :
                    rank === 3 ? 'text-amber-600' : 'text-neutral-500'
                  }`}>
                    #{rank}
                  </div>

                  {/* Thumbnail */}
                  <div className="relative w-12 sm:w-14 h-16 sm:h-20 rounded-xl overflow-hidden shrink-0 bg-neutral-900 border border-white/10">
                    <img
                      src={image}
                      alt={title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 space-y-1">
                    <Link
                      to={`/anime/${animeId}`}
                      className="text-white font-bold text-xs sm:text-sm truncate block hover:text-red-400 transition-colors"
                    >
                      {title}
                    </Link>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-400">
                      <span className="px-1.5 py-0.2 rounded bg-white/10 text-white/90 font-medium">
                        {format}
                      </span>
                      <span>{episodes} Episodes</span>
                      <span className="w-1 h-1 bg-white/20 rounded-full" />
                      <span className="flex items-center gap-1 text-amber-400 font-bold">
                        <Star size={11} fill="currentColor" />
                        <span>{score}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Watch Action */}
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/watch/${animeId}/1`}
                    className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-red-600/15 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 transition-all font-semibold text-xs cursor-pointer shadow-md"
                  >
                    <Play size={13} fill="currentColor" />
                    <span className="hidden sm:inline">Watch Now</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
