import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  ThumbsUp, 
  Plus, 
  Send, 
  Sparkles, 
  X,
  User as UserIcon,
  MessageCircle,
  Share2
} from 'lucide-react';
import { User } from 'firebase/auth';
import { 
  db, 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  onSnapshot, 
  arrayUnion, 
  arrayRemove 
} from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { AnimeSpinner } from '../components/AnimeLoader';

interface RealPost {
  id: string;
  title: string;
  content: string;
  category: string;
  userId: string;
  authorName: string;
  authorAvatar: string;
  votes: number;
  upvotedBy?: string[];
  commentsCount: number;
  createdAt: any;
}

interface PostComment {
  id: string;
  text: string;
  userId: string;
  authorName: string;
  authorAvatar: string;
  createdAt: any;
}

interface CommunityPageProps {
  user: User | null;
  onOpenAuth?: () => void;
}

const CATEGORIES = [
  'All',
  'General',
  'Episode Chat',
  'Theories & Lore',
  'Recommendations',
  'Reviews',
  'News & Announcements'
];

export default function CommunityPage({ user, onOpenAuth }: CommunityPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [posts, setPosts] = useState<RealPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activePost, setActivePost] = useState<RealPost | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Form State for creating a new post
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newContent, setNewContent] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);

  // Real-time Firestore sync for community posts (ONLY REAL USERS)
  useEffect(() => {
    setLoading(true);
    const postsRef = collection(db, 'community_posts');
    const q = query(postsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: RealPost[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            title: data.title || '',
            content: data.content || '',
            category: data.category || 'General',
            userId: data.userId || '',
            authorName: data.authorName || 'Anime Fan',
            authorAvatar: data.authorAvatar || '',
            votes: data.votes || 0,
            upvotedBy: data.upvotedBy || [],
            commentsCount: data.commentsCount || 0,
            createdAt: data.createdAt
          };
        });
        setPosts(loaded);
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to community posts:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Listen to comments of active post
  useEffect(() => {
    if (!activePost) {
      setComments([]);
      return;
    }

    setLoadingComments(true);
    const commentsRef = collection(db, 'community_posts', activePost.id, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedComments: PostComment[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            text: data.text || '',
            userId: data.userId || '',
            authorName: data.authorName || 'Anime Fan',
            authorAvatar: data.authorAvatar || '',
            createdAt: data.createdAt
          };
        });
        setComments(loadedComments);
        setLoadingComments(false);
      },
      (err) => {
        console.error('Error fetching comments:', err);
        setLoadingComments(false);
      }
    );

    return () => unsubscribe();
  }, [activePost]);

  // Real-time upvoting in Firestore
  const handleToggleVote = async (post: RealPost, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    const postRef = doc(db, 'community_posts', post.id);
    const isUpvoted = post.upvotedBy?.includes(user.uid);

    try {
      if (isUpvoted) {
        await updateDoc(postRef, {
          votes: Math.max(0, post.votes - 1),
          upvotedBy: arrayRemove(user.uid)
        });
      } else {
        await updateDoc(postRef, {
          votes: post.votes + 1,
          upvotedBy: arrayUnion(user.uid)
        });
      }
    } catch (err) {
      console.error('Error toggling upvote:', err);
    }
  };

  // Submit real new discussion
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    if (!user) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    setSubmittingPost(true);
    try {
      await addDoc(collection(db, 'community_posts'), {
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
        userId: user.uid,
        authorName: user.displayName || 'Anime Fan',
        authorAvatar: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
        votes: 1,
        upvotedBy: [user.uid],
        commentsCount: 0,
        createdAt: serverTimestamp()
      });

      setNewTitle('');
      setNewContent('');
      setNewCategory('General');
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error('Error creating discussion:', err);
    } finally {
      setSubmittingPost(false);
    }
  };

  // Submit real comment in discussion
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !activePost) return;

    if (!user) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    setSubmittingComment(true);
    try {
      const commentsRef = collection(db, 'community_posts', activePost.id, 'comments');
      await addDoc(commentsRef, {
        text: newCommentText.trim(),
        userId: user.uid,
        authorName: user.displayName || 'Anime Fan',
        authorAvatar: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
        createdAt: serverTimestamp()
      });

      // Increment comment count on the post
      const postRef = doc(db, 'community_posts', activePost.id);
      await updateDoc(postRef, {
        commentsCount: (activePost.commentsCount || 0) + 1
      });

      setNewCommentText('');
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const filteredPosts = posts.filter((p) => {
    if (selectedCategory === 'All') return true;
    return p.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  return (
    <div className="space-y-8 pb-16 max-w-6xl mx-auto select-none">
      {/* Community Header Banner */}
      <div className="relative rounded-lg overflow-hidden bg-[#181818] border border-white/10 p-6 sm:p-8 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-[#E50914]/20 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-xs bg-[#E50914] text-[10px] font-black tracking-wider uppercase text-white">
                YUVA COMMUNITY
              </span>
              <span className="text-xs text-neutral-400 font-medium">Real Fans Only • 100% Live</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              Anime Fan Discussions & Live Chat
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-xl">
              Discuss current simulcast episodes, share theories, recommend hidden gems, and chat directly with other anime fans.
            </p>
          </div>

          <button
            onClick={() => {
              if (!user) {
                if (onOpenAuth) onOpenAuth();
              } else {
                setIsCreateModalOpen(true);
              }
            }}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-[#E50914] hover:bg-[#c11119] text-white font-bold text-xs sm:text-sm shadow-lg shadow-red-950/40 transition-all transform hover:scale-105 active:scale-95 shrink-0 cursor-pointer"
          >
            <Plus size={16} />
            <span>Start New Discussion</span>
          </button>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex-none px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white text-black shadow-md'
                  : 'bg-[#181818] text-neutral-400 hover:text-white border border-white/10 hover:border-white/25'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Posts Feed or Clean Empty State */}
      {loading ? (
        <div className="py-20">
          <AnimeSpinner text="Loading Live Discussions..." />
        </div>
      ) : filteredPosts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-[#181818]/80 border border-white/10 p-12 text-center space-y-4 shadow-xl"
        >
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[#E50914]">
            <MessageSquare size={28} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">No discussions yet</h3>
            <p className="text-xs text-neutral-400 max-w-md mx-auto">
              {selectedCategory === 'All'
                ? 'Be the first real anime fan to start a topic or chat with the Yuva community!'
                : `No posts in "${selectedCategory}" yet. Be the first to start a conversation!`}
            </p>
          </div>
          <button
            onClick={() => {
              if (!user) {
                if (onOpenAuth) onOpenAuth();
              } else {
                setIsCreateModalOpen(true);
              }
            }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-[#E50914] text-white text-xs font-bold hover:bg-[#c11119] transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>Create First Post</span>
          </button>
        </motion.div>
      ) : (
        <div className="space-y-3.5">
          {filteredPosts.map((post) => {
            const isLiked = Boolean(user && post.upvotedBy?.includes(user.uid));
            return (
              <motion.div
                key={post.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setActivePost(post)}
                className="p-4 sm:p-5 rounded-md bg-[#181818] border border-white/10 hover:border-white/25 hover:bg-[#202020] transition-all cursor-pointer space-y-3 shadow-md group"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={post.authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.userId}`}
                      alt={post.authorName}
                      className="w-7 h-7 rounded-full object-cover bg-neutral-800 border border-white/10"
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-xs font-bold text-white">{post.authorName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-xs bg-white/10 text-neutral-300 font-bold uppercase">
                      {post.category}
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-500">Live discussion</span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-[#E50914] transition-colors leading-snug">
                    {post.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-300 line-clamp-3 leading-relaxed font-normal">
                    {post.content}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-xs text-neutral-400">
                  <div className="flex items-center gap-4">
                    {/* Upvote button */}
                    <button
                      onClick={(e) => handleToggleVote(post, e)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xs transition-colors cursor-pointer ${
                        isLiked 
                          ? 'bg-[#E50914]/20 text-[#E50914] font-bold' 
                          : 'hover:bg-white/10 text-neutral-300'
                      }`}
                    >
                      <ThumbsUp size={13} fill={isLiked ? 'currentColor' : 'none'} />
                      <span>{post.votes}</span>
                    </button>

                    {/* Comments button */}
                    <div className="flex items-center gap-1.5 text-neutral-300">
                      <MessageCircle size={14} />
                      <span>{post.commentsCount || 0} comments</span>
                    </div>
                  </div>

                  <span className="text-[11px] text-[#E50914] font-bold group-hover:underline">
                    View Thread & Reply →
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Discussion Detail & Live Chat Modal */}
      <AnimatePresence>
        {activePost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-[#181818] border border-white/15 rounded-lg overflow-hidden shadow-2xl flex flex-col max-h-[88vh]"
            >
              {/* Modal Topbar */}
              <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-xs bg-[#E50914] text-white font-black uppercase">
                    {activePost.category}
                  </span>
                  <span className="text-xs text-neutral-400 font-bold">By {activePost.authorName}</span>
                </div>
                <button
                  onClick={() => setActivePost(null)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Content Scroll Area */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
                <div className="space-y-3 pb-4 border-b border-white/10">
                  <h2 className="text-xl sm:text-2xl font-black text-white leading-snug">
                    {activePost.title}
                  </h2>
                  <p className="text-sm text-neutral-200 whitespace-pre-line leading-relaxed">
                    {activePost.content}
                  </p>
                </div>

                {/* Comments / Replies Section */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                    <MessageCircle size={14} className="text-[#E50914]" />
                    <span>Real Fan Replies ({comments.length})</span>
                  </h4>

                  {loadingComments ? (
                    <div className="py-6">
                      <AnimeSpinner size="sm" text="Loading replies..." />
                    </div>
                  ) : comments.length === 0 ? (
                    <p className="text-xs text-neutral-500 italic py-2">
                      No replies yet. Be the first to share your thoughts on this topic!
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="p-3 rounded-md bg-white/[0.04] border border-white/5 space-y-1.5"
                        >
                          <div className="flex items-center gap-2">
                            <img
                              src={comment.authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.userId}`}
                              alt={comment.authorName}
                              className="w-5 h-5 rounded-full object-cover bg-neutral-800"
                              referrerPolicy="no-referrer"
                            />
                            <span className="text-xs font-bold text-white">{comment.authorName}</span>
                          </div>
                          <p className="text-xs text-neutral-300 leading-relaxed pl-7">
                            {comment.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Reply Input Form */}
              <form onSubmit={handleSendComment} className="p-4 bg-black/60 border-t border-white/10 flex gap-2">
                <input
                  type="text"
                  placeholder={user ? "Write a reply to the community..." : "Sign in to post a reply..."}
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  disabled={submittingComment || !user}
                  className="flex-1 px-3.5 py-2 rounded-md bg-[#222222] border border-white/10 text-white placeholder-neutral-500 text-xs focus:outline-hidden focus:border-[#E50914] disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={submittingComment || !newCommentText.trim() || !user}
                  onClick={(e) => {
                    if (!user) {
                      e.preventDefault();
                      if (onOpenAuth) onOpenAuth();
                    }
                  }}
                  className="px-4 py-2 rounded-md bg-[#E50914] hover:bg-[#c11119] text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Send size={13} />
                  <span>Reply</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Start New Discussion Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl bg-[#181818] border border-white/15 rounded-lg overflow-hidden shadow-2xl"
            >
              <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-2">
                  <MessageSquare size={18} className="text-[#E50914]" />
                  <h2 className="text-base sm:text-lg font-bold text-white">Start New Discussion</h2>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreatePost} className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-300">Discussion Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Solo Leveling Ep 12 ending theory discussion..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-md bg-[#222222] border border-white/10 text-white placeholder-neutral-500 text-xs focus:outline-hidden focus:border-[#E50914]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-300">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-md bg-[#222222] border border-white/10 text-white text-xs focus:outline-hidden focus:border-[#E50914]"
                  >
                    {CATEGORIES.filter(c => c !== 'All').map(cat => (
                      <option key={cat} value={cat} className="bg-[#222222] text-white">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-300">Content</label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Share your thoughts, questions, or analysis with fellow fans..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-md bg-[#222222] border border-white/10 text-white placeholder-neutral-500 text-xs focus:outline-hidden focus:border-[#E50914] resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-md bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPost}
                    className="px-5 py-2 rounded-md bg-[#E50914] hover:bg-[#c11119] text-white text-xs font-bold disabled:opacity-50 transition-colors shadow-md shadow-red-950/30 cursor-pointer"
                  >
                    {submittingPost ? 'Publishing...' : 'Publish Discussion'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
