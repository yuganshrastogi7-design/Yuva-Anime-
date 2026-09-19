import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play, Star, Subtitles, Mic } from 'lucide-react';
import { getAnimeImageUrl, handleImageError } from '../utils/imageHelper';

interface Top10Item {
  id?: string | number;
  mal_id?: number;
  anime_id?: string;
  title: string | { english?: string; romaji?: string; user_preferred?: string };
  image?: string;
  cover_image?: string | any;
  images?: { webp?: { large_image_url?: string } };
  score?: number;
  average_score?: number;
  type?: string;
  format?: string;
  subbed?: boolean;
  dubbed?: boolean;
}

interface NetflixTop10RowProps {
  items: Top10Item[];
  title?: string;
}

export default function NetflixTop10Row({ items, title = "Top 10 Anime in Today" }: NetflixTop10RowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -500 : 500;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="relative group/row space-y-3">
      {/* Row Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <div className="px-2 py-0.5 rounded-xs bg-[#E50914] text-white flex items-center justify-center font-black text-[10px] tracking-wider uppercase shadow-sm">
            TOP 10
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {title}
          </h2>
        </div>
      </div>

      {/* Slider Controls */}
      <button
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-10 sm:w-12 h-36 sm:h-44 bg-black/60 hover:bg-black/90 text-white flex items-center justify-center rounded-r-md opacity-0 group-hover/row:opacity-100 transition-all duration-200 backdrop-blur-xs cursor-pointer shadow-2xl border-y border-r border-white/10 hover:scale-105"
        aria-label="Scroll left"
      >
        <ChevronLeft size={26} />
      </button>

      <button
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-30 w-10 sm:w-12 h-36 sm:h-44 bg-black/60 hover:bg-black/90 text-white flex items-center justify-center rounded-l-md opacity-0 group-hover/row:opacity-100 transition-all duration-200 backdrop-blur-xs cursor-pointer shadow-2xl border-y border-l border-white/10 hover:scale-105"
        aria-label="Scroll right"
      >
        <ChevronRight size={26} />
      </button>

      {/* Horizontal Carousel Container */}
      <div
        ref={scrollRef}
        className="flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar py-3 px-1 scroll-smooth"
      >
        {items.slice(0, 10).map((item, index) => {
          const rank = index + 1;
          const animeTitle = typeof item.title === 'string'
            ? item.title
            : (item.title?.english || item.title?.romaji || item.title?.user_preferred || 'Anime');
          
          const animeId = item.anime_id || String(item.mal_id || item.id || '');
          const cover = getAnimeImageUrl(item);
          const score = item.average_score
            ? (item.average_score / 10).toFixed(1)
            : (item.score ? item.score.toFixed(1) : null);

          return (
            <div
              key={`${animeId}-${rank}`}
              className="relative flex-none flex items-center group/card cursor-pointer select-none"
            >
              {/* Giant Netflix Number */}
              <div className="relative -mr-3 sm:-mr-5 z-0 select-none pointer-events-none">
                <span 
                  className="font-black italic tracking-tighter text-[110px] sm:text-[145px] lg:text-[160px] leading-none"
                  style={{
                    color: '#141414',
                    WebkitTextStroke: '4px #595959',
                    filter: 'drop-shadow(2px 2px 8px rgba(0,0,0,0.85))'
                  }}
                >
                  {rank}
                </span>
              </div>

              {/* Poster Card */}
              <div className="relative z-10 w-28 sm:w-36 lg:w-40 aspect-[2/3] rounded-md overflow-hidden bg-[#181818] border border-white/10 group-hover/card:border-white/40 transition-all duration-300 transform group-hover/card:scale-105 group-hover/card:-translate-y-1 shadow-xl">
                <Link to={`/anime/${animeId}`} className="absolute inset-0 z-20">
                  <span className="sr-only">View {animeTitle}</span>
                </Link>

                <img
                  src={cover}
                  alt={animeTitle}
                  loading="lazy"
                  decoding="async"
                  onError={handleImageError}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                  referrerPolicy="no-referrer"
                />

                {/* Subtle vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                {/* Audio indicators */}
                <div className="absolute top-1.5 right-1.5 z-20 flex items-center gap-0.5">
                  <span className="px-1 py-0.5 rounded-xs bg-black/80 text-[8px] font-bold text-white/90 border border-white/10">
                    SUB
                  </span>
                </div>

                {/* Quick Play Icon on Hover */}
                <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-white text-black shadow-2xl flex items-center justify-center transform scale-75 group-hover/card:scale-100 transition-transform duration-200">
                    <Play fill="currentColor" size={16} className="ml-0.5" />
                  </div>
                </div>

                {/* Card Footer Info */}
                <div className="absolute bottom-0 inset-x-0 p-2 z-20">
                  <p className="text-white text-[11px] sm:text-xs font-bold truncate group-hover/card:text-[#E50914] transition-colors">
                    {animeTitle}
                  </p>
                  {score && (
                    <div className="flex items-center gap-1 text-[10px] text-amber-400 font-bold">
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
