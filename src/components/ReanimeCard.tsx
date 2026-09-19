import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Star, Mic, Subtitles } from 'lucide-react';
import { ReanimeAnimeItem } from '../services/reanimeService';

interface ReanimeCardProps {
  anime: ReanimeAnimeItem;
  badgeText?: string;
  showEpisode?: boolean;
  key?: React.Key;
}

export default function ReanimeCard({ anime, badgeText, showEpisode = true }: ReanimeCardProps) {
  const title = typeof anime.title === 'string'
    ? anime.title
    : (anime.title?.english || anime.title?.romaji || anime.title?.user_preferred || 'Anime');

  const episodeNumber = anime.episode?.episode_number || (typeof anime.episodes === 'number' ? anime.episodes : null);
  const coverUrl = anime.cover_image || '';
  const score = anime.average_score ? (anime.average_score / 10).toFixed(1) : (anime.mal_score ? anime.mal_score.toFixed(1) : null);

  // Link to either direct watch episode if it has latest episode or details
  const watchLink = episodeNumber 
    ? `/watch/${anime.anime_id}/${episodeNumber}`
    : `/anime/${anime.anime_id}`;

  return (
    <div className="group relative rounded-xl overflow-hidden aspect-[2/3] bg-[#12131f] border border-white/[0.08] hover:border-red-500/50 transition-all duration-300 shadow-lg hover:shadow-red-500/10 flex flex-col">
      <Link to={watchLink} className="absolute inset-0 z-20">
        <span className="sr-only">Watch {title}</span>
      </Link>

      {/* Poster Image */}
      <img
        src={coverUrl}
        alt={title}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        referrerPolicy="no-referrer"
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#090a12] via-[#090a12]/50 to-transparent pointer-events-none z-10" />

      {/* ReAnime Badges on Top Left */}
      <div className="absolute top-2 left-2 z-20 flex flex-wrap gap-1 items-center">
        {showEpisode && episodeNumber && (
          <span className="px-1.5 py-0.5 rounded bg-red-600/90 text-white font-bold text-[10px] tracking-wide shadow-sm">
            EP {episodeNumber}
          </span>
        )}
        {badgeText && (
          <span className="px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md text-amber-300 font-semibold text-[9px] border border-white/10">
            {badgeText}
          </span>
        )}
      </div>

      {/* ReAnime Audio Badges on Top Right */}
      <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
        {Boolean(anime.subbed) && (
          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md text-[9px] font-medium text-white/90 border border-white/15" title="Subbed">
            <Subtitles size={10} className="text-cyan-400" />
            <span>SUB</span>
          </span>
        )}
        {Boolean(anime.dubbed) && (
          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md text-[9px] font-medium text-white/90 border border-white/15" title="Dubbed">
            <Mic size={10} className="text-amber-400" />
            <span>DUB</span>
          </span>
        )}
      </div>

      {/* Hover Play Button */}
      <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <div className="w-12 h-12 rounded-full bg-red-600/90 text-white shadow-xl shadow-red-600/40 flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform duration-200">
          <Play fill="currentColor" size={18} className="ml-0.5" />
        </div>
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-0 inset-x-0 p-3 z-20 space-y-1">
        <h3 className="text-white text-xs sm:text-sm font-semibold line-clamp-1 group-hover:text-red-400 transition-colors">
          {title}
        </h3>
        <div className="flex items-center justify-between text-[10px] text-neutral-400">
          <div className="flex items-center gap-1.5">
            <span className="uppercase text-neutral-300 font-medium">{anime.format || 'TV'}</span>
            {anime.status && (
              <>
                <span className="w-1 h-1 bg-white/30 rounded-full" />
                <span className="truncate">{anime.status}</span>
              </>
            )}
          </div>
          {score && (
            <div className="flex items-center gap-0.5 text-amber-400 font-bold">
              <Star size={10} fill="currentColor" />
              <span>{score}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
