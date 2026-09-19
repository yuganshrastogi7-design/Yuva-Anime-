import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Star, Info } from 'lucide-react';
import { Anime } from '../services/animeService';
import { getAnimeImageUrl, handleImageError } from '../utils/imageHelper';

function AnimeCardComponent({ anime, progress }: { anime: Anime; progress?: { watched: number; total: number }; key?: React.Key }) {
  const progressPercent = progress && progress.total > 0 
    ? Math.min(Math.round((progress.watched / progress.total) * 100), 100) 
    : 0;

  const imageUrl = getAnimeImageUrl(anime);

  return (
    <div
      className="relative group rounded-md overflow-hidden aspect-[2/3] bg-[#181818] border border-white/10 shadow-lg flex flex-col hover:border-white/30 hover:-translate-y-1 active:scale-[0.99] transition-all duration-200 select-none"
    >
      <Link to={`/anime/${anime.mal_id}`} className="absolute inset-0 z-10">
        <span className="sr-only">View {anime.title}</span>
      </Link>
      
      <img
        src={imageUrl}
        alt={anime.title}
        loading="lazy"
        decoding="async"
        onError={handleImageError}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
        referrerPolicy="no-referrer"
      />
      
      {/* Netflix dark bottom gradient */}
      <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-[#141414] via-[#141414]/75 to-transparent z-10 pointer-events-none" />

      {/* Progress badge */}
      {progress && progress.total > 0 && (
        <div className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded-xs bg-[#E50914] text-[10px] font-bold text-white shadow-sm">
          Ep {progress.watched}/{progress.total}
        </div>
      )}
      
      {/* Score badge */}
      {anime.score ? (
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-black/70 backdrop-blur-xs px-2 py-0.5 rounded-xs text-[10px] font-bold text-[#46d369] border border-white/10 shadow-sm">
          <Star size={10} fill="currentColor" className="text-amber-400" />
          <span>{anime.score.toFixed(1)}</span>
        </div>
      ) : null}
      
      {/* Card Info */}
      <div className="absolute bottom-0 left-0 right-0 p-3 z-20 space-y-1">
        <h3 className="text-white font-bold text-xs sm:text-sm line-clamp-1 group-hover:text-[#E50914] transition-colors">
          {anime.title}
        </h3>
        <div className="flex items-center gap-2 text-[11px] text-neutral-400">
          <span className="uppercase font-semibold">{anime.type || 'Anime'}</span>
          {anime.status && (
            <>
              <span className="w-1 h-1 bg-white/30 rounded-full" />
              <span className="truncate">{anime.status}</span>
            </>
          )}
        </div>

        {progress && progress.total > 0 && (
          <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden mt-1.5">
            <div 
              style={{ width: `${progressPercent}%` }}
              className="h-full bg-[#E50914] rounded-full transition-all duration-300" 
            />
          </div>
        )}
      </div>
      
      {/* Hover Netflix Play Button */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 pointer-events-none">
        <div className="w-10 h-10 rounded-full bg-white text-black shadow-2xl flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform duration-200">
          <Play fill="currentColor" size={16} className="ml-0.5" />
        </div>
      </div>
    </div>
  );
}

const AnimeCard = React.memo(AnimeCardComponent);
export default AnimeCard;
