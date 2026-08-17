/**
 * RichPasteEngine.ts
 * Main orchestrator for the Rich Paste / Smart Clipboard Paste Engine.
 * Formats Priority: HTML > Markdown > Plain Text
 */

import type { BlockInstance } from '../types';
import { sanitizeHtmlString } from './HTMLSanitizer';
import { cleanOfficeHtml } from './WordCleaner';
import { parseHtmlToBlocks } from './HTMLParser';
import { parseMarkdownToBlocks } from './MarkdownParser';
import { makeBlocksResponsive } from './ResponsiveMapper';

export function parseRichPasteToBlocks(rawHtmlOrText: string): BlockInstance[] {
  if (!rawHtmlOrText || !rawHtmlOrText.trim()) return [];

  const trimmed = rawHtmlOrText.trim();
  const hasHtml = /<[a-z][\s\S]*>/i.test(trimmed);

  let blocks: BlockInstance[] = [];

  if (hasHtml) {
    try {
      // 1. Sanitize security vulnerabilities
      const sanitized = sanitizeHtmlString(trimmed);
      // 2. Clean MS Word / Google Docs / Office markup
      const cleaned = cleanOfficeHtml(sanitized);
      // 3. Parse HTML DOM to native blocks
      blocks = parseHtmlToBlocks(cleaned);
    } catch {
      // Fallback to markdown/plain parser if HTML parsing fails
      blocks = parseMarkdownToBlocks(trimmed);
    }
  } else {
    // 4. Parse Markdown / Plain Text
    blocks = parseMarkdownToBlocks(trimmed);
  }

  // 5. Ensure responsive rules (width 100%, max dimensions, typography rules)
  return makeBlocksResponsive(blocks);
}
