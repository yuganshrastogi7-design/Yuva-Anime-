import type React from 'react';

/**
 * Robust image resolver for Anime items across Anilist, ReAnime, Jikan (MAL), and custom sources.
 * Prevents [object Object] serialization and handles broken URLs gracefully.
 */

export const ANIME_FALLBACK_POSTER = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80';
export const ANIME_FALLBACK_BANNER = 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop&q=80';

export function getAnimeImageUrl(item: any): string {
  if (!item) return ANIME_FALLBACK_POSTER;

  // 1. Check cover_image
  if (typeof item.cover_image === 'string' && item.cover_image.trim().length > 5 && !item.cover_image.includes('[object')) {
    return item.cover_image.trim();
  }
  if (typeof item.cover_image === 'object' && item.cover_image !== null) {
    const ci = item.cover_image;
    const url = ci.extra_large || ci.large || ci.medium || ci.url;
    if (typeof url === 'string' && url.trim().length > 5 && !url.includes('[object')) {
      return url.trim();
    }
  }

  // 2. Check banner_image
  if (typeof item.banner_image === 'string' && item.banner_image.trim().length > 5 && !item.banner_image.includes('[object')) {
    return item.banner_image.trim();
  }
  if (typeof item.banner_image === 'object' && item.banner_image !== null) {
    const bi = item.banner_image;
    const url = bi.extra_large || bi.large || bi.medium || bi.url;
    if (typeof url === 'string' && url.trim().length > 5 && !url.includes('[object')) {
      return url.trim();
    }
  }

  // 3. Check Jikan / MAL nested images structure
  const jikanLarge = item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url;
  if (typeof jikanLarge === 'string' && jikanLarge.trim().length > 5) {
    return jikanLarge.trim();
  }

  const jikanNormal = item.images?.webp?.image_url || item.images?.jpg?.image_url;
  if (typeof jikanNormal === 'string' && jikanNormal.trim().length > 5) {
    return jikanNormal.trim();
  }

  // 4. Check image / poster field
  if (typeof item.image === 'string' && item.image.trim().length > 5 && !item.image.includes('[object')) {
    return item.image.trim();
  }

  if (typeof item.poster === 'string' && item.poster.trim().length > 5 && !item.poster.includes('[object')) {
    return item.poster.trim();
  }

  return ANIME_FALLBACK_POSTER;
}

export function getAnimeBannerUrl(item: any): string {
  if (!item) return ANIME_FALLBACK_BANNER;

  // 1. Check banner_image
  if (typeof item.banner_image === 'string' && item.banner_image.trim().length > 5 && !item.banner_image.includes('[object')) {
    return item.banner_image.trim();
  }
  if (typeof item.banner_image === 'object' && item.banner_image !== null) {
    const bi = item.banner_image;
    const url = bi.extra_large || bi.large || bi.medium || bi.url;
    if (typeof url === 'string' && url.trim().length > 5 && !url.includes('[object')) {
      return url.trim();
    }
  }

  // 2. Fall back to cover image if no banner
  const cover = getAnimeImageUrl(item);
  if (cover && cover !== ANIME_FALLBACK_POSTER) {
    return cover;
  }

  return ANIME_FALLBACK_BANNER;
}

export function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>, isBanner = false) {
  const target = e.currentTarget;
  const fallback = isBanner ? ANIME_FALLBACK_BANNER : ANIME_FALLBACK_POSTER;
  if (target.src !== fallback) {
    target.src = fallback;
  }
}
