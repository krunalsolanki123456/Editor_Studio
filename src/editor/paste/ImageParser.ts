/**
 * ImageParser.ts
 * Extracts image metadata (src, data-src, lazy-loading, srcset, alt, title, dimensions, figcaption)
 * and generates responsive image block attributes.
 */

import { sanitizeUrl } from './HTMLSanitizer';

export interface ParsedImageData {
  url: string;
  alt: string;
  title?: string;
  caption?: string;
  width?: string | number;
  height?: string | number;
  align?: 'left' | 'center' | 'right';
  aspectRatio?: string;
}

export function parseImageElement(element: HTMLElement): ParsedImageData | null {
  let imgEl: HTMLImageElement | null = null;
  let captionText = '';

  if (element.tagName.toLowerCase() === 'img') {
    imgEl = element as HTMLImageElement;
  } else if (element.tagName.toLowerCase() === 'figure') {
    imgEl = element.querySelector('img');
    const figcaption = element.querySelector('figcaption');
    if (figcaption) {
      captionText = figcaption.textContent?.trim() || '';
    }
  } else if (element.tagName.toLowerCase() === 'picture') {
    imgEl = element.querySelector('img');
  }

  if (!imgEl) return null;

  // Detect image source URL (including lazy-loading data attributes)
  const src =
    imgEl.getAttribute('data-src') ||
    imgEl.getAttribute('data-original') ||
    imgEl.getAttribute('data-lazy-src') ||
    imgEl.getAttribute('src');

  const cleanUrl = sanitizeUrl(src);
  if (!cleanUrl || cleanUrl.startsWith('data:image/svg')) return null;

  const alt = imgEl.getAttribute('alt') || '';
  const title = imgEl.getAttribute('title') || undefined;
  const widthAttr = imgEl.getAttribute('width');
  const heightAttr = imgEl.getAttribute('height');

  const alignStyle = element.style.textAlign || imgEl.style.textAlign;
  let align: ParsedImageData['align'] = 'center';
  if (['left', 'center', 'right'].includes(alignStyle.toLowerCase())) {
    align = alignStyle.toLowerCase() as ParsedImageData['align'];
  }

  return {
    url: cleanUrl,
    alt,
    title,
    caption: captionText || undefined,
    width: widthAttr || '100%',
    height: heightAttr || 'auto',
    align,
  };
}
