import { useEffect, useRef, useState } from 'react';
import { Youtube } from 'lucide-react';
import { useEditorStore } from '../store';
import {
  extractYouTubeId,
  extractVimeoId,
  isTwitterUrl,
  normalizeTwitterUrl,
  isInstagramUrl,
  normalizeInstagramUrl,
  isSpotifyUrl,
  normalizeSpotifyUrl,
} from '../exporter';
import type { BlockInstance } from '../types';
import {
  MediaPanel,
  mediaInputClassName,
  mediaPrimaryButtonClassName,
  mediaSecondaryButtonClassName,
} from './MediaUi';

interface BlockProps {
  block: BlockInstance;
  selected: boolean;
}

function extractIframeSrc(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const srcMatch = trimmed.match(/<iframe[^>]*\ssrc=["']([^"']+)["'][^>]*>/i);
  if (srcMatch?.[1]) return srcMatch[1];
  const dataSrcMatch = trimmed.match(/<iframe[^>]*\sdata-src=["']([^"']+)["'][^>]*>/i);
  if (dataSrcMatch?.[1]) return dataSrcMatch[1];
  return trimmed;
}

function EmbedInput({
  onUrl, label, icon, multiline = false, placeholder = 'Paste URL…',
}: {
  onUrl: (url: string) => void;
  label: string;
  icon: React.ReactNode;
  multiline?: boolean;
  placeholder?: string;
}) {
  const [url, setUrl] = useState('');
  const helperText = multiline
    ? 'Paste an iframe embed code or a direct embeddable URL.'
    : 'Paste the URL and click Embed to render the content below.';

  const handleSubmit = () => {
    const value = url.trim();
    if (!value) return;
    onUrl(value);
  };

  return (
    <MediaPanel
      icon={icon}
      title={label}
      description={helperText}
    >
      <div className="flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
        <span className="rounded-full bg-white px-2.5 py-1 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
          Embed code
        </span>
        <span className="rounded-full bg-white px-2.5 py-1 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
          URL
        </span>
        <span className="rounded-full bg-white px-2.5 py-1 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
          Responsive
        </span>
      </div>

      {multiline ? (
        <textarea
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={placeholder}
          rows={5}
          className="w-full resize-y rounded-2xl border border-gray-300 bg-white px-4 py-3 font-mono text-sm leading-6 text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
        />
      ) : (
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={placeholder}
          className={mediaInputClassName}
        />
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={handleSubmit}
          className={mediaPrimaryButtonClassName}
          disabled={!url.trim()}
        >
          Embed
        </button>
        <button
          onClick={() => setUrl('')}
          className={mediaSecondaryButtonClassName}
          disabled={!url}
        >
          Clear
        </button>
      </div>

      <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
        Paste a full iframe snippet if your provider gives one, or a share link if the platform supports direct embedding.
      </p>
    </MediaPanel>
  );
}

declare global {
  interface Window {
    twttr?: {
      widgets?: {
        load: (el?: HTMLElement | Document | null) => void;
      };
    };
    instgrm?: {
      Embeds?: {
        process: (el?: HTMLElement | Document | null) => void;
      };
    };
  }
}

let twitterWidgetsPromise: Promise<void> | null = null;

function ensureTwitterWidgets(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.twttr?.widgets) return Promise.resolve();
  if (!twitterWidgetsPromise) {
    twitterWidgetsPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-twitter-widgets="true"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Failed to load Twitter widgets')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://platform.twitter.com/widgets.js';
      script.charset = 'utf-8';
      script.dataset.twitterWidgets = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Twitter widgets'));
      document.head.appendChild(script);
    });
  }
  return twitterWidgetsPromise;
}

let instagramWidgetsPromise: Promise<void> | null = null;

export function ensureInstagramWidgets(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.instgrm?.Embeds) return Promise.resolve();
  if (!instagramWidgetsPromise) {
    instagramWidgetsPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-instagram-widgets="true"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Failed to load Instagram widgets')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.instagram.com/embed.js';
      script.charset = 'utf-8';
      script.dataset.instagramWidgets = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Instagram widgets'));
      document.head.appendChild(script);
    });
  }
  return instagramWidgetsPromise;
}

export function TwitterEmbed({ url, align = 'center' }: { url: string; align?: 'left' | 'center' | 'right' }) {
  const ref = useRef<HTMLDivElement>(null);
  const normalizedUrl = normalizeTwitterUrl(url);
  const tweetIdMatch = normalizedUrl.match(/status\/(\d+)/i);
  const tweetId = tweetIdMatch ? tweetIdMatch[1] : null;

  useEffect(() => {
    let active = true;
    if (!ref.current) return;

    ref.current.innerHTML = '<div class="text-xs text-gray-400 py-6 text-center animate-pulse">Loading post...</div>';

    ensureTwitterWidgets()
      .then(() => {
        if (!active || !ref.current) return;
        ref.current.innerHTML = '';
        const widgets = (window as any).twttr?.widgets;
        if (tweetId && widgets?.createTweet) {
          widgets.createTweet(tweetId, ref.current, {
            theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
            align: align || 'center',
            dnt: true,
          });
        } else if (widgets?.load) {
          const bq = document.createElement('blockquote');
          bq.className = 'twitter-tweet';
          bq.setAttribute('data-align', align || 'center');
          const a = document.createElement('a');
          a.href = normalizedUrl;
          bq.appendChild(a);
          ref.current.appendChild(bq);
          (window as any).twttr?.widgets?.load(ref.current);
        }
      })
      .catch(() => {
        if (!active || !ref.current) return;
        ref.current.innerHTML = `<blockquote class="twitter-tweet p-4 text-sm text-gray-600"><a href="${normalizedUrl}" target="_blank" rel="noopener noreferrer">View Post on X</a></blockquote>`;
      });

    return () => {
      active = false;
    };
  }, [normalizedUrl, tweetId, align]);

  const justifyClass = align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center';

  return (
    <div
      ref={ref}
      className={`twitter-embed w-full min-h-[140px] flex items-center ${justifyClass} overflow-hidden rounded-2xl bg-transparent`}
    />
  );
}

export function InstagramEmbed({ url, align = 'center' }: { url: string; align?: 'left' | 'center' | 'right' }) {
  const embedUrl = normalizeInstagramUrl(url);
  const [frameHeight, setFrameHeight] = useState<number>(680);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.type === 'MEASURE' && typeof data?.details?.height === 'number') {
          setFrameHeight(Math.max(450, data.details.height));
        } else if (data?.height && typeof data.height === 'number') {
          setFrameHeight(Math.max(450, data.height));
        }
      } catch {
        // ignore JSON parse error
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const flexAlignClass =
    align === 'left'
      ? 'justify-start'
      : align === 'right'
        ? 'justify-end'
        : 'justify-center';

  return (
    <div className={`instagram-embed w-full flex ${flexAlignClass}`}>
      <div
        style={{ height: `${frameHeight}px` }}
        className="w-full max-w-[540px] rounded-2xl overflow-hidden shadow-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-all duration-200"
      >
        <iframe
          src={embedUrl}
          className="w-full h-full border-0 overflow-hidden"
          style={{ border: 0, overflow: 'hidden' }}
          allowTransparency
          allowFullScreen
          scrolling="no"
          title="Instagram Post"
        />
      </div>
    </div>
  );
}

export function YouTubeBlock({ block }: BlockProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const a = block.attributes;
  const id = extractYouTubeId(a.url as string);

  if (!id) {
    return <EmbedInput label="Paste a YouTube URL" icon={<Youtube size={32} className="text-red-500" />}
      onUrl={(url) => updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, url } }))} />;
  }

  return (
    <figure className="be-youtube">
      <div className="relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-black shadow-sm dark:border-gray-700" style={{ aspectRatio: '16/9', minHeight: '240px' }}>
        <iframe src={`https://www.youtube.com/embed/${id}`} allowFullScreen className="absolute inset-0 w-full h-full rounded-lg border-0" />
      </div>
    </figure>
  );
}

export function VimeoBlock({ block }: BlockProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const a = block.attributes;
  const id = extractVimeoId(a.url as string);

  const vimeoIcon = (
    <svg className="w-6 h-6 text-blue-500 fill-current" viewBox="0 0 24 24">
      <path d="M22.396 7.164c-.093 2.026-1.507 4.8-4.245 8.32-2.827 3.652-5.215 5.48-7.16 5.48-1.204 0-2.22-.112-3.05-.335-1.127-.417-1.92-1.228-2.38-2.433-.647-2.38-.97-4.63-.97-6.75 0-2.316.48-4.14 1.442-5.474.962-1.334 2.217-2.001 3.766-2.001 1.25 0 2.292.486 3.125 1.458.833.972 1.25 2.153 1.25 3.542 0 1.018-.208 2.06-.625 3.125-.417 1.065-.625 1.736-.625 2.014 0 .555.254.833.764.833.648 0 1.481-.555 2.5-1.666 1.018-1.111 1.574-2.268 1.666-3.472.185-2.037-.625-3.055-2.43-3.055-.417 0-.903.07-1.458.208 1.203-3.935 3.38-5.903 6.527-5.903 1.574 0 2.755.44 3.542 1.32.787.88 1.111 1.967.972 3.26z" />
    </svg>
  );

  if (!id) {
    return <EmbedInput label="Paste a Vimeo URL" icon={vimeoIcon}
      onUrl={(url) => updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, url } }))} />;
  }

  return (
    <figure className="be-vimeo">
      <div className="relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-black shadow-sm dark:border-gray-700" style={{ aspectRatio: '16/9', minHeight: '240px' }}>
        <iframe src={`https://player.vimeo.com/video/${id}`} allowFullScreen className="absolute inset-0 w-full h-full rounded-lg border-0" />
      </div>
    </figure>
  );
}

export function EmbedBlock({ block }: BlockProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const a = block.attributes;
  const url = a.url as string;
  const embedSrc = extractIframeSrc(url);

  const align = (a.align as 'left' | 'center' | 'right') || 'center';

  const alignContainerClass =
    align === 'left'
      ? 'flex justify-start'
      : align === 'right'
        ? 'flex justify-end'
        : 'flex justify-center';

  if (!url) {
    return <EmbedInput label="Paste embed code or URL (Instagram, Twitter, YouTube, Spotify, etc.)" icon={<div className="text-2xl">🔗</div>} multiline
      placeholder="Paste Instagram post/reel link, YouTube link, Twitter/X link, or iframe embed code…"
      onUrl={(u) => updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, url: u } }))} />;
  }

  if (isTwitterUrl(url)) {
    return (
      <figure className={`be-embed my-3 w-full ${alignContainerClass}`}>
        <div className="w-full max-w-[550px]">
          <TwitterEmbed url={url} />
        </div>
      </figure>
    );
  }

  if (isInstagramUrl(url)) {
    return (
      <figure className={`be-embed my-3 w-full ${alignContainerClass}`}>
        <InstagramEmbed url={url} align={align} />
      </figure>
    );
  }

  if (isSpotifyUrl(url)) {
    const spotifySrc = normalizeSpotifyUrl(url);
    return (
      <figure className={`be-embed my-3 w-full ${alignContainerClass}`}>
        <div className="w-full max-w-[600px] rounded-2xl overflow-hidden shadow-sm">
          <iframe
            src={spotifySrc}
            width="100%"
            height="152"
            style={{ border: 0 }}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        </div>
      </figure>
    );
  }

  return (
    <figure className={`be-embed my-3 w-full ${alignContainerClass}`}>
      <div className="relative w-full max-w-[720px] overflow-hidden rounded-2xl border border-gray-200 bg-black shadow-sm dark:border-gray-700 min-h-[300px]">
        <iframe
          src={embedSrc}
          className="w-full h-[400px] border-0"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
          allowFullScreen
        />
      </div>
    </figure>
  );
}
