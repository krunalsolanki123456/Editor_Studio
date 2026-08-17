/**
 * HTMLParser.ts
 * Parses cleaned HTML DOM elements into native block instances with preserved rich text formatting,
 * inline styles, images, lists, tables, code blocks, embeds, buttons, and layout containers.
 */

import { createId } from '../utils';
import type { BlockInstance, RichTextValue } from '../types';
import { parse as parseRichText } from '../RichText';
import { parseInlineStyles } from './StyleMapper';
import { parseImageElement } from './ImageParser';
import { parseTableElement } from './TableParser';
import { detectMediaEmbed } from './EmbedDetector';
import { isLayoutContainer, wrapInGroupBlock } from './LayoutDetector';
import { sanitizeUrl } from './HTMLSanitizer';

export function parseHtmlToBlocks(html: string): BlockInstance[] {
  if (!html || !html.trim()) return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;
  const blocks: BlockInstance[] = [];

  function processNode(node: Node): BlockInstance | BlockInstance[] | null {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text && text.length > 0) {
        return {
          id: createId(),
          type: 'paragraph',
          attributes: { content: [{ text }] },
          innerBlocks: [],
        };
      }
      return null;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    const el = node as HTMLElement;
    const tagName = el.tagName.toLowerCase();

    // Skip scripts, styles, meta, etc.
    if (['script', 'style', 'meta', 'link', 'noscript', 'svg', 'input', 'form'].includes(tagName)) {
      return null;
    }

    const inlineStyles = parseInlineStyles(el);

    // Code / Preformatted Block Check (Direct or inside wrapper container like ChatGPT div)
    if (tagName === 'pre' || tagName === 'code' || el.querySelector('pre, code')) {
      const targetCodeEl = (tagName === 'pre' || tagName === 'code') ? el : (el.querySelector('pre') || el.querySelector('code'));
      if (targetCodeEl) {
        const innerCode = targetCodeEl.querySelector('code');
        const codeText = innerCode ? (innerCode.textContent || '') : (targetCodeEl.textContent || '');
        if (codeText.trim()) {
          const langClass = (targetCodeEl.className || '') + ' ' + (innerCode?.className || '');
          const langMatch = langClass.match(/language-([a-z0-9_+-]+)/i) || langClass.match(/lang-([a-z0-9_+-]+)/i);
          const language = langMatch ? langMatch[1].toLowerCase() : 'javascript';
          return {
            id: createId(),
            type: 'code',
            attributes: { content: codeText, language },
            innerBlocks: [],
          };
        }
      }
    }

    // Headings (H1..H6)
    if (/^h[1-6]$/.test(tagName)) {
      const level = parseInt(tagName.charAt(1), 10);
      const content = parseRichText(el.innerHTML);
      if (content.length > 0 && content.some((c) => (c.text ?? '').trim().length > 0)) {
        return {
          id: createId(),
          type: 'heading',
          attributes: { level, content, ...inlineStyles },
          innerBlocks: [],
        };
      }
      return null;
    }

    // HR Separator
    if (tagName === 'hr') {
      return {
        id: createId(),
        type: 'separator',
        attributes: { style: 'default' },
        innerBlocks: [],
      };
    }

    // Image / Figure / Picture
    if (tagName === 'img' || tagName === 'figure' || tagName === 'picture') {
      const imgData = parseImageElement(el);
      if (imgData) {
        return {
          id: createId(),
          type: 'image',
          attributes: {
            url: imgData.url,
            alt: imgData.alt,
            title: imgData.title,
            caption: imgData.caption ? [{ text: imgData.caption }] : undefined,
            align: imgData.align || 'center',
            width: '100%',
            height: 'auto',
          },
          innerBlocks: [],
        };
      }
      return null;
    }

    // Table
    if (tagName === 'table') {
      return parseTableElement(el);
    }

    // Embeds (iframe, video, audio)
    if (tagName === 'iframe' || tagName === 'video' || tagName === 'audio') {
      const src = el.getAttribute('src') || el.querySelector('source')?.getAttribute('src') || '';
      const embedMatch = detectMediaEmbed(src);
      if (embedMatch) {
        if (embedMatch.type === 'video') {
          return {
            id: createId(),
            type: 'video',
            attributes: { url: embedMatch.url },
            innerBlocks: [],
          };
        }
        if (embedMatch.type === 'audio') {
          return {
            id: createId(),
            type: 'audio',
            attributes: { url: embedMatch.url },
            innerBlocks: [],
          };
        }
        return {
          id: createId(),
          type: 'embed',
          attributes: { url: embedMatch.url, provider: embedMatch.provider },
          innerBlocks: [],
        };
      }
      return null;
    }

    // Button / CTA Link
    if (
      tagName === 'button' ||
      (tagName === 'a' && (el.classList.contains('btn') || el.classList.contains('button') || el.getAttribute('role') === 'button'))
    ) {
      const text = el.textContent?.trim() || 'Click Here';
      const href = sanitizeUrl(el.getAttribute('href'));
      return {
        id: createId(),
        type: 'button',
        attributes: {
          text,
          url: href,
          backgroundColor: '#2563eb',
          textColor: '#ffffff',
          borderRadius: '8px',
        },
        innerBlocks: [],
      };
    }

    // Lists (UL / OL)
    if (tagName === 'ul' || tagName === 'ol') {
      const style = tagName === 'ol' ? 'number' : 'bullet';
      const items: { id: string; content: RichTextValue; level?: number }[] = [];

      function parseListItems(listEl: HTMLElement, level = 0) {
        Array.from(listEl.childNodes).forEach((child) => {
          if (child.nodeType === Node.ELEMENT_NODE) {
            const childEl = child as HTMLElement;
            if (childEl.tagName.toLowerCase() === 'li') {
              const cloneLi = childEl.cloneNode(true) as HTMLElement;
              cloneLi.querySelectorAll('ul, ol').forEach((sub) => sub.remove());

              const content = parseRichText(cloneLi.innerHTML);
              if (content.length > 0 && content.some((c) => (c.text ?? '').trim().length > 0)) {
                items.push({
                  id: createId(),
                  content,
                  level,
                });
              }

              childEl.querySelectorAll(':scope > ul, :scope > ol').forEach((subList) => {
                parseListItems(subList as HTMLElement, level + 1);
              });
            }
          }
        });
      }

      parseListItems(el, 0);

      if (items.length > 0) {
        return {
          id: createId(),
          type: 'list',
          attributes: { style, items, ...inlineStyles },
          innerBlocks: [],
        };
      }
      return null;
    }

    // Blockquote
    if (tagName === 'blockquote') {
      const citeText = el.querySelector('cite')?.textContent || '';
      const cloneBq = el.cloneNode(true) as HTMLElement;
      cloneBq.querySelectorAll('cite').forEach((c) => c.remove());
      const content = parseRichText(cloneBq.innerHTML);

      if (content.length > 0) {
        return {
          id: createId(),
          type: 'quote',
          attributes: {
            content,
            citation: citeText ? [{ text: citeText }] : [],
            ...inlineStyles,
          },
          innerBlocks: [],
        };
      }
      return null;
    }

    // Paragraph
    if (tagName === 'p') {
      const innerImgs = Array.from(el.querySelectorAll('img'));
      const extractedBlocks: BlockInstance[] = [];

      if (innerImgs.length > 0) {
        innerImgs.forEach((img) => {
          const parsedImg = parseImageElement(img);
          if (parsedImg) {
            extractedBlocks.push({
              id: createId(),
              type: 'image',
              attributes: { url: parsedImg.url, alt: parsedImg.alt, align: 'center', width: '100%', height: 'auto' },
              innerBlocks: [],
            });
          }
        });
      }

      const cloneEl = el.cloneNode(true) as HTMLElement;
      cloneEl.querySelectorAll('img').forEach((img) => img.remove());
      const textContent = parseRichText(cloneEl.innerHTML);

      if (textContent.length > 0 && textContent.some((c) => (c.text ?? '').trim().length > 0)) {
        extractedBlocks.unshift({
          id: createId(),
          type: 'paragraph',
          attributes: { content: textContent, ...inlineStyles },
          innerBlocks: [],
        });
      }

      if (extractedBlocks.length > 0) {
        return extractedBlocks;
      }
      return null;
    }

    // Layout Containers (section, div, article)
    if (isLayoutContainer(el)) {
      const childBlocks: BlockInstance[] = [];
      Array.from(el.childNodes).forEach((childNode) => {
        const res = processNode(childNode);
        if (res) {
          if (Array.isArray(res)) childBlocks.push(...res);
          else childBlocks.push(res);
        }
      });

      if (childBlocks.length > 0) {
        if (tagName === 'section' || tagName === 'article') {
          return wrapInGroupBlock(childBlocks);
        }
        return childBlocks;
      }
      return null;
    }

    // General fallback for unknown containers
    const childBlocks: BlockInstance[] = [];
    Array.from(el.childNodes).forEach((childNode) => {
      const res = processNode(childNode);
      if (res) {
        if (Array.isArray(res)) childBlocks.push(...res);
        else childBlocks.push(res);
      }
    });

    return childBlocks.length > 0 ? childBlocks : null;
  }

  Array.from(body.childNodes).forEach((node) => {
    const res = processNode(node);
    if (res) {
      if (Array.isArray(res)) blocks.push(...res);
      else blocks.push(res);
    }
  });

  return blocks;
}
