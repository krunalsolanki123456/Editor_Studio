/**
 * HTMLSanitizer.ts
 * Sanitizes pasted HTML content by removing scripts, event handlers, tracking pixels,
 * dangerous tags, and malicious javascript: URIs.
 */

export function sanitizeHtmlString(html: string): string {
  if (!html || !html.trim()) return '';

  // Remove script tags and their contents
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove style tags if they contain external fonts or tracking
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove link tags
  clean = clean.replace(/<link\b[^>]*\/?>/gi, '');

  // Remove meta tags
  clean = clean.replace(/<meta\b[^>]*\/?>/gi, '');

  // Remove inline event handlers (e.g., onclick="...", onload="...")
  clean = clean.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // Remove javascript: links
  clean = clean.replace(/href\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, 'href="#"');
  clean = clean.replace(/src\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '');

  // Remove tracking 1x1 pixels
  clean = clean.replace(/<img[^>]*width=["']1["'][^>]*height=["']1["'][^>]*\/?>/gi, '');

  return clean;
}

export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.toLowerCase().startsWith('javascript:')) return '';
  if (trimmed.toLowerCase().startsWith('data:text/html')) return '';
  return trimmed;
}
