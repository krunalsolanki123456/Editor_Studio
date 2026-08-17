/**
 * EmbedDetector.ts
 * Detects iframe src, video, audio, and media URLs (YouTube, Vimeo, Spotify, Twitter,
 * Instagram, Facebook, Maps) and maps them into native Embed, Video, or Audio blocks.
 */

import { sanitizeUrl } from './HTMLSanitizer';

export interface EmbedMatch {
  type: 'embed' | 'video' | 'audio';
  provider: string;
  url: string;
}

export function detectMediaEmbed(src: string): EmbedMatch | null {
  const url = sanitizeUrl(src);
  if (!url) return null;

  const lower = url.toLowerCase();

  if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
    return { type: 'embed', provider: 'youtube', url };
  }
  if (lower.includes('vimeo.com')) {
    return { type: 'embed', provider: 'vimeo', url };
  }
  if (lower.includes('spotify.com')) {
    return { type: 'embed', provider: 'spotify', url };
  }
  if (lower.includes('twitter.com') || lower.includes('x.com')) {
    return { type: 'embed', provider: 'twitter', url };
  }
  if (lower.includes('instagram.com')) {
    return { type: 'embed', provider: 'instagram', url };
  }
  if (lower.includes('facebook.com')) {
    return { type: 'embed', provider: 'facebook', url };
  }
  if (lower.includes('google.com/maps') || lower.includes('maps.google.com')) {
    return { type: 'embed', provider: 'maps', url };
  }

  if (/\.(mp4|webm|ogg|mov)(\?\S*)?$/i.test(url)) {
    return { type: 'video', provider: 'video', url };
  }
  if (/\.(mp3|wav|aac|m4a)(\?\S*)?$/i.test(url)) {
    return { type: 'audio', provider: 'audio', url };
  }

  if (lower.includes('/embed')) {
    return { type: 'embed', provider: 'other', url };
  }

  return null;
}
