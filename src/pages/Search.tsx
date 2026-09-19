import { useState, useEffect } from 'react';
import { animeService, Anime } from '../services/animeService';
import AnimeCard from '../components/AnimeCard';
import { Search as SearchIcon, X, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  const [popular, setPopular] = useState<Anime[]>([]);

  useEffect(() => {
    const loadPopular = async () => {
      const data = await animeService.getPopular();
      setPopular(data);
    };
    loadPopular();
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (query.trim()) {
        setLoading(true);
        try {
          const data = await animeService.searchAnime(query);
          setResults(data);
        } catch (error) {
          console.error("Search error", error);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-12"
    >
      {/* Search Input - Netflix Cinema Search Bar */}
      <div className="relative max-w-2xl mx-auto">
        <div className="relative group bg-[#181818] rounded-md p-1 border border-white/15 shadow-2xl transition-all focus-within:border-white/50">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-[#E50914] transition-colors" size={20} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search anime titles, characters, or genres..."
            className="w-full bg-transparent border-0 py-3 pl-12 pr-11 text-sm sm:text-base text-white placeholder:text-neutral-500 focus:outline-none"
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
          >
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-[#181818] animate-pulse rounded-md border border-white/5" />
            ))}
          </motion.div>
        ) : query.trim() ? (
          <motion.section 
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-white tracking-tight">Results for "{query}"</h2>
              <span className="px-2.5 py-1 rounded-xs bg-[#181818] border border-white/10 text-xs font-bold text-neutral-300">
                {results.length} found
              </span>
            </div>
            {results.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {results.map((anime) => (
                  <AnimeCard key={anime.mal_id} anime={anime} />
                ))}
              </div>
            ) : (
              <div className="min-h-[30vh] flex flex-col items-center justify-center space-y-2 bg-[#181818] rounded-md p-8 text-center border border-white/10 shadow-2xl">
                <p className="text-base font-bold text-neutral-200">No anime found matching your search</p>
                <p className="text-xs text-neutral-400">Try searching for keywords like "Demon Slayer", "Attack on Titan", or "Jujutsu Kaisen".</p>
              </div>
            )}
          </motion.section>
        ) : (
          <motion.section 
            key="popular"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="text-[#E50914]" size={20} />
                <h2 className="text-xl font-black text-white tracking-tight">Community Favorites</h2>
              </div>
              <span className="px-2.5 py-1 rounded-xs bg-[#181818] border border-white/10 text-xs font-bold text-neutral-300">
                Recommended by Real Fans
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {popular.map((anime) => (
                <AnimeCard key={anime.mal_id} anime={anime} />
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
