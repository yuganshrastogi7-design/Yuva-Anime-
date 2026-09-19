import React, { useState } from 'react';
import { 
  auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  updateProfile,
  signInWithGoogle
} from '../firebase';
import { X, Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = 'login' | 'signup' | 'forgot';

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        onClose();
      } else if (mode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });
        onClose();
      } else {
        await sendPasswordResetEmail(auth, email);
        setMessage('Password reset instructions sent to your email.');
      }
    } catch (err: any) {
      let msg = err.message || 'An error occurred during authentication.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        msg = 'Incorrect email or password. Please try again or reset your password.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Try signing in instead.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters long.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Google sign-in was cancelled or failed.');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
        {/* Cinematic Netflix Vignette Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Netflix Card Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-[450px] bg-[#000000]/95 border border-white/10 rounded-md p-8 sm:p-12 shadow-2xl z-10 my-8"
        >
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          {/* Brand & Heading */}
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black text-[#E50914] tracking-tight">YUVA</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-xs bg-white/10 text-neutral-300 font-bold tracking-wider uppercase">
                  MEMBER
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Sign Up' : 'Forgot Password'}
              </h2>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div className="p-3 bg-[#e87c03]/20 border border-[#e87c03] rounded-xs text-[#e87c03] text-xs font-medium flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message Alert */}
            {message && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xs text-emerald-300 text-xs font-medium flex items-start gap-2">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                <span>{message}</span>
              </div>
            )}

            {/* Main Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div className="relative">
                  <input
                    required
                    type="text"
                    placeholder="Full Name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-[#161616] border border-neutral-700/80 focus:border-white focus:bg-[#222222] text-white rounded-xs px-4 py-3.5 text-sm placeholder-neutral-500 transition-colors outline-none font-medium"
                  />
                </div>
              )}

              <div className="relative">
                <input
                  required
                  type="email"
                  placeholder="Email or phone number"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#161616] border border-neutral-700/80 focus:border-white focus:bg-[#222222] text-white rounded-xs px-4 py-3.5 text-sm placeholder-neutral-500 transition-colors outline-none font-medium"
                />
              </div>

              {mode !== 'forgot' && (
                <div className="relative">
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#161616] border border-neutral-700/80 focus:border-white focus:bg-[#222222] text-white rounded-xs px-4 py-3.5 pr-11 text-sm placeholder-neutral-500 transition-colors outline-none font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              )}

              {/* Netflix Signature Red Primary Button */}
              <button
                disabled={loading}
                type="submit"
                className="w-full bg-[#E50914] hover:bg-[#c11119] text-white font-bold py-3.5 rounded-xs transition-all text-sm tracking-wide shadow-lg shadow-red-950/40 disabled:opacity-50 cursor-pointer active:scale-[0.99] flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>
                    {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Sign Up' : 'Send Reset Link'}
                  </span>
                )}
              </button>

              {/* Remember Me & Help Links */}
              {mode === 'login' && (
                <div className="flex items-center justify-between text-xs text-neutral-400 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded-xs accent-[#E50914] cursor-pointer bg-neutral-800 border-neutral-600"
                    />
                    <span>Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-neutral-400 hover:text-white hover:underline transition-colors cursor-pointer"
                  >
                    Need help?
                  </button>
                </div>
              )}
            </form>

            {/* OR Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-800" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#000000] px-3 text-neutral-500 font-bold uppercase tracking-wider">
                  OR
                </span>
              </div>
            </div>

            {/* Google Sign In Option */}
            <button
              onClick={handleGoogleSignIn}
              className="w-full bg-white/10 hover:bg-white/15 text-white font-semibold py-3 rounded-xs transition-colors text-xs sm:text-sm flex items-center justify-center gap-2.5 border border-white/10 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.1 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.2-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.1-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Mode Switcher */}
            <div className="pt-3 text-sm text-neutral-400 space-y-3">
              {mode === 'login' ? (
                <p>
                  New to Yuva?{' '}
                  <button
                    onClick={() => setMode('signup')}
                    className="text-white font-bold hover:underline cursor-pointer ml-1"
                  >
                    Sign up now.
                  </button>
                </p>
              ) : (
                <p>
                  Already registered?{' '}
                  <button
                    onClick={() => setMode('login')}
                    className="text-white font-bold hover:underline cursor-pointer ml-1"
                  >
                    Sign in now.
                  </button>
                </p>
              )}

              {/* Netflix Microcopy */}
              <p className="text-[11px] text-neutral-500 leading-relaxed pt-2 border-t border-neutral-900">
                This page is protected by Google reCAPTCHA to ensure you're not a bot. Learn more.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
