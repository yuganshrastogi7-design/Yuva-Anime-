import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Library, Trash2, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AnimeCard from '../components/AnimeCard';
import { Link } from 'react-router-dom';

interface WatchlistItem {
  animeId: string;
  title: string;
  image: string;
  type: string;
  watchedEpisodes?: number[];
  lastEpisode?: number;
}

export default function Watchlist({ user }: { user: User | null }) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, `users/${user.uid}/watchlist`),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => doc.data() as WatchlistItem);
      setItems(docs);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4 text-center apple-glass-card rounded-3xl p-8 border border-white/15 shadow-2xl max-w-md mx-auto my-12">
        <div className="p-4 apple-glass-pill rounded-full text-neutral-300">
          <Library size={36} />
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">Sign in to view your Watchlist</h2>
        <p className="text-xs text-neutral-400 max-w-sm leading-relaxed">Keep track of shows you want to watch and monitor your episode progress across all devices.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-12"
    >
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">My Watchlist</h1>
          <p className="text-xs text-neutral-400 mt-1 flex items-center gap-2">
            <span className="apple-glass-pill px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-neutral-300">
              {items.length} {items.length === 1 ? 'title' : 'titles'} saved
            </span>
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-[2/3] shimmer rounded-2xl apple-glass" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center space-y-4 apple-glass-card rounded-3xl p-8 sm:p-12 text-center border border-white/15 shadow-2xl">
          <div className="p-4 apple-glass-pill rounded-full text-neutral-300">
            <Library size={36} />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-white tracking-tight">Your watchlist is empty</p>
            <p className="text-xs text-neutral-400">Explore anime and tap "Add to Watchlist" to save them here.</p>
          </div>
          <Link 
            to="/" 
            className="apple-glass-primary-btn text-white px-6 py-2.5 rounded-full text-xs font-semibold shadow-xl active:scale-95"
          >
            Browse Popular Anime
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          <AnimatePresence>
            {items.map((item) => (
              <div key={item.animeId}>
                <AnimeCard 
                  anime={{ 
                    mal_id: parseInt(item.animeId), 
                    title: item.title, 
                    images: { webp: { image_url: item.image, large_image_url: item.image } },
                    type: item.type,
                    status: 'Saved',
                    score: 0,
                    synopsis: '',
                    episodes: item.watchedEpisodes?.length || 0,
                    rank: 0,
                    genres: [],
                    studios: [],
                    aired: { string: '' },
                    trailer: { embed_url: '' }
                  } as any}
                  progress={item.watchedEpisodes ? {
                    watched: item.watchedEpisodes.length,
                    total: item.watchedEpisodes.length > 0 ? Math.max(item.lastEpisode || 0, item.watchedEpisodes.length) : 0
                  } : undefined}
                />
              </div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
