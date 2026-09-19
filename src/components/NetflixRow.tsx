import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play, Star, Subtitles, Mic, Info } from 'lucide-react';
import { ReanimeAnimeItem } from '../services/reanimeService';
import { getAnimeImageUrl, handleImageError } from '../utils/imageHelper';

interface NetflixRowProps {
  title: string;
  items: ReanimeAnimeItem[];
  badgeColor?: string;
  badgeLabel?: string;
  showEpisode?: boolean;
}

export default function NetflixRow({ 
  title, 
  items, 
  badgeColor = '#E50914',
  badgeLabel,
  showEpisode = false 
}: NetflixRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -650 : 650;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="relative group/row space-y-3">
      {/* Row Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          {badgeLabel && (
            <span 
              className="px-2 py-0.5 rounded-xs text-[10px] font-black text-white uppercase tracking-wider"
              style={{ backgroundColor: badgeColor }}
            >
              {badgeLabel}
            </span>
          )}
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {title}
          </h2>
        </div>
      </div>

      {/* Slider Left Arrow */}
      <button
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-10 sm:w-12 h-36 sm:h-44 bg-black/60 hover:bg-black/90 text-white flex items-center justify-center rounded-r-md opacity-0 group-hover/row:opacity-100 transition-all duration-200 backdrop-blur-xs cursor-pointer shadow-2xl border-y border-r border-white/10 hover:scale-105"
        aria-label="Scroll left"
      >
        <ChevronLeft size={26} />
      </button>

      {/* Slider Right Arrow */}
      <button
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-30 w-10 sm:w-12 h-36 sm:h-44 bg-black/60 hover:bg-black/90 text-white flex items-center justify-center rounded-l-md opacity-0 group-hover/row:opacity-100 transition-all duration-200 backdrop-blur-xs cursor-pointer shadow-2xl border-y border-l border-white/10 hover:scale-105"
        aria-label="Scroll right"
      >
        <ChevronRight size={26} />
      </button>

      {/* Horizontal Carousel */}
      <div
        ref={scrollRef}
        className="flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar py-3 px-1 scroll-smooth"
      >
        {items.map((item, idx) => {
          const animeTitle = typeof item.title === 'string'
            ? item.title
            : (item.title?.english || item.title?.romaji || item.title?.user_preferred || 'Anime');
          
          const animeId = item.anime_id || String(item.mal_id || idx);
          const cover = getAnimeImageUrl(item);
          const epNum = item.episode?.episode_number;
          const score = item.average_score
            ? (item.average_score / 10).toFixed(1)
            : (item.mal_score ? item.mal_score.toFixed(1) : null);

          // Direct play ONLY for latest episodes section; everywhere else opens info page first
          const targetUrl = showEpisode && epNum ? `/watch/${animeId}/${epNum}` : `/anime/${animeId}`;

          return (
            <div
              key={`${animeId}-${epNum || ''}-${idx}`}
              className="relative flex-none w-32 sm:w-44 lg:w-48 aspect-[2/3] rounded-md overflow-hidden bg-[#181818] border border-white/10 group/card cursor-pointer select-none transition-all duration-300 transform hover:scale-105 hover:z-20 hover:border-white/40 shadow-lg hover:shadow-2xl"
            >
              <Link to={targetUrl} className="absolute inset-0 z-20">
                <span className="sr-only">Open {animeTitle}</span>
              </Link>

              {/* Poster Image */}
              <img
                src={cover}
                alt={animeTitle}
                loading="lazy"
                decoding="async"
                onError={handleImageError}
                className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                referrerPolicy="no-referrer"
              />

              {/* Cinematic Vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

              {/* Episode pill (Top Left) */}
              {showEpisode && epNum && (
                <div className="absolute top-2 left-2 z-20">
                  <span className="px-1.5 py-0.5 rounded-xs bg-[#E50914] text-white font-black text-[10px] tracking-wider shadow-md">
                    EP {epNum}
                  </span>
                </div>
              )}

              {/* Audio badges (Top Right) */}
              <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
                {Boolean(item.subbed) && (
                  <span className="px-1 py-0.5 rounded-xs bg-black/80 text-[8px] font-bold text-white/90 border border-white/10 flex items-center gap-0.5">
                    <Subtitles size={9} className="text-cyan-400" />
                    SUB
                  </span>
                )}
                {Boolean(item.dubbed) && (
                  <span className="px-1 py-0.5 rounded-xs bg-black/80 text-[8px] font-bold text-white/90 border border-white/10 flex items-center gap-0.5">
                    <Mic size={9} className="text-amber-400" />
                    DUB
                  </span>
                )}
              </div>

              {/* Hover Indicator */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
                <div className="w-11 h-11 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-2xl transform scale-75 group-hover/card:scale-100 transition-transform">
                  {showEpisode ? <Play size={18} fill="white" className="ml-0.5" /> : <Info size={20} />}
                </div>
              </div>

              {/* Footer Information */}
              <div className="absolute bottom-0 inset-x-0 p-2.5 z-20 space-y-1">
                <p className="text-white text-xs sm:text-sm font-bold truncate group-hover/card:text-[#E50914] transition-colors">
                  {animeTitle}
                </p>
                <div className="flex items-center justify-between text-[10px] text-neutral-400 font-medium">
                  <span className="uppercase">{item.format || 'TV'}</span>
                  {score && (
                    <div className="flex items-center gap-0.5 text-amber-400 font-bold">
                      <Star size={10} fill="currentColor" />
                      <span>{score}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
