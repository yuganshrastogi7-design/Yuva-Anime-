import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { animeService, Anime, AnimeSeason, AnimeRecommendation } from '../services/animeService';
import { auth, db } from '../firebase';
import { setDoc, doc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Play, Plus, Check, Star, Clock, Calendar, Tv, Subtitles, Mic, 
  ArrowLeft, Film, X, Volume2, Sparkles, Layers, ChevronDown, 
  Flame, Heart, Share2, Info, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getAnimeImageUrl, getAnimeBannerUrl, handleImageError, ANIME_FALLBACK_POSTER, ANIME_FALLBACK_BANNER } from '../utils/imageHelper';
import { AnimeSpinner } from '../components/AnimeLoader';

export default function AnimeDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [anime, setAnime] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [addingToWatchlist, setAddingToWatchlist] = useState(false);
  
  // Netflix Trailer Modal
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  
  // Selected Season tab (defaults to current)
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | number | null>(null);
  
  // Notification toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;
      setLoading(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      try {
        const data = await animeService.getDetails(id);
        setAnime(data);
        setSelectedSeasonId(data.mal_id || id);

        // Check watchlist status if user is logged in
        if (auth.currentUser) {
          const watchlistRef = doc(db, `users/${auth.currentUser.uid}/watchlist/${id}`);
          const docSnap = await getDoc(watchlistRef);
          setIsInWatchlist(docSnap.exists());
        }
      } catch (error) {
        console.error("Error fetching anime details", error);
        const title = id.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        setAnime({
          mal_id: parseInt(id, 10) || 1,
          title,
          images: { 
            webp: { 
              image_url: ANIME_FALLBACK_POSTER, 
              large_image_url: ANIME_FALLBACK_POSTER 
            } 
          },
          synopsis: `Stream ${title} in high definition with Sub & Dub servers on Yuva.`,
          type: 'TV',
          episodes: 24,
          status: 'Finished Airing',
          score: 8.8,
          rank: 1,
          matchPercent: 96,
          genres: [{ name: 'Action' }, { name: 'Adventure' }, { name: 'Fantasy' }],
          studios: [{ name: 'Ufotable' }],
          aired: { string: 'Ongoing' },
          trailer: {
            embed_url: 'https://www.youtube-nocookie.com/embed/6vMuWuWlW4I?autoplay=1&enablejsapi=1'
          }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  const toggleWatchlist = async () => {
    if (!anime || !id) return;
    if (!auth.currentUser) {
      showToast("Please sign in to save anime to your list!");
      return;
    }

    setAddingToWatchlist(true);
    try {
      const watchlistRef = doc(db, `users/${auth.currentUser.uid}/watchlist/${id}`);
      if (isInWatchlist) {
        await deleteDoc(watchlistRef);
        setIsInWatchlist(false);
        showToast("Removed from My List");
      } else {
        await setDoc(watchlistRef, {
          animeId: id,
          title: anime.title,
          image: getAnimeImageUrl(anime),
          type: anime.type,
          status: 'PLANNING',
          addedAt: serverTimestamp()
        });
        setIsInWatchlist(true);
        showToast("Added to My List!");
      }
    } catch (error) {
      console.error("Error updating watchlist", error);
    } finally {
      setAddingToWatchlist(false);
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast("Link copied to clipboard!");
    }
  };

  if (loading && !anime) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-20">
        <AnimeSpinner text="Loading Netflix Cinematic Overview..." />
      </div>
    );
  }

  if (!anime) return null;

  const posterUrl = getAnimeImageUrl(anime);
  const bannerUrl = getAnimeBannerUrl(anime);
  const matchPercentage = anime.matchPercent || (anime.score ? Math.min(99, Math.round(anime.score * 10)) : 97);
  const seasonsList: AnimeSeason[] = anime.seasons && anime.seasons.length > 0 ? anime.seasons : [
    {
      id: anime.mal_id,
      mal_id: anime.mal_id,
      relationType: 'CURRENT',
      title: anime.title,
      format: anime.type || 'TV',
      episodes: anime.episodes || 12,
      year: anime.aired?.string ? parseInt(anime.aired.string, 10) || 2023 : 2023,
      image: posterUrl
    }
  ];

  const recommendationsList: AnimeRecommendation[] = anime.recommendations || [];
  const effectiveTrailerUrl = anime.trailer?.embed_url || 
    (anime.trailer?.youtube_id 
      ? `https://www.youtube-nocookie.com/embed/${anime.trailer.youtube_id}?autoplay=1&enablejsapi=1` 
      : (anime.title ? `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(anime.title + ' anime official trailer')}&autoplay=1&enablejsapi=1` : null));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-24 -mt-4 -mx-4 sm:-mx-6 lg:-mx-8 text-neutral-200 select-none overflow-x-hidden font-sans"
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-neutral-900/95 border border-white/20 text-white text-xs font-bold shadow-2xl backdrop-blur-md flex items-center gap-2"
          >
            <CheckCircle2 size={16} className="text-[#46d369]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. CINEMATIC NETFLIX BILLBOARD HERO SECTION */}
      <div className="relative w-full min-h-[60vh] sm:min-h-[70vh] flex items-end overflow-hidden bg-[#141414]">
        {/* Full-bleed high quality background banner image */}
        <div className="absolute inset-0 z-0">
          <img
            src={bannerUrl}
            alt={anime.title}
            onError={(e) => handleImageError(e, true)}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center filter brightness-[0.55] contrast-[1.05] transform scale-102 transition-transform duration-1000"
          />
          {/* Netflix Signature Multi-Layer Vignette Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/75 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/85 to-transparent w-full lg:w-3/4" />
          <div className="absolute inset-0 bg-radial-at-t from-transparent via-[#141414]/40 to-[#141414]" />
        </div>

        {/* Top Back Navigation Bar */}
        <div className="absolute top-6 left-4 sm:left-8 z-30 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-black/90 text-white text-xs font-bold border border-white/20 backdrop-blur-md transition-all cursor-pointer shadow-lg group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Back</span>
          </button>
        </div>

        {/* Hero Billboard Content Box - Fully Responsive Across All Devices */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 pb-10 sm:pb-12 pt-24 flex flex-col md:flex-row items-center md:items-end gap-6 sm:gap-8">
          {/* Netflix Poster Box with 3D Depth (Visible on ALL devices) */}
          <div className="shrink-0 w-32 sm:w-44 md:w-52 lg:w-60 aspect-[2/3] rounded-lg overflow-hidden bg-neutral-900 border border-white/20 shadow-2xl relative group mx-auto md:mx-0">
            <img
              src={posterUrl}
              alt={anime.title}
              onError={(e) => handleImageError(e, false)}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3 sm:p-4">
              <span className="text-[11px] font-bold text-white flex items-center gap-1">
                <Star size={12} className="text-amber-400 fill-amber-400" />
                {anime.score ? `${anime.score.toFixed(1)} / 10 Score` : 'Top Rated'}
              </span>
            </div>
          </div>

          {/* Title & Netflix Meta Information */}
          <div className="space-y-3 sm:space-y-4 max-w-3xl flex-1 text-center md:text-left">
            {/* Netflix Series Tag */}
            <div className="flex items-center justify-center md:justify-start gap-2.5">
              <span className="px-2 py-0.5 rounded-xs bg-[#E50914] text-white text-[10px] sm:text-[11px] font-black tracking-widest uppercase shadow-sm">
                NETFLIX ANIME
              </span>
              <span className="text-[11px] sm:text-xs text-neutral-400 font-bold uppercase tracking-wider">
                {anime.type || 'TV SERIES'}
              </span>
            </div>

            {/* Main Title Typography - Sleek Netflix Scale */}
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                {anime.title}
              </h1>
              {anime.title_japanese && (
                <p className="text-xs sm:text-sm text-neutral-400 font-medium tracking-wide">
                  {anime.title_japanese}
                </p>
              )}
            </div>

            {/* Netflix Spec Badges Row */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-3 text-xs font-bold pt-0.5">
              {/* High Match Percentage in Netflix Signature Green */}
              <span className="text-[#46d369] font-black text-xs sm:text-sm tracking-tight flex items-center gap-1">
                <Flame size={14} />
                <span>{matchPercentage}% Match</span>
              </span>

              {/* Release Year */}
              <span className="text-neutral-300">
                {anime.aired?.string ? anime.aired.string.slice(0, 4) : '2024'}
              </span>

              {/* Maturity Rating Badge */}
              <span className="px-1.5 py-0.2 rounded-xs border border-neutral-500 text-neutral-300 text-[10px] font-bold">
                16+
              </span>

              {/* Seasons / Episode count */}
              <span className="text-neutral-300">
                {seasonsList.length > 1 ? `${seasonsList.length} Seasons` : '1 Season'}
              </span>

              {/* Video Quality Badges */}
              <span className="px-1.5 py-0.2 rounded-xs border border-white/30 text-[10px] font-black text-white bg-white/5">
                Ultra HD
              </span>
              <span className="px-1.5 py-0.2 rounded-xs border border-white/30 text-[10px] font-black text-white bg-white/5">
                HDR
              </span>

              {/* Audio / Subtitle Badges */}
              <div className="flex items-center gap-2 pl-2 border-l border-white/20 text-neutral-400 text-xs">
                <span className="flex items-center gap-1 text-cyan-400">
                  <Subtitles size={13} /> Sub
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <Mic size={13} /> Dub
                </span>
              </div>
            </div>

            {/* Synopsis Paragraph */}
            <p className="text-xs sm:text-sm text-neutral-300 leading-snug max-w-xl line-clamp-3 font-normal drop-shadow-sm mx-auto md:mx-0">
              {anime.synopsis || "Immerse yourself in high definition streaming on Yuva with zero interruptions."}
            </p>

            {/* Primary Netflix Action Buttons */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 sm:gap-3 pt-2">
              {/* White Solid Play Button */}
              <Link
                to={`/watch/${id}/1`}
                className="flex items-center gap-2 px-6 sm:px-7 py-2 sm:py-2.5 rounded-md bg-white hover:bg-neutral-200 text-black font-black text-xs sm:text-sm transition-all transform hover:scale-105 active:scale-95 shadow-2xl cursor-pointer"
              >
                <Play fill="currentColor" size={16} />
                <span>Play Ep 1</span>
              </Link>

              {/* Trailer Button - Always available on every anime */}
              {effectiveTrailerUrl && (
                <button
                  onClick={() => setShowTrailerModal(true)}
                  className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-md bg-white/20 hover:bg-white/30 text-white font-bold text-xs sm:text-sm border border-white/20 backdrop-blur-md transition-all transform hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
                >
                  <Film size={16} className="text-[#E50914]" />
                  <span>Trailer</span>
                </button>
              )}

              {/* Add to My List Button */}
              <button
                onClick={toggleWatchlist}
                disabled={addingToWatchlist}
                className={`flex items-center gap-2 px-5 py-3 rounded-md font-bold text-sm sm:text-base border transition-all cursor-pointer ${
                  isInWatchlist
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-black/50 hover:bg-white/10 text-white border-white/30'
                }`}
                title={isInWatchlist ? "In My List" : "Add to My List"}
              >
                {addingToWatchlist ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : isInWatchlist ? (
                  <>
                    <Check size={18} className="text-emerald-400" />
                    <span>In My List</span>
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    <span>My List</span>
                  </>
                )}
              </button>

              {/* Share Button */}
              <button
                onClick={handleShare}
                className="p-3 rounded-md bg-black/50 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/20 transition-all cursor-pointer"
                title="Share anime link"
              >
                <Share2 size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. NETFLIX TRAILER MODAL OVERLAY */}
      <AnimatePresence>
        {showTrailerModal && effectiveTrailerUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="relative w-full max-w-4xl aspect-video rounded-xl overflow-hidden bg-black border border-white/20 shadow-2xl"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowTrailerModal(false)}
                className="absolute top-4 right-4 z-30 p-2 rounded-full bg-black/80 hover:bg-[#E50914] text-white border border-white/20 transition-colors cursor-pointer shadow-lg"
                title="Close trailer"
              >
                <X size={20} />
              </button>

              {/* Embedded Trailer Iframe */}
              <iframe
                src={effectiveTrailerUrl}
                className="w-full h-full border-0"
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
                title={`${anime.title} Official Trailer`}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT CONTAINER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-12 mt-8">
        
        {/* 3. ANIME SEASONS & SEQUELS (NETFLIX STYLE) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <Layers size={20} className="text-[#E50914]" />
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                All Anime Seasons & Related
              </h2>
            </div>
            <span className="text-xs font-bold text-neutral-400">
              {seasonsList.length} {seasonsList.length === 1 ? 'Season' : 'Seasons & Sequels'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {seasonsList.map((season, idx) => {
              const isCurrent = season.mal_id === anime.mal_id || season.id === anime.mal_id || (idx === 0 && !season.mal_id);
              const targetUrl = isCurrent ? `/anime/${id}` : `/anime/${season.mal_id || season.id}`;

              return (
                <Link
                  key={`${season.id}-${idx}`}
                  to={targetUrl}
                  className={`group relative rounded-lg overflow-hidden border transition-all duration-300 flex flex-col bg-[#181818] ${
                    isCurrent 
                      ? 'border-[#E50914] ring-2 ring-[#E50914]/40 shadow-xl scale-[1.02]' 
                      : 'border-white/10 hover:border-white/40 hover:scale-[1.02]'
                  }`}
                >
                  {/* Poster Thumbnail */}
                  <div className="aspect-[2/3] w-full overflow-hidden bg-neutral-900 relative">
                    <img
                      src={season.image || posterUrl}
                      alt={season.title}
                      onError={(e) => handleImageError(e, false)}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-xs bg-black/85 text-[10px] font-black tracking-wider text-white uppercase border border-white/10">
                      {season.relationType || (isCurrent ? 'Current' : 'Season')}
                    </div>
                    {isCurrent && (
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-xs bg-[#E50914] text-white text-[10px] font-black uppercase">
                        Active
                      </div>
                    )}
                  </div>

                  {/* Season Info Card */}
                  <div className="p-3 space-y-1 flex-1 flex flex-col justify-between">
                    <p className="text-xs font-black text-white group-hover:text-[#E50914] line-clamp-2 leading-snug transition-colors">
                      {season.title}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-neutral-400 font-bold pt-1">
                      <span>{season.format || 'TV'}</span>
                      <span>{season.year || (season.episodes ? `${season.episodes} eps` : 'Full')}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 4. NETFLIX EPISODES LIST */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <Tv size={20} className="text-[#E50914]" />
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Episodes
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-neutral-400">
                {anime.episodes || 12} Episodes Ready to Stream
              </span>
            </div>
          </div>

          {/* Episode Grid with Netflix Play Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[460px] overflow-y-auto pr-1">
            {[...Array(anime.episodes || 12)].map((_, i) => {
              const epNum = i + 1;
              return (
                <Link
                  key={epNum}
                  to={`/watch/${id}/${epNum}`}
                  className="group relative p-3 rounded-lg bg-[#181818] hover:bg-[#202020] border border-white/10 hover:border-white/30 transition-all flex flex-col justify-between gap-3 shadow-md hover:shadow-xl"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black tracking-wider text-neutral-400 group-hover:text-white uppercase">
                      EPISODE {epNum}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-white/10 group-hover:bg-[#E50914] text-white flex items-center justify-center transition-colors">
                      <Play fill="currentColor" size={11} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white group-hover:text-white line-clamp-1">
                      Episode {epNum}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-neutral-400">
                      <span>24m</span>
                      <span className="text-emerald-400 font-bold">1080p HD</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 5. ABOUT THIS ANIME METADATA PANEL */}
        <section className="p-6 sm:p-8 rounded-xl bg-[#181818] border border-white/10 space-y-6 shadow-2xl">
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight border-b border-white/10 pb-3 flex items-center gap-2">
            <Info size={18} className="text-[#E50914]" />
            <span>About <span className="text-neutral-200">{anime.title}</span></span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">Production Studios</p>
              <p className="font-bold text-white">
                {anime.studios?.map(s => s.name).join(', ') || 'Studio Pierrot, Ufotable'}
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">Genres</p>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {anime.genres?.map((g, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-neutral-200 text-xs font-bold transition-colors"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">This Anime is</p>
              <p className="font-medium text-neutral-300">
                Exciting, Action-Packed, Visual Masterpiece, Supernatural, Thrilling
              </p>
            </div>
          </div>
        </section>

        {/* 6. "MORE LIKE THIS" RECOMMENDATIONS (NETFLIX SIGNATURE FEATURE) */}
        {recommendationsList.length > 0 && (
          <section className="space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <Sparkles size={20} className="text-amber-400" />
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  More Like This
                </h2>
              </div>
              <span className="text-xs font-bold text-neutral-400">
                Recommended For You
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {recommendationsList.map((rec, i) => (
                <div
                  key={`${rec.id}-${i}`}
                  className="rounded-lg overflow-hidden bg-[#181818] border border-white/10 hover:border-white/30 transition-all duration-300 flex flex-col group shadow-lg hover:shadow-2xl"
                >
                  {/* Card Media Preview */}
                  <div className="relative aspect-video w-full overflow-hidden bg-neutral-900">
                    <img
                      src={rec.image}
                      alt={rec.title}
                      onError={(e) => handleImageError(e, false)}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-xs bg-black/80 backdrop-blur-xs text-[10px] font-bold text-white border border-white/10">
                      {rec.format || 'TV'}
                    </div>
                  </div>

                  {/* Card Info & Match Percentage */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[#46d369] text-xs font-black">
                          {rec.matchPercent}% Match
                        </span>
                        <span className="px-1 py-0.2 rounded-xs border border-white/30 text-[10px] text-neutral-300 font-bold">
                          16+
                        </span>
                      </div>

                      <h3 className="text-sm font-black text-white group-hover:text-[#E50914] line-clamp-1 transition-colors">
                        {rec.title}
                      </h3>

                      <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed font-normal">
                        {rec.synopsis || "Recommended based on your interest in action and thrilling storylines."}
                      </p>
                    </div>

                    {/* Quick View Button */}
                    <Link
                      to={`/anime/${rec.mal_id || rec.id}`}
                      className="w-full py-2 rounded-md bg-white/10 hover:bg-[#E50914] text-white text-xs font-bold text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                    >
                      <Info size={14} />
                      <span>View Anime Details</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </motion.div>
  );
}
