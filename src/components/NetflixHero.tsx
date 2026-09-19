import { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Plus, 
  Check, 
  Info, 
  Volume2, 
  VolumeX, 
  Star, 
  X, 
  Film, 
  ChevronRight,
  Subtitles,
  Mic,
  Calendar,
  Layers
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'firebase/auth';
import { db, doc, setDoc, deleteDoc, serverTimestamp, collection, onSnapshot } from '../firebase';
import { ReanimeAnimeItem } from '../services/reanimeService';
import { getAnimeBannerUrl, getAnimeImageUrl } from '../utils/imageHelper';

interface NetflixHeroProps {
  spotlights: ReanimeAnimeItem[];
  user: User | null;
  onOpenAuth?: () => void;
}

export default function NetflixHero({ spotlights, user, onOpenAuth }: NetflixHeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isMoreInfoOpen, setIsMoreInfoOpen] = useState(false);
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set());
  const [updatingWatchlist, setUpdatingWatchlist] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  // Watchlist real-time sync
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

  // Netflix Auto-Slide every 8 seconds (pauses when user opens More Info)
  useEffect(() => {
    if (spotlights.length <= 1 || isMoreInfoOpen) return;
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % spotlights.length);
      setShowTrailer(false);
    }, 8500);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [spotlights.length, isMoreInfoOpen]);

  if (!spotlights || spotlights.length === 0) return null;

  const current = spotlights[currentIndex] || spotlights[0];
  const title = typeof current.title === 'string'
    ? current.title
    : (current.title?.english || current.title?.romaji || current.title?.user_preferred || 'Featured Anime');
  const subTitle = typeof current.title === 'object' ? (current.title?.romaji || current.title?.native) : '';

  const animeId = current.anime_id || String(current.mal_id || '');
  const isInWatchlist = watchlistIds.has(animeId);
  const bgImage = getAnimeBannerUrl(current);
  const posterImage = getAnimeImageUrl(current);
  const score = current.average_score 
    ? (current.average_score / 10).toFixed(1) 
    : (current.mal_score ? current.mal_score.toFixed(1) : '8.9');

  const matchPercent = Math.min(99, Math.max(92, Math.round(Number(score) * 10 + 6)));
  const cleanDescription = (current.description || '').replace(/<[^>]+>/g, '');

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
          image: posterImage,
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
    <>
      {/* Netflix Billboard Hero Container */}
      <section 
        id="netflix-billboard"
        className="relative -mx-4 sm:-mx-6 -mt-20 h-[520px] sm:h-[580px] lg:h-[660px] w-screen max-w-[100vw] overflow-hidden bg-[#141414] select-none group"
      >
        {/* Background Image Artwork */}
        <AnimatePresence mode="wait">
          <motion.div
            key={animeId}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="absolute inset-0 bg-cover bg-center sm:bg-top"
            style={{ backgroundImage: `url(${bgImage})` }}
          >
            {/* Cinematic Netflix Vignettes */}
            {/* 1. Left dark gradient for sharp text contrast */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/75 sm:via-[#141414]/60 to-transparent w-full sm:w-3/4" />
            {/* 2. Bottom fade that seamlessly blends into Netflix #141414 rows */}
            <div className="absolute inset-x-0 bottom-0 h-44 sm:h-56 bg-gradient-to-t from-[#141414] via-[#141414]/80 to-transparent" />
            {/* 3. Top shadow for header transparency */}
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/80 to-transparent" />
          </motion.div>
        </AnimatePresence>

        {/* Billboard Content Overlay */}
        <div className="relative z-10 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-12 sm:pb-16 pt-24">
          <div className="max-w-xl space-y-3 sm:space-y-4">
            {/* Top 10 / Series Badge (Sleek Netflix Style) */}
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-xs bg-[#E50914] text-white flex items-center justify-center font-black text-[9px] shadow-sm tracking-tighter">
                TOP
                <br />
                10
              </div>
              <span className="text-white text-xs sm:text-sm font-bold tracking-tight drop-shadow-md">
                #{currentIndex + 1} in Anime Today
              </span>
            </div>

            {/* Main Display Title - Sleek Netflix Proportion */}
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-2xl line-clamp-2">
              {title}
            </h1>

            {/* Netflix Metadata Row - Compact & Crisp */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs font-semibold">
              <span className="text-[#46d369] font-black tracking-wide">
                {matchPercent}% Match
              </span>

              <span className="px-1.5 py-0.2 rounded-xs border border-white/40 text-[10px] sm:text-[11px] text-neutral-300 font-bold uppercase">
                16+
              </span>

              <span className="text-neutral-300 text-xs">
                {current.episodes ? `${current.episodes} Ep` : 'TV Series'}
              </span>

              <span className="px-1.5 py-0.2 rounded-xs bg-white/20 text-white text-[10px] font-bold">
                Ultra HD
              </span>

              <span className="text-neutral-400 text-xs hidden sm:inline">
                Sub | Dub
              </span>
            </div>

            {/* Netflix Synopsis - Punchy & Compact (2 Lines, Clean Leading) */}
            {cleanDescription && (
              <p className="text-neutral-200 text-xs sm:text-sm leading-snug line-clamp-2 max-w-lg font-normal drop-shadow-md">
                {cleanDescription}
              </p>
            )}

            {/* Action Buttons (Netflix Style: Solid White Play + Translucent More Info) */}
            <div className="flex items-center gap-2.5 sm:gap-3 pt-1">
              {/* Play Button */}
              <Link
                to={`/watch/${animeId}/1`}
                className="flex items-center gap-2 px-5 sm:px-7 py-2 sm:py-2.5 rounded-md bg-white hover:bg-neutral-200 text-black font-black text-xs sm:text-sm shadow-xl transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Play fill="currentColor" size={16} />
                <span>Play</span>
              </Link>

              {/* More Info Button */}
              <button
                onClick={() => setIsMoreInfoOpen(true)}
                className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-md bg-neutral-600/70 hover:bg-neutral-600/90 text-white font-bold text-xs sm:text-sm backdrop-blur-md transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Info size={16} />
                <span>More Info</span>
              </button>

              {/* My List Icon Button */}
              <button
                onClick={toggleWatchlist}
                disabled={updatingWatchlist}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-white/40 flex items-center justify-center backdrop-blur-md transition-all hover:border-white hover:scale-105 active:scale-95 cursor-pointer ${
                  isInWatchlist ? 'bg-white text-black' : 'bg-black/40 text-white'
                }`}
                title={isInWatchlist ? 'Remove from My List' : 'Add to My List'}
              >
                {isInWatchlist ? <Check size={16} /> : <Plus size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Right-Anchored Netflix Maturity Tag Bar */}
        <div className="absolute right-0 bottom-32 sm:bottom-28 z-20 flex items-center gap-3">
          <div className="py-1 px-3 bg-black/60 backdrop-blur-sm border-l-4 border-neutral-300 text-neutral-200 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg">
            <span>16+</span>
            <span className="text-neutral-500">•</span>
            <span className="uppercase text-[11px] tracking-wider text-neutral-300">Violent Content</span>
          </div>
        </div>

        {/* Slide Progress Indicators (Bottom Right) */}
        <div className="absolute right-6 bottom-8 z-20 flex items-center gap-1.5">
          {spotlights.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${
                idx === currentIndex ? 'w-8 bg-[#E50914]' : 'w-3 bg-white/30 hover:bg-white/60'
              }`}
              title={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Netflix "More Info" Detailed Quick-View Modal */}
      <AnimatePresence>
        {isMoreInfoOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-3xl rounded-xl bg-[#181818] text-white shadow-2xl overflow-hidden border border-white/10 my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setIsMoreInfoOpen(false)}
                className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-[#181818]/80 hover:bg-[#181818] border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X size={18} />
              </button>

              {/* Modal Banner Header */}
              <div className="relative h-64 sm:h-80 bg-cover bg-center" style={{ backgroundImage: `url(${bgImage})` }}>
                <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/40 to-transparent" />
                <div className="absolute bottom-6 left-6 sm:left-8 right-6 space-y-3">
                  <h2 className="text-2xl sm:text-3xl font-black text-white drop-shadow-lg">
                    {title}
                  </h2>
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/watch/${animeId}/1`}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-md bg-white hover:bg-neutral-200 text-black font-black text-sm shadow-xl transition-transform hover:scale-105 cursor-pointer"
                    >
                      <Play fill="currentColor" size={16} />
                      <span>Play Ep 1</span>
                    </Link>
                    <button
                      onClick={toggleWatchlist}
                      className={`w-10 h-10 rounded-full border border-white/40 flex items-center justify-center backdrop-blur-md transition-all cursor-pointer ${
                        isInWatchlist ? 'bg-white text-black' : 'bg-black/50 text-white hover:border-white'
                      }`}
                    >
                      {isInWatchlist ? <Check size={16} /> : <Plus size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 sm:p-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* Left Column: Match & Details */}
                  <div className="sm:col-span-2 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <span className="text-[#46d369] font-black">{matchPercent}% Match</span>
                      <span className="px-1.5 py-0.2 rounded border border-white/30 text-neutral-300">16+</span>
                      <span className="text-neutral-400">{current.format || 'TV Series'}</span>
                      <span className="px-1 py-0.2 rounded bg-white/10 text-white font-bold text-[10px]">HD</span>
                    </div>

                    <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-normal">
                      {cleanDescription}
                    </p>
                  </div>

                  {/* Right Column: Metadata pills */}
                  <div className="space-y-3 text-xs text-neutral-400 border-t sm:border-t-0 sm:border-l border-white/10 sm:pl-6 pt-3 sm:pt-0">
                    <div>
                      <span className="text-neutral-500 block mb-1 font-semibold">Format:</span>
                      <span className="text-white font-medium">{current.format || 'TV Series'}</span>
                    </div>

                    <div>
                      <span className="text-neutral-500 block mb-1 font-semibold">Episodes:</span>
                      <span className="text-white font-medium">{current.episodes || 12} Total</span>
                    </div>

                    <div>
                      <span className="text-neutral-500 block mb-1 font-semibold">User Rating:</span>
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <Star size={12} fill="currentColor" />
                        {score} / 10
                      </span>
                    </div>

                    <div>
                      <span className="text-neutral-500 block mb-1 font-semibold">Audio & Captions:</span>
                      <span className="text-white font-medium">Subtitled, English Dub</span>
                    </div>
                  </div>
                </div>

                {/* Episode Quick Action Footer */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs text-neutral-400 font-medium">Ready to start watching?</span>
                  <Link
                    to={`/watch/${animeId}/1`}
                    className="flex items-center gap-1.5 text-xs font-bold text-[#E50914] hover:underline"
                  >
                    <span>Go to Player</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
