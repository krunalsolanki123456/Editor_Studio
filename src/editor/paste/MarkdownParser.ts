/**
 * MarkdownParser.ts
 * Fallback parser when plain Markdown text is pasted.
 * Converts headings (#..######), bullet/numbered lists, quotes (>), code blocks (```), hr (---), and paragraphs.
 */

import { createId } from '../utils';
import type { BlockInstance, RichTextValue } from '../types';

export function parseInlineFormatting(str: string): RichTextValue {
  if (!str) return [];
  const spans: RichTextValue = [];
  const regex = /(\*\*|__)(.*?)\1|(\*|_)(.*?)\3/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIndex) {
      spans.push({ text: str.substring(lastIndex, match.index) });
    }
    if (match[2]) {
      spans.push({ text: match[2], formats: { bold: true } });
    } else if (match[4]) {
      spans.push({ text: match[4], formats: { italic: true } });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < str.length) {
    spans.push({ text: str.substring(lastIndex) });
  }

  return spans.length > 0 ? spans : [{ text: str }];
}

export function parseMarkdownToBlocks(markdownText: string): BlockInstance[] {
  if (!markdownText || !markdownText.trim()) return [];

  const rawLines = markdownText.split(/\r?\n/);
  const blocks: BlockInstance[] = [];

  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLang = 'javascript';

  let pendingListItems: { id: string; content: RichTextValue; level: number }[] = [];
  let pendingListStyle: 'bullet' | 'number' = 'bullet';

  const flushList = () => {
    if (pendingListItems.length > 0) {
      blocks.push({
        id: createId(),
        type: 'list',
        attributes: { style: pendingListStyle, items: pendingListItems },
        innerBlocks: [],
      });
      pendingListItems = [];
    }
  };

  let pendingParagraphLines: string[] = [];

  const flushParagraph = () => {
    if (pendingParagraphLines.length > 0) {
      const fullText = pendingParagraphLines.join(' ').replace(/\s{2,}/g, ' ').trim();
      if (fullText) {
        blocks.push({
          id: createId(),
          type: 'paragraph',
          attributes: { content: parseInlineFormatting(fullText) },
          innerBlocks: [],
        });
      }
      pendingParagraphLines = [];
    }
  };

  rawLines.forEach((line) => {
    const trimmed = line.trim();

    // Code Fence (```)
    if (trimmed.startsWith('```')) {
      flushParagraph();
      if (inCodeBlock) {
        blocks.push({
          id: createId(),
          type: 'code',
          attributes: { content: codeBuffer.join('\n'), language: codeLang },
          innerBlocks: [],
        });
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
        codeLang = trimmed.replace(/^```/, '').trim() || 'javascript';
      }
      return;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      return;
    }

    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    // Markdown Headings (#)
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      blocks.push({
        id: createId(),
        type: 'heading',
        attributes: {
          level: headingMatch[1].length,
          content: parseInlineFormatting(headingMatch[2]),
        },
        innerBlocks: [],
      });
      return;
    }

    // Horizontal Rule (---, ***, ___)
    if (/^(---|[*]{3,}|_{3,})$/.test(trimmed)) {
      flushParagraph();
      flushList();
      blocks.push({
        id: createId(),
        type: 'separator',
        attributes: { style: 'default' },
        innerBlocks: [],
      });
      return;
    }

    // Blockquote (>)
    if (trimmed.startsWith('>')) {
      flushParagraph();
      flushList();
      const quoteText = trimmed.replace(/^>\s*/, '');
      blocks.push({
        id: createId(),
        type: 'quote',
        attributes: { content: parseInlineFormatting(quoteText) },
        innerBlocks: [],
      });
      return;
    }

    // List Items (1., -, *, •)
    const isNumbered = /^[0-9]+[\.\)]\s+/.test(trimmed);
    const isBulleted = /^[-*•+◦▪]\s+/.test(trimmed);

    if (isNumbered || isBulleted) {
      flushParagraph();
      const indentMatch = line.match(/^(\s*)/);
      const spaces = indentMatch ? indentMatch[1].replace(/\t/g, '  ').length : 0;
      const level = Math.min(Math.floor(spaces / 2), 4);
      const cleanText = trimmed.replace(/^([0-9]+[\.\)]|[-*•+◦▪])\s+/, '');

      if (pendingListItems.length === 0) {
        pendingListStyle = isNumbered ? 'number' : 'bullet';
      }

      pendingListItems.push({
        id: createId(),
        content: parseInlineFormatting(cleanText),
        level,
      });
      return;
    }

    flushList();

    // Collect continuous paragraph lines
    pendingParagraphLines.push(trimmed);
  });

  flushParagraph();
  flushList();

  if (inCodeBlock && codeBuffer.length > 0) {
    blocks.push({
      id: createId(),
      type: 'code',
      attributes: { content: codeBuffer.join('\n'), language: codeLang },
      innerBlocks: [],
    });
  }

  return blocks;
}
