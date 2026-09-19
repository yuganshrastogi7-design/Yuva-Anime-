import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { 
  Home as HomeIcon, 
  Search, 
  Library, 
  User as UserIcon, 
  LogOut, 
  Calendar, 
  MessageSquare, 
  Trophy, 
  Command
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import HomePage from './pages/Home';
import AnimeDetailsPage from './pages/AnimeDetails';
import WatchlistPage from './pages/Watchlist';
import PlayerPage from './pages/Player';
import SearchPage from './pages/Search';
import SchedulePage from './pages/Schedule';
import CommunityPage from './pages/Community';
import LeaderboardPage from './pages/Leaderboard';
import AuthModal from './components/AuthModal';
import SearchModal from './components/SearchModal';

function Header({ 
  user, 
  onAuthOpen, 
  onOpenSearch 
}: { 
  user: User | null; 
  onAuthOpen: () => void; 
  onOpenSearch: () => void;
}) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 25);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { path: '/', label: 'Home', icon: HomeIcon },
    { path: '/schedule', label: 'Schedule', icon: Calendar },
    { path: '/community', label: 'Community', icon: MessageSquare },
    { path: '/leaderboard', label: 'Rankings', icon: Trophy },
    { path: '/watchlist', label: 'My List', icon: Library },
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 z-40 h-16 transition-all duration-300 ${
      isScrolled 
        ? 'bg-[#141414]/95 border-b border-white/10 shadow-2xl backdrop-blur-md' 
        : 'bg-gradient-to-b from-black/95 via-black/60 to-transparent border-b border-transparent'
    }`}>
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Yuva Brand & Desktop Navigation */}
        <div className="flex items-center gap-6 lg:gap-8">
          <Link to="/" className="flex items-center gap-2 group shrink-0" aria-label="Yuva Anime Home">
            <span className="text-2xl sm:text-3xl font-black tracking-tighter text-[#E50914] select-none font-sans drop-shadow-md">
              YUVA
            </span>
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-xs bg-[#E50914]/15 text-[9px] font-black text-[#E50914] tracking-widest uppercase border border-[#E50914]/30">
              ANIME
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xs text-xs font-bold tracking-wide transition-all duration-200 ${
                    isActive
                      ? 'text-white font-black bg-white/10'
                      : 'text-neutral-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <link.icon size={13} className={isActive ? 'text-[#E50914]' : ''} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Quick Search Button */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xs bg-[#181818] hover:bg-[#222222] text-neutral-400 hover:text-white border border-white/10 text-xs transition-all cursor-pointer"
            title="Search Anime (Cmd+K)"
          >
            <Search size={14} className="text-[#E50914]" />
            <span className="hidden sm:inline text-neutral-300 text-xs font-semibold">Search anime...</span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-xs bg-black/50 text-[10px] text-neutral-400 border border-white/10">
              <Command size={10} />K
            </kbd>
          </button>

          {/* User Profile / Netflix Sign In */}
          <div className="relative">
            {user ? (
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 p-0.5 rounded-xs ring-2 ring-white/15 hover:ring-[#E50914] transition-all cursor-pointer"
              >
                <img
                  src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`}
                  alt="Profile"
                  className="w-8 h-8 rounded-xs object-cover bg-neutral-800"
                  referrerPolicy="no-referrer"
                />
              </button>
            ) : (
              <button
                onClick={onAuthOpen}
                className="bg-[#E50914] hover:bg-[#c11119] text-white px-4 py-1.5 rounded-xs text-xs sm:text-sm font-bold shadow-md shadow-red-950/40 transition-colors cursor-pointer active:scale-95"
              >
                Sign In
              </button>
            )}

            <AnimatePresence>
              {isProfileOpen && user && (
                <div
                  className="absolute top-full mt-3 right-0 bg-[#141414] border border-white/15 rounded-md w-64 p-4 shadow-2xl z-50 overflow-hidden space-y-3"
                >
                  <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                    <img
                      src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`}
                      className="w-10 h-10 rounded-xs object-cover bg-neutral-800 ring-1 ring-white/20"
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                    <div className="overflow-hidden">
                      <p className="font-bold text-sm text-white truncate">{user.displayName || 'Anime Fan'}</p>
                      <p className="text-xs text-neutral-400 truncate">{user.email}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Link
                      to="/watchlist"
                      onClick={() => setIsProfileOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-200 hover:text-white hover:bg-white/10 rounded-xs transition-colors"
                    >
                      <Library size={16} className="text-[#E50914]" />
                      <span>My List</span>
                    </Link>

                    <Link
                      to="/community"
                      onClick={() => setIsProfileOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-200 hover:text-white hover:bg-white/10 rounded-xs transition-colors"
                    >
                      <MessageSquare size={16} className="text-cyan-400" />
                      <span>Fan Discussions</span>
                    </Link>

                    <button
                      onClick={() => {
                        signOut(auth);
                        setIsProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/15 rounded-xs transition-colors mt-1 cursor-pointer"
                    >
                      <LogOut size={16} />
                      <span>Sign Out of Yuva</span>
                    </button>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      {isProfileOpen && <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />}
    </header>
  );
}

function MobileTabBar() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home', icon: HomeIcon },
    { path: '/schedule', label: 'Schedule', icon: Calendar },
    { path: '/community', label: 'Community', icon: MessageSquare },
    { path: '/leaderboard', label: 'Rankings', icon: Trophy },
    { path: '/watchlist', label: 'My List', icon: Library },
  ];

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-30 bg-[#141414]/95 border border-white/15 backdrop-blur-xl rounded-md md:hidden py-2 px-3 flex justify-around items-center max-w-md mx-auto shadow-2xl">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xs text-[10px] font-bold transition-all ${
              isActive
                ? 'text-white bg-[#E50914] shadow-md shadow-red-600/30'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <item.icon size={16} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function NetflixFooter() {
  return (
    <footer className="mt-20 border-t border-white/10 pt-12 pb-16 text-neutral-500 text-xs max-w-6xl w-full mx-auto px-4 sm:px-6 space-y-6">
      <div className="flex items-center gap-2">
        <span className="font-black text-[#E50914] text-xl tracking-tighter">YUVA</span>
        <span className="text-neutral-400 font-bold">• Premier Anime Cinema</span>
      </div>
      <p className="text-neutral-400 font-medium">Questions? Contact the Yuva community or support team.</p>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-neutral-400">
        <div className="space-y-2">
          <Link to="/" className="block hover:underline hover:text-white transition-colors">Home</Link>
          <Link to="/schedule" className="block hover:underline hover:text-white transition-colors">Simulcast Schedule</Link>
          <Link to="/leaderboard" className="block hover:underline hover:text-white transition-colors">Top Rankings</Link>
        </div>
        <div className="space-y-2">
          <Link to="/community" className="block hover:underline hover:text-white transition-colors">Fan Discussions</Link>
          <Link to="/watchlist" className="block hover:underline hover:text-white transition-colors">My List</Link>
          <span className="block cursor-pointer hover:underline hover:text-white transition-colors">Subtitles & Audio</span>
        </div>
        <div className="space-y-2">
          <span className="block cursor-pointer hover:underline hover:text-white transition-colors">Media Center</span>
          <span className="block cursor-pointer hover:underline hover:text-white transition-colors">Terms of Service</span>
          <span className="block cursor-pointer hover:underline hover:text-white transition-colors">Privacy Policy</span>
        </div>
        <div className="space-y-2">
          <span className="block cursor-pointer hover:underline hover:text-white transition-colors">Speed Test</span>
          <span className="block cursor-pointer hover:underline hover:text-white transition-colors">Legal Notices</span>
          <span className="block cursor-pointer hover:underline hover:text-white transition-colors">Cookie Preferences</span>
        </div>
      </div>

      <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-neutral-500">
        <p>© 2025 Yuva, Inc. All rights reserved.</p>
        <p className="text-neutral-400">Powered exclusively by real user ratings & authentic broadcast streams.</p>
      </div>
    </footer>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Global Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#141414]">
        <div className="w-10 h-10 border-3 border-[#E50914] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-[#141414] text-neutral-100 flex flex-col relative overflow-x-hidden">
        {/* Subtle Ambient Backdrops */}
        <div className="fixed -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle_at_center,rgba(229,9,20,0.05)_0%,transparent_70%)] pointer-events-none -z-10" />
        <div className="fixed top-1/3 -right-40 w-[650px] h-[650px] rounded-full bg-[radial-gradient(circle_at_center,rgba(229,9,20,0.03)_0%,transparent_70%)] pointer-events-none -z-10" />

        <Header 
          user={user} 
          onAuthOpen={() => setIsAuthOpen(true)} 
          onOpenSearch={() => setIsSearchOpen(true)} 
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-20 pb-28 md:pb-12 relative z-0">
          <Routes>
            <Route path="/" element={<HomePage user={user} onAuthOpen={() => setIsAuthOpen(true)} />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/community" element={<CommunityPage user={user} onOpenAuth={() => setIsAuthOpen(true)} />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/anime/:id" element={<AnimeDetailsPage />} />
            <Route path="/watchlist" element={<WatchlistPage user={user} />} />
            <Route path="/watch/:id/:episode" element={<PlayerPage />} />
            <Route path="/search" element={<SearchPage />} />
          </Routes>
        </main>

        <NetflixFooter />
        <MobileTabBar />
        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
        <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      </div>
    </Router>
  );
}
