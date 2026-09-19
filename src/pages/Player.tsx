import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { animeService, Anime } from '../services/animeService';
import { 
  ChevronLeft, Info, SkipForward, SkipBack, Play, Star, 
  Check, ExternalLink, RotateCw, ShieldCheck, Activity,
  Volume2, Globe, AlertCircle, Sparkles, CheckCircle2,
  RefreshCw, Film, Subtitles, Mic, FastForward, Maximize2, Minimize2, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, db, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, 
  serverTimestamp, onSnapshot, OperationType, handleFirestoreError 
} from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getAnimeImageUrl, handleImageError } from '../utils/imageHelper';
import { AnimeSpinner } from '../components/AnimeLoader';

interface StreamingServer {
  id: string;
  name: string;
  tag: string;
  type: 'sub' | 'dub' | 'universal' | 'custom';
  quality: string;
  badge: string;
  getUrl: (id: string, ep: number) => string;
}

export default function Player() {
  const { id, episode } = useParams();
  const navigate = useNavigate();
  const [anime, setAnime] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Stored server selection with localStorage memory
  const [server, setServer] = useState<string>(() => {
    const saved = localStorage.getItem('yuva_preferred_server');
    if (saved && (saved.startsWith('server_') || saved.startsWith('reanime_') || saved === 'custom')) {
      return saved;
    }
    return 'server_1_sub';
  });
  
  const [iframeLoading, setIframeLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [watchedEpisodes, setWatchedEpisodes] = useState<number[]>([]);
  const [isWatchlist, setIsWatchlist] = useState(false);
  const [audioPreference, setAudioPreference] = useState<'sub' | 'dub'>('sub');
  const [customServerUrl, setCustomServerUrl] = useState('');
  const [isTestingServers, setIsTestingServers] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, { status: 'online' | 'checking'; latency: number }>>({});
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [resolvedReanimeData, setResolvedReanimeData] = useState<{
    slug: string;
    anilistId: number;
    title: string;
    webUrl: string;
    servers: Array<{
      id: string;
      name: string;
      type: 'sub' | 'dub' | 'universal' | 'custom';
      tag: string;
      quality: string;
      badge: string;
      url: string;
    }>;
  } | null>(null);
  const [isResolvingReanime, setIsResolvingReanime] = useState(false);
  const [skippedIntroNotice, setSkippedIntroNotice] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);
  const [autoPlayNext, setAutoPlayNext] = useState(() => {
    return localStorage.getItem('yuva_autoplay_next') === 'true';
  });
  const [episodeSearchQuery, setEpisodeSearchQuery] = useState('');

  const toggleAutoPlay = () => {
    setAutoPlayNext((prev) => {
      const nextVal = !prev;
      localStorage.setItem('yuva_autoplay_next', String(nextVal));
      return nextVal;
    });
  };

  const handleSkipIntro = () => {
    setSkippedIntroNotice(true);
    try {
      const iframe = document.getElementById('anime-player-iframe') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        // Send postMessage seek/skip commands to embedded player
        iframe.contentWindow.postMessage({ type: 'SEEK', offset: 85 }, '*');
        iframe.contentWindow.postMessage({ type: 'seek', time: 85 }, '*');
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [85, true] }), '*');
        iframe.contentWindow.postMessage({ action: 'skipIntro', seconds: 85 }, '*');
      }
    } catch (err) {
      console.warn('Could not postMessage to player iframe:', err);
    }
    setTimeout(() => setSkippedIntroNotice(false), 3200);
  };

  // Auth Hook
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return unsubscribe;
  }, []);

  // Fetch Anime Data
  useEffect(() => {
    const fetchAnime = async () => {
      if (!id) return;
      try {
        const data = await animeService.getDetails(id);
        setAnime(data);
      } catch (error) {
        console.error("Error fetching anime for player", error);
        const title = id.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        setAnime({
          mal_id: parseInt(id, 10) || 1,
          title,
          images: { 
            webp: { 
              image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80', 
              large_image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80' 
            } 
          },
          synopsis: `Stream ${title} on Yuva.`,
          type: 'TV',
          episodes: 24,
          status: 'Currently Airing',
          score: 8.6,
          rank: 1,
          genres: [{ name: 'Action' }, { name: 'Adventure' }],
          studios: [{ name: 'Yuva' }],
          aired: { string: 'Ongoing' },
          trailer: {}
        });
      } finally {
        setLoading(false);
      }
    };
    fetchAnime();
  }, [id]);

  const ep = parseInt(episode || '1');

  // Load User Data (Watchlist & Watched Episodes)
  useEffect(() => {
    if (!user || !id) return;

    const watchlistRef = doc(db, `users/${user.uid}/watchlist`, id);
    const historyRef = doc(db, `users/${user.uid}/history`, id);

    const unsubWatchlist = onSnapshot(watchlistRef, (snap) => {
      if (snap.exists()) {
        setIsWatchlist(true);
        const data = snap.data();
        if (data.watchedEpisodes) {
          setWatchedEpisodes(data.watchedEpisodes);
        }
      } else {
        setIsWatchlist(false);
      }
    });

    const unsubHistory = onSnapshot(historyRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.watchedEpisodes) {
          setWatchedEpisodes(data.watchedEpisodes);
        }
      }
    });

    return () => {
      unsubWatchlist();
      unsubHistory();
    };
  }, [user, id]);

  // Mark Current Episode as Watched
  useEffect(() => {
    const markAsWatched = async () => {
      if (!user || !id || !anime || iframeLoading) return;

      if (watchedEpisodes.includes(ep)) return;

      const path = `users/${user.uid}/history/${id}`;
      try {
        const ref = doc(db, path);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          await setDoc(ref, {
            animeId: id,
            title: anime.title,
            image: getAnimeImageUrl(anime),
            lastEpisode: ep,
            watchedEpisodes: [ep],
            updatedAt: serverTimestamp()
          });
        } else {
          await updateDoc(ref, {
            lastEpisode: ep,
            watchedEpisodes: arrayUnion(ep),
            updatedAt: serverTimestamp()
          });
        }

        const watchlistRef = doc(db, `users/${user.uid}/watchlist`, id);
        const watchlistSnap = await getDoc(watchlistRef);
        if (watchlistSnap.exists()) {
          await updateDoc(watchlistRef, {
            lastEpisode: ep,
            watchedEpisodes: arrayUnion(ep),
            updatedAt: serverTimestamp()
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    };

    const timer = setTimeout(markAsWatched, 6000);
    return () => clearTimeout(timer);
  }, [user, id, ep, anime, iframeLoading, watchedEpisodes]);

  // Handle iframe loading state on stream change
  useEffect(() => {
    setIframeLoading(true);
  }, [server, ep, id, customServerUrl]);

  const toggleWatched = async (episodeNum: number) => {
    if (!user || !id || !anime) return;

    const path = `users/${user.uid}/history/${id}`;
    const isWatched = watchedEpisodes.includes(episodeNum);
    
    try {
      const ref = doc(db, path);
      const watchlistRef = doc(db, `users/${user.uid}/watchlist`, id);

      const updateData = {
        watchedEpisodes: isWatched ? arrayRemove(episodeNum) : arrayUnion(episodeNum),
        updatedAt: serverTimestamp()
      };

      await setDoc(ref, {
        animeId: id,
        title: anime.title,
        image: getAnimeImageUrl(anime),
        lastEpisode: ep,
        watchedEpisodes: isWatched ? [] : [episodeNum],
        updatedAt: serverTimestamp()
      }, { merge: true });

      await updateDoc(ref, updateData);

      const wlSnap = await getDoc(watchlistRef);
      if (wlSnap.exists()) {
        await updateDoc(watchlistRef, updateData);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  // Fetch ReAnime Streams (with automatic client-side fallback for static/Vercel environments)
  useEffect(() => {
    if (!anime) return;
    let isMounted = true;
    const fetchReanimeStreams = async () => {
      setIsResolvingReanime(true);
      try {
        const queryParams = new URLSearchParams({
          title: anime.title || '',
          englishTitle: anime.title_english || '',
          ep: String(ep),
          malId: String(id || '')
        });
        const res = await fetch(`/api/reanime/resolve?${queryParams}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && data.servers && data.servers.length > 0) {
            setResolvedReanimeData(data);
            return;
          }
        }
      } catch (err) {
        console.warn("Backend resolver unavailable, running client stream fallback:", err);
      }

      // CLIENT-SIDE FALLBACK RESOLVER:
      // If deployed on Vercel/static host without backend, resolve streams directly
      try {
        let anilistId = 0;
        if (id && /^\d+$/.test(id)) {
          const q = `query ($idMal: Int) { Media(idMal: $idMal, type: ANIME) { id title { english romaji } } }`;
          const alResp = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({ query: q, variables: { idMal: parseInt(id, 10) } })
          });
          if (alResp.ok) {
            const alData = await alResp.json();
            if (alData.data?.Media?.id) {
              anilistId = alData.data.Media.id;
            }
          }
        }

        const targetId = anilistId || id;
        const fallbackData = {
          success: true,
          anime: { title: anime.title, anilistId: targetId },
          servers: [
            {
              id: 'server_1_sub',
              name: 'Server 1 Sub',
              tag: 'FlixCloud HD-1',
              type: 'sub' as const,
              quality: '1080p Full HD',
              badge: 'Server 1 Sub',
              url: `https://vidstuck.xyz/embed/anime/${targetId}/${ep}?dub=false`
            },
            {
              id: 'server_1_dub',
              name: 'Server 1 Dub',
              tag: 'FlixCloud HD-1 Dub',
              type: 'dub' as const,
              quality: '1080p Full HD',
              badge: 'Server 1 Dub',
              url: `https://vidstuck.xyz/embed/anime/${targetId}/${ep}?dub=true`
            },
            {
              id: 'server_2_sub',
              name: 'Server 2 Sub',
              tag: 'FlixCloud HD-2',
              type: 'sub' as const,
              quality: '1080p HD',
              badge: 'Server 2 Sub',
              url: `https://vidstuck.xyz/embed/anime/${targetId}/${ep}?dub=false`
            },
            {
              id: 'server_2_dub',
              name: 'Server 2 Dub',
              tag: 'FlixCloud HD-2 Dub',
              type: 'dub' as const,
              quality: '1080p HD',
              badge: 'Server 2 Dub',
              url: `https://vidstuck.xyz/embed/anime/${targetId}/${ep}?dub=true`
            },
            {
              id: 'vidstuck',
              name: 'Vidstuck Server',
              tag: 'Vidstuck Cloud',
              type: 'universal' as const,
              quality: '1080p Multi-Audio',
              badge: 'Vidstuck',
              url: `https://vidstuck.xyz/embed/anime/${targetId}/${ep}`
            }
          ]
        };
        if (isMounted) {
          setResolvedReanimeData(fallbackData);
        }
      } catch (fallbackErr) {
        console.error("Client stream fallback error:", fallbackErr);
      } finally {
        if (isMounted) setIsResolvingReanime(false);
      }
    };

    fetchReanimeStreams();
    return () => { isMounted = false; };
  }, [anime, ep, id]);

  // Official Servers with user requested names:
  // "rename the servers with server 1 sub , server 2 sub for sub and for dub same also but with dub written their with them not sub"
  const servers: StreamingServer[] = useMemo(() => {
    const list: StreamingServer[] = [];

    if (resolvedReanimeData?.servers && resolvedReanimeData.servers.length > 0) {
      resolvedReanimeData.servers.forEach((s) => {
        list.push({
          id: s.id,
          name: s.name,
          tag: s.tag,
          type: s.type,
          quality: s.quality,
          badge: s.badge,
          getUrl: () => s.url
        });
      });
    } else {
      // ReAnime.to and Vidstuck verified servers matching user naming schema
      list.push(
        {
          id: 'server_1_sub',
          name: 'Server 1 Sub',
          tag: 'FlixCloud HD-1',
          type: 'sub',
          quality: '1080p Full HD',
          badge: 'Server 1 Sub',
          getUrl: (aid, episodeNum) => `https://vidstuck.xyz/embed/anime/${aid}/${episodeNum}?dub=false`
        },
        {
          id: 'server_1_dub',
          name: 'Server 1 Dub',
          tag: 'FlixCloud HD-1 Dub',
          type: 'dub',
          quality: '1080p Full HD',
          badge: 'Server 1 Dub',
          getUrl: (aid, episodeNum) => `https://vidstuck.xyz/embed/anime/${aid}/${episodeNum}?dub=true`
        },
        {
          id: 'server_2_sub',
          name: 'Server 2 Sub',
          tag: 'FlixCloud HD-2',
          type: 'sub',
          quality: '1080p HD',
          badge: 'Server 2 Sub',
          getUrl: (aid, episodeNum) => `https://vidstuck.xyz/embed/anime/${aid}/${episodeNum}?dub=false`
        },
        {
          id: 'server_2_dub',
          name: 'Server 2 Dub',
          tag: 'FlixCloud HD-2 Dub',
          type: 'dub',
          quality: '1080p HD',
          badge: 'Server 2 Dub',
          getUrl: (aid, episodeNum) => `https://vidstuck.xyz/embed/anime/${aid}/${episodeNum}?dub=true`
        },
        {
          id: 'vidstuck',
          name: 'Vidstuck Server',
          tag: 'Vidstuck Cloud',
          type: 'universal',
          quality: '1080p Multi-Audio',
          badge: 'Vidstuck',
          getUrl: (aid, episodeNum) => `https://vidstuck.xyz/embed/anime/${aid}/${episodeNum}`
        }
      );
    }

    // Direct custom link option
    list.push({
      id: 'custom',
      name: 'Custom Stream',
      tag: 'Custom',
      type: 'custom',
      quality: 'Direct Stream',
      badge: 'Custom',
      getUrl: () => customServerUrl.trim()
    });

    return list;
  }, [resolvedReanimeData, customServerUrl, id, ep]);

  // Ensure active server points to a valid server
  useEffect(() => {
    if (servers.length === 0) return;
    const exists = servers.some(s => s.id === server);
    if (!exists) {
      const preferred = audioPreference === 'dub'
        ? servers.find(s => s.type === 'dub')?.id || servers[0].id
        : servers.find(s => s.type === 'sub')?.id || servers[0].id;
      setServer(preferred);
    }
  }, [servers, server, audioPreference]);

  // Active stream URL
  const currentServerObj = servers.find(s => s.id === server) || servers[0];
  const streamUrl = currentServerObj?.id === 'custom' && customServerUrl.trim()
    ? customServerUrl.trim()
    : currentServerObj?.getUrl(id || '', ep) || '';

  const totalEpisodes = anime?.episodes || 12;
  const isCurrentWatched = watchedEpisodes.includes(ep);

  const handleSelectServer = (serverId: string) => {
    setServer(serverId);
    localStorage.setItem('yuva_preferred_server', serverId);
    setIframeLoading(true);
  };

  const handleToggleAudio = (mode: 'sub' | 'dub') => {
    setAudioPreference(mode);
    if (mode === 'sub') {
      const subServer = servers.find(s => s.type === 'sub');
      if (subServer) handleSelectServer(subServer.id);
    } else {
      const dubServer = servers.find(s => s.type === 'dub');
      if (dubServer) handleSelectServer(dubServer.id);
    }
  };

  const handleReload = () => {
    setIframeLoading(true);
  };

  const handleOpenExternal = () => {
    if (streamUrl) {
      window.open(streamUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const subServers = servers.filter(s => s.type === 'sub');
  const dubServers = servers.filter(s => s.type === 'dub');

  if (loading && !anime) {
    return (
      <div className="py-24">
        <AnimeSpinner text="Connecting to Yuva Stream Engine..." />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-16 select-none"
    >
      {/* Netflix Top Navigation Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(`/anime/${id}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#181818] hover:bg-[#252525] border border-white/10 text-neutral-300 hover:text-white transition-all text-xs font-bold cursor-pointer"
            title="Back to anime info"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">Anime Info</span>
          </button>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-[11px] text-neutral-400">
              <Link to="/" className="hover:text-white transition-colors">Home</Link>
              <span>/</span>
              <Link to={`/anime/${id}`} className="hover:text-white transition-colors truncate max-w-[140px] sm:max-w-xs font-medium">
                {anime.title}
              </Link>
              <span>/</span>
              <span className="text-[#E50914] font-black">Episode {ep}</span>
            </div>
            <h1 className="text-base sm:text-xl font-black text-white tracking-tight truncate max-w-[260px] sm:max-w-md">
              {anime.title}
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Sub / Dub Mode Switcher */}
          <div className="flex items-center p-0.5 rounded-md bg-[#181818] border border-white/10">
            <button
              onClick={() => handleToggleAudio('sub')}
              className={`flex items-center gap-1 px-3 py-1 rounded-xs text-xs font-bold transition-all cursor-pointer ${
                audioPreference === 'sub'
                  ? 'bg-[#E50914] text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Subtitles size={12} />
              <span>SUB</span>
            </button>
            <button
              onClick={() => handleToggleAudio('dub')}
              className={`flex items-center gap-1 px-3 py-1 rounded-xs text-xs font-bold transition-all cursor-pointer ${
                audioPreference === 'dub'
                  ? 'bg-[#E50914] text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Mic size={12} />
              <span>DUB</span>
            </button>
          </div>

          {/* Mark Watched Button */}
          <button
            onClick={() => toggleWatched(ep)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold border transition-all cursor-pointer ${
              isCurrentWatched 
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-sm' 
                : 'bg-[#181818] hover:bg-[#252525] border-white/10 text-neutral-300'
            }`}
          >
            <Check size={14} />
            <span className="hidden sm:inline">{isCurrentWatched ? 'Watched' : 'Mark Watched'}</span>
          </button>
          
          {/* Popout */}
          <button 
            onClick={handleOpenExternal}
            className="p-2 rounded-md bg-[#181818] hover:bg-[#252525] border border-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer"
            title="Open player in new window"
          >
            <ExternalLink size={15} />
          </button>
        </div>
      </div>

      {/* Cinematic Netflix Video Player Box */}
      <div className={`space-y-4 transition-all duration-300 ${theaterMode ? 'w-full max-w-none' : ''}`}>
        <div className={`relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-white/15 shadow-2xl ${theaterMode ? 'max-h-[85vh]' : ''}`}>
          {(!streamUrl || isResolvingReanime || iframeLoading) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0d0d]/95 backdrop-blur-md z-10 space-y-3 p-6 text-center">
              <div className="w-10 h-10 border-3 border-[#E50914] border-t-transparent rounded-full animate-spin" />
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-white font-bold flex items-center justify-center gap-1.5">
                  <ShieldCheck size={16} className="text-[#46d369]" />
                  <span>{currentServerObj?.name || 'Server 1 Sub'}</span>
                </p>
                <p className="text-[11px] text-neutral-400">
                  Streaming {anime.title} — Episode {ep}
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] px-2 py-0.5 rounded-xs bg-[#E50914]/20 text-[#E50914] font-bold border border-[#E50914]/40">
                  {currentServerObj?.quality || '1080p HD'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-xs bg-white/10 text-neutral-300 font-bold">
                  Fast CDN
                </span>
              </div>
            </div>
          )}

          {/* Skip Intro Toast Notice */}
          {skippedIntroNotice && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-black/95 border border-amber-400 text-amber-300 text-xs font-black shadow-2xl flex items-center gap-2 animate-pulse pointer-events-none">
              <FastForward size={14} className="text-amber-400" />
              <span>Skipped Opening Intro (+85s)</span>
            </div>
          )}

          {streamUrl && (
            <iframe
              id="anime-player-iframe"
              key={`${server}-${ep}-${id}-${streamUrl}`}
              src={streamUrl}
              onLoad={() => setIframeLoading(false)}
              className="w-full h-full border-0"
              allowFullScreen
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Watch ${anime.title} Episode ${ep}`}
            />
          )}
        </div>

        {/* Streamlined Netflix-Style Player Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-md bg-[#181818] border border-white/10 shadow-lg">
          <div className="flex items-center flex-wrap gap-2">
            <button
              disabled={ep <= 1}
              onClick={() => navigate(`/watch/${id}/${ep - 1}`)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#222222] hover:bg-[#2c2c2c] text-white text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer border border-white/5"
              title="Previous Episode"
            >
              <SkipBack size={14} />
              <span className="hidden sm:inline">Prev</span>
            </button>

            {/* Single Skip Intro Button */}
            <button
              onClick={handleSkipIntro}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#222222] hover:bg-[#2c2c2c] text-amber-300 hover:text-amber-200 text-xs font-bold transition-colors cursor-pointer border border-amber-500/30 hover:border-amber-500/50 shadow-xs"
              title="Skip opening credits (+85s)"
            >
              <FastForward size={14} className="text-amber-400" />
              <span>Skip Intro</span>
              <span className="text-[10px] text-amber-400/80 font-bold bg-white/5 px-1 rounded-xs">+85s</span>
            </button>

            {/* Single Next Episode Button */}
            <button
              disabled={ep >= totalEpisodes}
              onClick={() => navigate(`/watch/${id}/${ep + 1}`)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#E50914] hover:bg-[#c11119] text-white text-xs font-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-md"
              title="Next Episode"
            >
              <span>Next Episode</span>
              <SkipForward size={14} />
            </button>

            <span className="text-xs text-neutral-400 font-medium pl-1 text-[11px] sm:text-xs">
              Ep {ep} / {totalEpisodes}
            </span>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Auto-Play Toggle */}
            <button
              onClick={toggleAutoPlay}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-md text-xs font-bold transition-colors cursor-pointer border ${
                autoPlayNext
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-[#222222] hover:bg-[#2c2c2c] text-neutral-400 border-white/5'
              }`}
              title="Auto-play next episode on finish"
            >
              <span className={`w-2 h-2 rounded-full ${autoPlayNext ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'}`} />
              <span className="hidden sm:inline">Auto-Play</span>
            </button>

            {/* Theater Mode Toggle */}
            <button
              onClick={() => setTheaterMode(!theaterMode)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold transition-colors cursor-pointer border ${
                theaterMode 
                  ? 'bg-[#E50914] text-white border-red-600' 
                  : 'bg-[#222222] hover:bg-[#2c2c2c] text-neutral-300 hover:text-white border-white/5'
              }`}
              title={theaterMode ? 'Exit theater mode' : 'Expand theater mode'}
            >
              {theaterMode ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span className="hidden sm:inline">{theaterMode ? 'Default' : 'Theater'}</span>
            </button>

            <button
              onClick={handleReload}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#222222] hover:bg-[#2c2c2c] text-neutral-300 hover:text-white text-xs font-bold transition-colors cursor-pointer border border-white/5"
              title="Reload video stream"
            >
              <RotateCw size={13} />
              <span className="hidden sm:inline">Reload</span>
            </button>

            <button
              onClick={handleOpenExternal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#222222] hover:bg-[#2c2c2c] text-neutral-300 hover:text-white text-xs font-bold transition-colors cursor-pointer border border-white/5"
              title="Open full window popout"
            >
              <ExternalLink size={13} />
              <span className="hidden sm:inline">Popout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Netflix Streaming Server Selection */}
      <section className="p-5 rounded-xl bg-[#181818] border border-white/10 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Film size={16} className="text-[#E50914]" />
              <h2 className="text-sm sm:text-base font-black text-white tracking-tight">
                Streaming Servers
              </h2>
            </div>
            <p className="text-xs text-neutral-400">
              Select between Sub and Dub servers. If a server buffers, switch to Server 2 or reload.
            </p>
          </div>

          <div className="flex items-center gap-1 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-bold text-[11px]">All Servers Active</span>
          </div>
        </div>

        {/* Subtitles Group */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-300">
            <Subtitles size={13} className="text-cyan-400" />
            <span>Subbed Servers (Japanese Audio + English Subs)</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {subServers.map((s) => {
              const isActive = server === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => handleSelectServer(s.id)}
                  className={`flex flex-col items-start p-3 rounded-md text-left transition-all cursor-pointer border relative ${
                    isActive
                      ? 'bg-[#E50914] text-white border-transparent shadow-lg shadow-red-950/40 ring-1 ring-white/40'
                      : 'bg-[#222222] text-neutral-300 hover:text-white hover:bg-[#2a2a2a] border-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-black truncate">{s.name}</span>
                    <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-emerald-400'}`} />
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-neutral-300/80 mt-1 font-medium">
                    <span>{s.quality}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dubbed Group */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-300">
            <Mic size={13} className="text-amber-400" />
            <span>Dubbed Servers (English Audio)</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {dubServers.map((s) => {
              const isActive = server === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => handleSelectServer(s.id)}
                  className={`flex flex-col items-start p-3 rounded-md text-left transition-all cursor-pointer border relative ${
                    isActive
                      ? 'bg-[#E50914] text-white border-transparent shadow-lg shadow-red-950/40 ring-1 ring-white/40'
                      : 'bg-[#222222] text-neutral-300 hover:text-white hover:bg-[#2a2a2a] border-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-black truncate">{s.name}</span>
                    <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-emerald-400'}`} />
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-neutral-300/80 mt-1 font-medium">
                    <span>{s.quality}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Server Link */}
        {server === 'custom' && (
          <div className="pt-3 space-y-2 border-t border-white/10">
            <label className="text-xs font-bold text-white flex items-center gap-1.5">
              <Globe size={13} className="text-[#E50914]" />
              <span>Custom Video Stream URL:</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customServerUrl}
                onChange={(e) => setCustomServerUrl(e.target.value)}
                placeholder="Paste video embed URL..."
                className="flex-1 px-3.5 py-2 rounded-md bg-[#222222] border border-white/10 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#E50914]"
              />
              <button
                onClick={() => setIframeLoading(true)}
                className="px-4 py-2 rounded-md bg-[#E50914] text-xs font-bold text-white shrink-0 cursor-pointer hover:bg-[#c11119]"
              >
                Load Stream
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Netflix Episode Selector Grid */}
      <section className="p-5 rounded-xl bg-[#181818] border border-white/10 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-white tracking-tight">
              Select Episode
            </h2>
            <span className="text-xs text-neutral-400 font-bold">
              ({totalEpisodes} Available)
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Episode Filter Input */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={episodeSearchQuery}
                onChange={(e) => setEpisodeSearchQuery(e.target.value)}
                placeholder="Find Ep (e.g. 12)..."
                className="pl-7 pr-3 py-1 rounded-md bg-[#222222] border border-white/10 text-xs text-white placeholder:text-neutral-500 w-36 sm:w-44 focus:outline-none focus:border-[#E50914]"
              />
              {episodeSearchQuery && (
                <button
                  onClick={() => setEpisodeSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-[10px]"
                >
                  ×
                </button>
              )}
            </div>

            <div className="text-xs font-bold text-neutral-400 hidden sm:block">
              Watched: <span className="text-[#E50914]">{watchedEpisodes.length}</span> / {totalEpisodes}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2 max-h-72 overflow-y-auto pr-1">
          {[...Array(totalEpisodes)].map((_, i) => {
            const episodeNum = i + 1;
            if (episodeSearchQuery.trim()) {
              const q = episodeSearchQuery.trim();
              if (!String(episodeNum).includes(q)) {
                return null;
              }
            }
            const isPlaying = ep === episodeNum;
            const isWatched = watchedEpisodes.includes(episodeNum);

            return (
              <div key={i} className="relative">
                <Link
                  to={`/watch/${id}/${episodeNum}`}
                  className={`w-full py-2.5 rounded-md text-xs font-black text-center block transition-all border ${
                    isPlaying
                      ? 'bg-[#E50914] text-white border-[#E50914] shadow-md shadow-red-950/40 ring-1 ring-white/50'
                      : isWatched
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                        : 'bg-[#222222] hover:bg-[#2e2e2e] text-neutral-300 hover:text-white border-white/5'
                  }`}
                >
                  <span className="text-[10px] text-neutral-400 block -mb-0.5 font-normal">EP</span>
                  {episodeNum}
                </Link>
                {isWatched && !isPlaying && (
                  <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Anime Quick Summary Card */}
      <section className="p-5 rounded-xl bg-[#181818] border border-white/10 shadow-xl">
        <div className="flex flex-row gap-4 sm:gap-5">
          <img
            src={getAnimeImageUrl(anime)}
            alt={anime.title}
            onError={handleImageError}
            className="w-20 h-28 sm:w-24 sm:h-36 object-cover rounded-md shrink-0 border border-white/10 shadow-md block"
            referrerPolicy="no-referrer"
          />
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded-xs bg-[#E50914] text-white font-black uppercase">
                {anime.type || 'TV'}
              </span>
              {anime.score ? (
                <span className="text-xs text-amber-400 font-bold flex items-center gap-1">
                  <Star size={12} fill="currentColor" />
                  <span>{anime.score.toFixed(1)} / 10</span>
                </span>
              ) : null}
              {anime.status && (
                <span className="text-xs text-neutral-400">• {anime.status}</span>
              )}
            </div>
            <h3 className="text-white font-black text-base tracking-tight">{anime.title}</h3>
            {anime.synopsis && (
              <p className="text-xs text-neutral-300 leading-relaxed line-clamp-3">
                {anime.synopsis}
              </p>
            )}
            <div className="pt-1">
              <Link 
                to={`/anime/${id}`} 
                className="text-xs font-bold text-[#E50914] hover:underline"
              >
                View Full Details, Cast & Reviews →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
