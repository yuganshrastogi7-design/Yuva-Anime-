import { motion } from 'motion/react';

export function AnimeSpinner({ size = 'md', text }: { size?: 'sm' | 'md' | 'lg'; text?: string }) {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-16 h-16 border-4'
  }[size];

  return (
    <div className="flex flex-col items-center justify-center gap-3 p-6 select-none">
      <div className="relative flex items-center justify-center">
        {/* Outer glowing pulsing ring */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className={`absolute rounded-full bg-[#E50914]/20 blur-md ${sizeClasses}`}
        />
        {/* High speed spinning gradient rim */}
        <div
          className={`rounded-full border-neutral-700 border-t-[#E50914] border-r-[#E50914] animate-spin ${sizeClasses}`}
        />
      </div>
      {text && (
        <motion.p
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          className="text-xs font-bold text-neutral-400 tracking-wider uppercase"
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}

export function NetflixRowSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-3 py-4">
      {/* Title skeleton */}
      <div className="flex items-center gap-3 px-1">
        <div className="w-40 h-6 bg-white/10 rounded-xs animate-pulse" />
        <div className="w-16 h-4 bg-white/5 rounded-xs animate-pulse" />
      </div>

      {/* Cards row skeleton */}
      <div className="flex items-center gap-3 sm:gap-4 overflow-hidden px-1">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex-none w-32 sm:w-44 lg:w-48 aspect-[2/3] rounded-md bg-[#181818] border border-white/5 relative overflow-hidden"
          >
            {/* Shimmer sweep */}
            <motion.div
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear', delay: i * 0.1 }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
            />
            <div className="absolute bottom-0 inset-x-0 p-3 space-y-2">
              <div className="w-3/4 h-3 bg-white/10 rounded-xs" />
              <div className="w-1/2 h-2.5 bg-white/5 rounded-xs" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
