import { useState, useEffect, useRef } from 'react';
import { Search, X, Star, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { reanimeService, ReanimeAnimeItem } from '../services/reanimeService';
import { getAnimeImageUrl, handleImageError } from '../utils/imageHelper';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ReanimeAnimeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await reanimeService.search(query.trim(), 12);
        setResults(data);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  // Close on Escape & Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl rounded-md bg-[#141414] border border-white/20 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Input */}
        <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-[#181818]">
          <Search size={20} className="text-[#E50914] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search anime by title, character, or genre..."
            className="flex-1 bg-transparent text-sm sm:text-base text-white placeholder-neutral-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-neutral-400 hover:text-white p-1 cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs px-2 py-1 rounded-xs bg-white/10 text-neutral-300 hover:bg-white/20 cursor-pointer"
          >
            ESC
          </button>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2">
              <div className="w-8 h-8 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-neutral-400">Searching Yuva catalog...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 space-y-1">
              <p className="text-sm font-medium text-neutral-300">
                {query ? `No anime found for "${query}"` : 'Type anything to find anime series, movies, and simulcasts'}
              </p>
              <p className="text-xs text-neutral-500">e.g. Solo Leveling, One Piece, Bleach, Dan Da Dan</p>
            </div>
          ) : (
            results.map((anime) => {
              const title = typeof anime.title === 'string'
                ? anime.title
                : (anime.title?.english || anime.title?.romaji || 'Anime');
              const subTitle = typeof anime.title === 'object' ? anime.title?.romaji : '';
              const animeId = anime.anime_id || String(anime.mal_id || '');
              const score = anime.average_score ? (anime.average_score / 10).toFixed(1) : (anime.mal_score ? anime.mal_score.toFixed(1) : null);

              return (
                <div
                  key={animeId}
                  onClick={() => {
                    navigate(`/anime/${animeId}`);
                    onClose();
                  }}
                  className="group flex items-center justify-between gap-3 p-2.5 rounded-md hover:bg-white/[0.08] border border-transparent hover:border-white/10 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={getAnimeImageUrl(anime)}
                      alt={title}
                      onError={handleImageError}
                      className="w-12 h-16 rounded-xs object-cover bg-neutral-900 shrink-0 border border-white/10 group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 space-y-0.5">
                      <h4 className="text-sm font-bold text-white truncate group-hover:text-[#E50914] transition-colors">
                        {title}
                      </h4>
                      {subTitle && subTitle !== title && (
                        <p className="text-xs text-neutral-400 truncate italic">
                          {subTitle}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                        <span className="uppercase text-neutral-300 font-bold">
                          {anime.format || 'TV'}
                        </span>
                        {anime.episodes && (
                          <>
                            <span className="w-1 h-1 bg-white/20 rounded-full" />
                            <span>{anime.episodes} eps</span>
                          </>
                        )}
                        {score && (
                          <>
                            <span className="w-1 h-1 bg-white/20 rounded-full" />
                            <span className="text-amber-400 font-bold flex items-center gap-0.5">
                              <Star size={10} fill="currentColor" />
                              {score}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/watch/${animeId}/1`);
                      onClose();
                    }}
                    className="p-2.5 rounded-xs bg-[#E50914]/20 hover:bg-[#E50914] text-[#E50914] hover:text-white transition-all shrink-0 cursor-pointer"
                    title="Watch Episode 1"
                  >
                    <Play size={14} fill="currentColor" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
