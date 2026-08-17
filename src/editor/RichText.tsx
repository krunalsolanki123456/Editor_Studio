import { useCallback, useEffect, useRef } from 'react';
import type { RichTextValue, InlineFormat, TextAlign } from './types';
import { useEditorStore } from './store';
import { parseRichPasteToBlocks } from './richPasteEngine';
import { focusBlockId } from './utils';

interface RichTextProps {
  value: RichTextValue;
  onChange: (value: RichTextValue) => void;
  placeholder?: string;
  align?: TextAlign;
  className?: string;
  tagName?: string;
  onEnter?: (e: React.KeyboardEvent, caretOffset?: number) => void;
  onEnterAtStart?: (e: React.KeyboardEvent) => void;
  onBackspaceEmpty?: () => void;
  onBackspaceAtStart?: () => void;
  onSlash?: (rect: DOMRect) => void;
  onIndent?: () => void;
  onOutdent?: () => void;
  onPasteText?: (text: string, e: React.ClipboardEvent) => boolean | void;
  autoFocus?: boolean;
  style?: React.CSSProperties;
  /** Paragraph-only behavior: preserve Shift+Enter/BR as a real soft line break. */
  preserveLineBreaks?: boolean;
  /** Preserve inline rich HTML when pasting into this field. */
  preserveInlineHtmlPaste?: boolean;
}

function escapeHtml(s: any): string {
  const str = typeof s === 'string' ? s : String(s ?? '');
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function serialize(value: any, preserveLineBreaks = false): string {
  if (!value) return '';
  if (typeof value === 'string') return escapeHtml(value);
  if (!Array.isArray(value)) return '';
  return value.map((span) => {
    if (!span) return '';
    if (typeof span === 'string') return escapeHtml(span);
    let html = escapeHtml(span.text || '');
    if (preserveLineBreaks) html = html.replace(/\r?\n/g, '<br>');
    const f = span.formats;
    if (!f) return html;
    if (f.bold) html = `<strong>${html}</strong>`;
    if (f.italic) html = `<em>${html}</em>`;
    if (f.underline) html = `<u>${html}</u>`;
    if (f.strikethrough) html = `<s>${html}</s>`;
    if (f.superscript) html = `<sup>${html}</sup>`;
    if (f.subscript) html = `<sub>${html}</sub>`;
    if (f.code) html = `<code>${html}</code>`;
    if (f.textColor) html = `<span style="color:${f.textColor}">${html}</span>`;
    if (f.backgroundColor) html = `<span style="background-color:${f.backgroundColor}">${html}</span>`;
    if (f.link) {
      const target = f.link.target ? ` target="${f.link.target}"` : '';
      html = `<a href="${escapeHtml(f.link.url || '')}"${target}>${html}</a>`;
    }
    return html;
  }).join('');
}

export function parse(html: string, preserveLineBreaks = false): RichTextValue {
  const template = document.createElement('div');
  template.innerHTML = html;
  const result: RichTextValue = [];

  function walk(node: Node, formats: InlineFormat) {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent || '';
        if (text.length === 0) return;
        result.push({ text, formats: { ...formats } });
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        const tag = el.tagName.toLowerCase();

        if (tag === 'br' && preserveLineBreaks) {
          result.push({ text: '\n', formats: { ...formats } });
          return;
        }

        const next: InlineFormat = { ...formats };
        if (tag === 'strong' || tag === 'b') next.bold = true;
        else if (tag === 'em' || tag === 'i') next.italic = true;
        else if (tag === 'u') next.underline = true;
        else if (tag === 's' || tag === 'strike' || tag === 'del') next.strikethrough = true;
        else if (tag === 'sup') next.superscript = true;
        else if (tag === 'sub') next.subscript = true;
        else if (tag === 'code') next.code = true;
        else if (tag === 'a') next.link = { url: el.getAttribute('href') || '', target: el.getAttribute('target') || undefined };
        else if (tag === 'span') {
          if (el.style.color) next.textColor = el.style.color;
          if (el.style.backgroundColor) next.backgroundColor = el.style.backgroundColor;
        }
        walk(el, next);
      }
    });
  }

  walk(template, {});
  if (result.length === 0 && html.includes('<br')) return preserveLineBreaks ? [{ text: '\n' }] : [{ text: '' }];
  return result;
}

function getCaretOffset(element: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.endContainer, range.endOffset);
  return preCaretRange.toString().length;
}

function setCaretOffset(element: HTMLElement, offset: number, preserveLineBreaks = false) {
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  let currentOffset = 0;

  function traverseNodes(node: Node): boolean {
    if (node.nodeType === Node.TEXT_NODE) {
      const textLen = node.textContent?.length || 0;
      if (currentOffset + textLen >= offset) {
        range.setStart(node, Math.max(0, Math.min(offset - currentOffset, textLen)));
        range.setEnd(node, Math.max(0, Math.min(offset - currentOffset, textLen)));
        return true;
      }
      currentOffset += textLen;
    } else if (preserveLineBreaks && node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName.toLowerCase() === 'br') {
      if (currentOffset + 1 >= offset) {
        range.setStartAfter(node);
        range.setEndAfter(node);
        return true;
      }
      currentOffset += 1;
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        if (traverseNodes(node.childNodes[i])) return true;
      }
    }
    return false;
  }

  const found = traverseNodes(element);
  if (!found) {
    range.selectNodeContents(element);
    range.collapse(false);
  }
  sel.removeAllRanges();
  sel.addRange(range);
}

export default function RichText({
  value, onChange, placeholder, align = 'left', className = '',
  tagName = 'div', onEnter, onEnterAtStart, onBackspaceEmpty, onBackspaceAtStart, onSlash, onIndent, onOutdent, onPasteText, autoFocus, style,
  preserveLineBreaks = false, preserveInlineHtmlPaste = false,
}: RichTextProps) {
  const ref = useRef<HTMLElement>(null);
  const lastSerialized = useRef<string>('');

  const syncDOM = useCallback(() => {
    if (!ref.current) return;
    const serialized = serialize(value, preserveLineBreaks);
    const htmlToSet = serialized || '<br>';
    if (htmlToSet !== lastSerialized.current) {
      const isFocused = document.activeElement === ref.current;
      const savedOffset = isFocused ? getCaretOffset(ref.current) : null;

      ref.current.innerHTML = htmlToSet;
      lastSerialized.current = htmlToSet;

      if (isFocused && savedOffset !== null) {
        setCaretOffset(ref.current, savedOffset, preserveLineBreaks);
      }
    }
  }, [value, preserveLineBreaks]);

  useEffect(() => { syncDOM(); }, [syncDOM]);

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
      const text = ref.current.textContent || '';
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      range.collapse(text.trim() === '');
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [autoFocus]);

  const handleFocus = () => {
    if (!ref.current) return;
    const text = ref.current.textContent || '';
    if (text.trim() === '') {
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      range.collapse(true); // Place cursor at first position if empty
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  };

  const handleInput = () => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    const parsed = parse(html, preserveLineBreaks);
    lastSerialized.current = serialize(parsed) || '<br>';
    onChange(parsed);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const html = e.clipboardData.getData('text/html');
    const markdown = e.clipboardData.getData('text/markdown');
    const plainText = e.clipboardData.getData('text/plain');

    if (!html && !markdown && !plainText) return;

    if (onPasteText) {
      const handled = onPasteText(plainText, e);
      if (handled) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }

    // Priority: HTML > Markdown > Plain Text
    const rawContent = (html && html.trim()) ? html : ((markdown && markdown.trim()) ? markdown : plainText);

    // Detect if content contains block structure or rich HTML elements:
    // <pre>, <code>, <h1-6>, <p>, <ul>, <ol>, <blockquote>, <img>, <figure>, <table>, <hr>, <iframe>, <video>, <audio>, <button>, <section>, <div>
    const hasBlockHtml = Boolean(html && /<(pre|code|h[1-6]|p|ul|ol|li|blockquote|img|figure|table|hr|iframe|video|audio|button|section|article|div)\b/i.test(html));
    const hasBlockMarkdown = Boolean(markdown && /^```|^#{1,6}\s|^>\s|^[-*•+◦▪]\s|^[0-9]+[\.\)]\s/m.test(markdown));
    const hasBlockPlainText = Boolean(plainText && (/^```|^#{1,6}\s|^>\s|^[-*•+◦▪]\s|^[0-9]+[\.\)]\s/m.test(plainText) || plainText.includes('\n\n')));

    // Check if pasting inside a Quote, Pullquote, Citation, Figcaption or Code block
    const activeBlockEl = ref.current?.closest('[data-block-id]') as HTMLElement | null;
    const activeBlockId = activeBlockEl?.getAttribute('data-block-id');
    const activeBlock = activeBlockId ? useEditorStore.getState().blocks.find((b) => b.id === activeBlockId) : null;
    const activeType = activeBlock?.type;

    const isQuoteOrSpecialField =
      activeType === 'quote' ||
      activeType === 'pullquote' ||
      activeType === 'verse' ||
      activeType === 'code' ||
      activeType === 'preformatted' ||
      ref.current?.tagName === 'CITE' ||
      ref.current?.tagName === 'FIGCAPTION' ||
      Boolean(ref.current?.closest('.be-quote, .be-pullquote, .be-verse, cite, figcaption'));

    if (isQuoteOrSpecialField) {
      e.preventDefault();
      e.stopPropagation();

      // Extract clean text from paste data
      let textToInsert = plainText || (html ? html.replace(/<[^>]+>/g, '') : '');
      textToInsert = textToInsert.replace(/\r/g, '');

      // Insert clean text at current caret position
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(textToInsert);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        sel.removeAllRanges();
        sel.addRange(range);
      }

      handleInput();
      return;
    }

    const isRichBlockPaste = hasBlockHtml || hasBlockMarkdown || hasBlockPlainText;

    if (isRichBlockPaste) {
      const activeBlockEl = ref.current?.closest('[data-block-id]') as HTMLElement | null;
      const blockId = activeBlockEl?.getAttribute('data-block-id');
      const { blocks, removeBlock, addBlocks } = useEditorStore.getState();
      const blockIdx = blockId ? blocks.findIndex((b) => b.id === blockId) : -1;
      const currentBlock = blockIdx !== -1 ? blocks[blockIdx] : null;

      const generatedBlocks = parseRichPasteToBlocks(rawContent);

      // Inherit target block's font family & text attributes into pasted blocks
      if (currentBlock && currentBlock.attributes?.fontFamily) {
        generatedBlocks.forEach((gb) => {
          if (gb.attributes) {
            gb.attributes.fontFamily = currentBlock.attributes.fontFamily;
            if (currentBlock.attributes.fontFamilyLabel) {
              gb.attributes.fontFamilyLabel = currentBlock.attributes.fontFamilyLabel;
            }
            if (currentBlock.attributes.textColor && !gb.attributes.textColor) {
              gb.attributes.textColor = currentBlock.attributes.textColor;
            }
          }
        });
      }

      if (generatedBlocks.length > 0) {
        const isSingleInlineParagraph = generatedBlocks.length === 1 &&
          generatedBlocks[0].type === 'paragraph' &&
          !plainText.includes('\n') &&
          !hasBlockHtml;

        if (!isSingleInlineParagraph) {
          e.preventDefault();
          e.stopPropagation();

          if (blockId) {
            const currentBlock = blocks[blockIdx];

            const isCurrentEmpty = currentBlock && (
              currentBlock.type === 'paragraph' && (
                !currentBlock.attributes.content ||
                (currentBlock.attributes.content as any[]).length === 0 ||
                !(currentBlock.attributes.content as any[])[0]?.text?.trim()
              )
            );

            if (isCurrentEmpty) {
              removeBlock(blockId);
              const prevId = blockIdx > 0 ? blocks[blockIdx - 1]?.id : null;
              addBlocks(generatedBlocks, prevId);
            } else {
              addBlocks(generatedBlocks, blockId);
            }

            setTimeout(() => {
              const lastPastedId = generatedBlocks[generatedBlocks.length - 1]?.id;
              if (lastPastedId) {
                const el = document.querySelector(
                  `[data-block-id="${lastPastedId}"] [contenteditable], [data-block-id="${lastPastedId}"] textarea`
                ) as HTMLElement | null;
                if (el) {
                  el.focus({ preventScroll: true });
                  const range = document.createRange();
                  range.selectNodeContents(el);
                  range.collapse(false);
                  const sel = window.getSelection();
                  sel?.removeAllRanges();
                  sel?.addRange(range);
                }
              }
            }, 30);
            return;
          }
        }
      }
    }

    // Preserve inline rich HTML for Paragraph. Block-level HTML is handled by the
    // Rich Paste engine above; this path is intentionally opt-in so other blocks
    // keep their existing paste behavior.
    if (preserveInlineHtmlPaste && html && !hasBlockHtml) {
      e.preventDefault();
      e.stopPropagation();
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();

        const template = document.createElement('template');
        template.innerHTML = html;
        // Remove unsafe elements/attributes before inserting clipboard markup.
        template.content.querySelectorAll('script,style,iframe,object,embed,form').forEach((node) => node.remove());
        template.content.querySelectorAll<HTMLElement>('*').forEach((el) => {
          Array.from(el.attributes).forEach((attr) => {
            if (attr.name.toLowerCase().startsWith('on') || attr.name.toLowerCase() === 'style' && /expression\s*\(|javascript:/i.test(attr.value)) {
              el.removeAttribute(attr.name);
            }
          });
        });

        const fragment = template.content.cloneNode(true);
        range.insertNode(fragment);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      handleInput();
      return;
    }

    // Standard inline text paste
    e.preventDefault();
    e.stopPropagation();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(plainText);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    handleInput();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        onOutdent?.();
      } else {
        onIndent?.();
      }
      return;
    }

    const isMod = e.metaKey || e.ctrlKey;
    if (isMod) {
      const key = e.key.toLowerCase();
      if (key === 'b') {
        e.preventDefault();
        document.execCommand('bold');
        handleInput();
        return;
      }
      if (key === 'i') {
        e.preventDefault();
        document.execCommand('italic');
        handleInput();
        return;
      }
      if (key === 'u') {
        e.preventDefault();
        document.execCommand('underline');
        handleInput();
        return;
      }
      if (key === 'x' && e.shiftKey) {
        e.preventDefault();
        document.execCommand('strikeThrough');
        handleInput();
        return;
      }
      if (key === 'e' || key === '`') {
        e.preventDefault();
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed) {
          document.execCommand('insertHTML', false, `<code>${sel.toString()}</code>`);
          handleInput();
        }
        return;
      }
      if (key === 'h' && e.shiftKey) {
        e.preventDefault();
        const sel = window.getSelection();
        let hasHighlight = false;
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          let node: Node | null = range.commonAncestorContainer;
          if (node.nodeType === 3) node = node.parentNode;
          while (node && node !== document.body && !(node as HTMLElement).hasAttribute('contenteditable')) {
            if (node.nodeType === 1) {
              const bg = (node as HTMLElement).style?.backgroundColor || window.getComputedStyle(node as HTMLElement).backgroundColor;
              if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'none') {
                hasHighlight = true;
                break;
              }
            }
            node = node.parentNode;
          }
        }
        if (hasHighlight) {
          document.execCommand('hiliteColor', false, 'transparent');
          document.execCommand('backColor', false, 'transparent');
        } else {
          document.execCommand('hiliteColor', false, '#fef08a');
        }
        handleInput();
        return;
      }
      if (key === '\\') {
        e.preventDefault();
        document.execCommand('removeFormat');
        handleInput();
        return;
      }
    }

    if (e.key === 'ArrowUp' && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey && ref.current) {
      const caretOffset = getCaretOffset(ref.current);
      if (caretOffset === 0) {
        const listItemEl = ref.current.closest('[data-list-item]');
        if (listItemEl) {
          const listParent = listItemEl.closest('ul, ol') || listItemEl.parentElement;
          const allItems = Array.from(listParent?.querySelectorAll('[data-list-item]') || []);
          const itemIdx = allItems.indexOf(listItemEl);
          if (itemIdx > 0) {
            e.preventDefault();
            const prevItemEditable = allItems[itemIdx - 1].querySelector('[contenteditable]') as HTMLElement | null;
            if (prevItemEditable) {
              prevItemEditable.focus();
              const range = document.createRange();
              range.selectNodeContents(prevItemEditable);
              range.collapse(false);
              const sel = window.getSelection();
              sel?.removeAllRanges();
              sel?.addRange(range);
            }
            return;
          }
        }

        const activeBlockEl = ref.current.closest('[data-block-id]') as HTMLElement | null;
        const blockId = activeBlockEl?.getAttribute('data-block-id');
        if (blockId) {
          const blocks = useEditorStore.getState().blocks;
          const idx = blocks.findIndex((b) => b.id === blockId);
          if (idx > 0) {
            e.preventDefault();
            const prevBlockId = blocks[idx - 1].id;
            focusBlockId(prevBlockId, false);
            return;
          }
        }
      }
    }

    if (e.key === 'ArrowDown' && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey && ref.current) {
      const textLen = (ref.current.textContent || '').length;
      const caretOffset = getCaretOffset(ref.current);
      if (caretOffset >= textLen) {
        const listItemEl = ref.current.closest('[data-list-item]');
        if (listItemEl) {
          const listParent = listItemEl.closest('ul, ol') || listItemEl.parentElement;
          const allItems = Array.from(listParent?.querySelectorAll('[data-list-item]') || []);
          const itemIdx = allItems.indexOf(listItemEl);
          if (itemIdx !== -1 && itemIdx < allItems.length - 1) {
            e.preventDefault();
            const nextItemEditable = allItems[itemIdx + 1].querySelector('[contenteditable]') as HTMLElement | null;
            if (nextItemEditable) {
              nextItemEditable.focus();
              const range = document.createRange();
              range.selectNodeContents(nextItemEditable);
              range.collapse(true);
              const sel = window.getSelection();
              sel?.removeAllRanges();
              sel?.addRange(range);
            }
            return;
          }
        }

        const activeBlockEl = ref.current.closest('[data-block-id]') as HTMLElement | null;
        const blockId = activeBlockEl?.getAttribute('data-block-id');
        if (blockId) {
          const blocks = useEditorStore.getState().blocks;
          const idx = blocks.findIndex((b) => b.id === blockId);
          if (idx !== -1 && idx < blocks.length - 1) {
            e.preventDefault();
            const nextBlockId = blocks[idx + 1].id;
            focusBlockId(nextBlockId, true);
            return;
          }
        }
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (ref.current) {
        const offset = getCaretOffset(ref.current);
        if (offset === 0 && onEnterAtStart) {
          onEnterAtStart(e);
          return;
        }
        if (onEnter) {
          onEnter(e, offset);
          return;
        }
      }
      if (onEnter) onEnter(e);
    }
    if (e.key === 'Backspace') {
      const rawText = (ref.current?.textContent || '').replace(/[\s\u00a0\u200B]+/g, '');
      const isEmptyText = rawText === '';
      if (isEmptyText) {
        e.preventDefault();
        onBackspaceEmpty?.();
        return;
      }
      if (ref.current) {
        const offset = getCaretOffset(ref.current);
        if (offset === 0 && onBackspaceAtStart) {
          e.preventDefault();
          onBackspaceAtStart();
          return;
        }
      }
    }
    if (e.key === '/') {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && ref.current) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect.width > 0 || rect.height > 0) onSlash?.(rect);
      }
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    if (anchor) {
      const href = anchor.getAttribute('href');
      if (href && href !== '#' && !href.startsWith('javascript:')) {
        e.preventDefault();
        e.stopPropagation();
        window.open(anchor.href, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const Tag = tagName as any;

  return (
    <Tag
      ref={ref as React.Ref<HTMLElement>}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onFocus={handleFocus}
      onClick={handleClick}
      onInput={handleInput}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
      onBlur={handleInput}
      className={`outline-none ${className}`}
      style={{ textAlign: align, ...style }}
    />
  );
}
