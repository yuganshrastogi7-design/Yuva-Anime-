import { useState, useEffect, useRef } from 'react';
import { Play, Plus, Check, Info, Star, ChevronLeft, ChevronRight, Subtitles, Mic } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'firebase/auth';
import { db, doc, setDoc, deleteDoc, serverTimestamp, collection, onSnapshot } from '../firebase';
import { ReanimeAnimeItem } from '../services/reanimeService';

interface ReanimeHeroProps {
  spotlights: ReanimeAnimeItem[];
  user: User | null;
  onOpenAuth?: () => void;
}

export default function ReanimeHero({ spotlights, user, onOpenAuth }: ReanimeHeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set());
  const [updatingWatchlist, setUpdatingWatchlist] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync user watchlist
  useEffect(() => {
    if (!user) {
      setWatchlistIds(new Set());
      return;
    }

    const unsub = onSnapshot(collection(db, `users/${user.uid}/watchlist`), (snapshot) => {
      const ids = new Set<string>();
      snapshot.docs.forEach(d => ids.add(d.id));
      setWatchlistIds(ids);
    });

    return unsub;
  }, [user]);

  // Auto-rotate spotlight every 6 seconds
  useEffect(() => {
    if (spotlights.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % spotlights.length);
    }, 6000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [spotlights.length]);

  if (!spotlights || spotlights.length === 0) return null;

  const current = spotlights[currentIndex] || spotlights[0];
  const title = typeof current.title === 'string'
    ? current.title
    : (current.title?.english || current.title?.romaji || current.title?.user_preferred || 'Featured Anime');
  const subTitle = typeof current.title === 'object' ? (current.title?.romaji || current.title?.native) : '';

  const animeId = current.anime_id || String(current.mal_id || '');
  const isInWatchlist = watchlistIds.has(animeId);
  const bgImage = current.banner_image || current.cover_image;
  const score = current.average_score ? (current.average_score / 10).toFixed(1) : (current.mal_score ? current.mal_score.toFixed(1) : '8.8');

  const toggleWatchlist = async () => {
    if (!user) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    setUpdatingWatchlist(true);
    try {
      const docRef = doc(db, `users/${user.uid}/watchlist/${animeId}`);
      if (isInWatchlist) {
        await deleteDoc(docRef);
      } else {
        await setDoc(docRef, {
          animeId,
          title,
          image: current.cover_image,
          type: current.format || 'TV',
          status: 'PLANNING',
          updatedAt: serverTimestamp(),
          addedAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error('Error updating watchlist:', err);
    } finally {
      setUpdatingWatchlist(false);
    }
  };

  return (
    <div className="relative w-full h-[460px] sm:h-[520px] rounded-3xl overflow-hidden bg-[#0a0b12] border border-white/[0.08] shadow-2xl mb-10">
      {/* Background Banner with Smooth Transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={animeId}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bgImage})` }}
        >
          {/* ReAnime Vignette / Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0b12] via-[#0a0b12]/85 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b12] via-[#0a0b12]/40 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(229,56,59,0.15)_0%,transparent_60%)]" />
        </motion.div>
      </AnimatePresence>

      {/* Content Area */}
      <div className="relative z-10 h-full max-w-2xl flex flex-col justify-end p-6 sm:p-10 space-y-4">
        {/* Spotlight Rank */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-600/30 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            #{currentIndex + 1} Spotlight
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md text-white/90 text-xs font-medium border border-white/15">
            {current.format || 'TV Series'}
          </span>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight line-clamp-2 drop-shadow-md">
            {title}
          </h1>
          {subTitle && subTitle !== title && (
            <p className="text-xs sm:text-sm text-neutral-400 font-medium line-clamp-1 italic">
              {subTitle}
            </p>
          )}
        </div>

        {/* Badges & Meta Row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md text-amber-400 font-bold border border-white/10">
            <Star size={13} fill="currentColor" />
            <span>{score}</span>
          </div>

          <span className="px-2 py-0.5 rounded bg-white/10 font-semibold text-white/90 text-[11px]">
            HD 1080p
          </span>

          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold text-[11px] border border-cyan-500/30">
            <Subtitles size={12} />
            <span>SUB {current.episodes || 12}</span>
          </span>

          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold text-[11px] border border-amber-500/30">
            <Mic size={12} />
            <span>DUB {current.episodes || 12}</span>
          </span>

          {current.season_year && (
            <span className="text-neutral-400 text-xs hidden sm:inline">
              {current.season} {current.season_year}
            </span>
          )}
        </div>

        {/* Description Excerpt */}
        {current.description && (
          <p className="text-neutral-300 text-xs sm:text-sm line-clamp-3 leading-relaxed max-w-xl font-normal drop-shadow">
            {current.description.replace(/<[^>]+>/g, '')}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <Link
            to={`/watch/${animeId}/1`}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm shadow-xl shadow-red-600/30 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Play fill="white" size={16} />
            <span>Watch Episode 1</span>
          </Link>

          <button
            onClick={toggleWatchlist}
            disabled={updatingWatchlist}
            className={`flex items-center gap-1.5 px-4 py-3 rounded-xl text-xs font-semibold backdrop-blur-md transition-all border ${
              isInWatchlist
                ? 'bg-red-600/20 border-red-500/40 text-red-300'
                : 'bg-white/10 hover:bg-white/15 border-white/15 text-white'
            }`}
          >
            {isInWatchlist ? <Check size={16} /> : <Plus size={16} />}
            <span>{isInWatchlist ? 'In Watchlist' : 'Add to List'}</span>
          </button>

          <Link
            to={`/anime/${animeId}`}
            className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition-all"
          >
            <Info size={16} />
            <span className="hidden sm:inline">Details</span>
          </Link>
        </div>
      </div>

      {/* Carousel Controls (Right Side on Desktop) */}
      <div className="absolute bottom-6 right-6 z-20 flex items-center gap-2">
        <button
          onClick={() => setCurrentIndex((prev) => (prev - 1 + spotlights.length) % spotlights.length)}
          className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white flex items-center justify-center transition-all hover:scale-105"
          title="Previous Spotlight"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => setCurrentIndex((prev) => (prev + 1) % spotlights.length)}
          className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white flex items-center justify-center transition-all hover:scale-105"
          title="Next Spotlight"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
        {spotlights.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === currentIndex ? 'w-6 bg-red-600' : 'w-2 bg-white/30 hover:bg-white/50'
            }`}
            title={`Slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
