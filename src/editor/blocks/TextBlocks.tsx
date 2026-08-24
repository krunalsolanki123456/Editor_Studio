import RichText from '../RichText';
import { useEditorStore } from '../store';
import type { BlockInstance, RichTextValue, TextAlign, ListStyle } from '../types';
import { createId } from '../utils';
import { getTypographyStyle } from '../typography';

interface BlockProps {
  block: BlockInstance;
  selected: boolean;
}

function alignClass(align: TextAlign): string {
  return align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : align === 'justify' ? 'text-justify' : 'text-left';
}

function focusBlock(id: string) {
  setTimeout(() => {
    const el = document.querySelector(`[data-block-id="${id}"] [contenteditable], [data-block-id="${id}"] textarea`) as HTMLElement | null;
    if (el) {
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, 0);
}

function setCaretOffset(element: HTMLElement, offset: number) {
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  let currentOffset = 0;

  function traverseNodes(node: Node): boolean {
    if (node.nodeType === Node.TEXT_NODE) {
      const textLen = node.textContent?.length || 0;
      if (currentOffset + textLen >= offset) {
        range.setStart(node, Math.min(offset - currentOffset, textLen));
        range.setEnd(node, Math.min(offset - currentOffset, textLen));
        return true;
      }
      currentOffset += textLen;
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        if (traverseNodes(node.childNodes[i])) return true;
      }
    }
    return false;
  }

  if (!traverseNodes(element)) {
    range.selectNodeContents(element);
    range.collapse(false);
  }
  sel.removeAllRanges();
  sel.addRange(range);
}

function handleBlockBackspace(blockId: string) {
  const currentBlocks = useEditorStore.getState().blocks;
  if (currentBlocks.length <= 1) return;
  const idx = currentBlocks.findIndex((b) => b.id === blockId);
  if (idx === -1) return;

  const prevBlockId = idx > 0 ? currentBlocks[idx - 1].id : currentBlocks[1]?.id;
  useEditorStore.getState().removeBlock(blockId);

  if (prevBlockId) {
    focusBlock(prevBlockId);
  }
}

function handleBlockBackspaceAtStart(blockId: string) {
  const currentBlocks = useEditorStore.getState().blocks;
  const idx = currentBlocks.findIndex((b) => b.id === blockId);
  if (idx <= 0) return;

  const currentBlock = currentBlocks[idx];
  const prevBlock = currentBlocks[idx - 1];

  const isMergeable = (type: string) => ['paragraph', 'heading', 'quote', 'pullquote', 'verse'].includes(type);

  if (isMergeable(currentBlock.type) && isMergeable(prevBlock.type)) {
    const prevContent = Array.isArray(prevBlock.attributes.content)
      ? (prevBlock.attributes.content as RichTextValue)
      : prevBlock.attributes.content ? [{ text: String(prevBlock.attributes.content) }] : [];
    const currContent = Array.isArray(currentBlock.attributes.content)
      ? (currentBlock.attributes.content as RichTextValue)
      : currentBlock.attributes.content ? [{ text: String(currentBlock.attributes.content) }] : [];

    const mergedContent = [...prevContent, ...currContent];
    const prevTextLen = prevContent.map((c: any) => (typeof c === 'string' ? c : c.text || '')).join('').length;

    useEditorStore.setState((st) => {
      const newBlocks = st.blocks.filter((b) => b.id !== blockId).map((b) => {
        if (b.id === prevBlock.id) {
          return {
            ...b,
            attributes: {
              ...b.attributes,
              content: mergedContent,
            },
          };
        }
        return b;
      });
      return {
        blocks: newBlocks,
        selectedIds: [prevBlock.id],
      };
    });

    setTimeout(() => {
      const el = document.querySelector(`[data-block-id="${prevBlock.id}"] [contenteditable]`) as HTMLElement | null;
      if (el) {
        el.focus();
        setCaretOffset(el, prevTextLen);
      }
    }, 10);
  } else {
    focusBlock(prevBlock.id);
  }
}

export function ParagraphBlock({ block }: BlockProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const insertBlock = useEditorStore((s) => s.insertBlock);
  const a = block.attributes;
  const typography = getTypographyStyle('paragraph', a);

  // Split content at caretOffset into [before, after] spans
  const splitContentAt = (content: RichTextValue, caretOffset: number): [RichTextValue, RichTextValue] => {
    const before: RichTextValue = [];
    const after: RichTextValue = [];
    let remaining = caretOffset;

    for (const span of content) {
      const text = span.text ?? '';
      if (remaining <= 0) {
        after.push(span);
      } else if (remaining >= text.length) {
        before.push(span);
        remaining -= text.length;
      } else {
        before.push({ ...span, text: text.slice(0, remaining) });
        after.push({ ...span, text: text.slice(remaining) });
        remaining = 0;
      }
    }
    return [before, after];
  };

  const handleEnter = (_e: React.KeyboardEvent, caretOffset?: number) => {
    const state = useEditorStore.getState();
    const blocks = state.blocks;
    const idx = blocks.findIndex((b) => b.id === block.id);
    const currentContent = (a.content as RichTextValue) ?? [];
    const totalLen = currentContent.reduce((sum, s) => sum + (s.text?.length ?? 0), 0);
    const offset = caretOffset ?? totalLen;

    if (offset < totalLen && offset > 0) {
      // Split content
      const [beforeContent, afterContent] = splitContentAt(currentContent, offset);
      // Update current block with before
      state.updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, content: beforeContent } }));
      // Insert new paragraph with after content
      const id = state.insertBlock('paragraph', idx !== -1 ? idx + 1 : null);
      if (id) {
        state.updateBlock(id, (b) => ({ ...b, attributes: { ...b.attributes, content: afterContent } }));
        setTimeout(() => {
          const el = document.querySelector(`[data-block-id="${id}"] [contenteditable]`) as HTMLElement | null;
          if (el) {
            el.focus();
            const range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(true);
            window.getSelection()?.removeAllRanges();
            window.getSelection()?.addRange(range);
          }
        }, 0);
      }
    } else {
      const id = insertBlock('paragraph', idx !== -1 ? idx + 1 : null);
      if (id) focusBlock(id);
    }
  };

  const handleEnterAtStart = () => {
    const blocks = useEditorStore.getState().blocks;
    const idx = blocks.findIndex((b) => b.id === block.id);
    const id = insertBlock('paragraph', idx !== -1 ? idx : 0);
    if (id) focusBlock(id);
  };

  const handleSlash = (rect: DOMRect) => {
    // Remove the "/" character that triggered the slash menu
    const currentContent = (a.content as RichTextValue) ?? [];
    const lastSpan = currentContent[currentContent.length - 1];
    if (lastSpan && lastSpan.text?.endsWith('/')) {
      const trimmed = [...currentContent];
      trimmed[trimmed.length - 1] = { ...lastSpan, text: lastSpan.text.slice(0, -1) };
      updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, content: trimmed } }));
    }
    window.dispatchEvent(new CustomEvent('be-slash', { detail: { blockId: block.id, rect } }));
  };

  return (
    <RichText
      value={a.content as RichTextValue}
      onChange={(v) => updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, content: v } }))}
      placeholder="Type / to choose a block"
      align={a.align as TextAlign}
      className="be-paragraph text-base leading-relaxed py-1 w-full block whitespace-pre-wrap break-words"
      tagName="p"
      style={typography}
      preserveLineBreaks
      preserveInlineHtmlPaste
      onEnter={handleEnter}
      onEnterAtStart={handleEnterAtStart}
      onBackspaceEmpty={() => handleBlockBackspace(block.id)}
      onBackspaceAtStart={() => handleBlockBackspaceAtStart(block.id)}
      onSlash={handleSlash}
    />
  );
}

export function HeadingBlock({ block }: BlockProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const insertBlock = useEditorStore((s) => s.insertBlock);
  const a = block.attributes;
  const level = a.level as number;
  const typography = getTypographyStyle('heading', a);
  const sizes: Record<number, string> = {
    1: 'text-4xl font-bold', 2: 'text-3xl font-bold', 3: 'text-2xl font-semibold',
    4: 'text-xl font-semibold', 5: 'text-lg font-medium', 6: 'text-base font-medium',
  };

  const handleEnter = (_e: React.KeyboardEvent, caretOffset?: number) => {
    const state = useEditorStore.getState();
    const blocks = state.blocks;
    const idx = blocks.findIndex((b) => b.id === block.id);
    const currentContent = (a.content as RichTextValue) ?? [];
    const totalLen = currentContent.reduce((sum, s) => sum + (s.text?.length ?? 0), 0);
    const offset = caretOffset ?? totalLen;

    if (offset < totalLen && offset > 0) {
      // Split heading content: before stays as heading, after becomes paragraph
      let remaining = offset;
      const before: RichTextValue = [];
      const after: RichTextValue = [];
      for (const span of currentContent) {
        const text = span.text ?? '';
        if (remaining <= 0) { after.push(span); }
        else if (remaining >= text.length) { before.push(span); remaining -= text.length; }
        else { before.push({ ...span, text: text.slice(0, remaining) }); after.push({ ...span, text: text.slice(remaining) }); remaining = 0; }
      }
      state.updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, content: before } }));
      const id = state.insertBlock('paragraph', idx !== -1 ? idx + 1 : null);
      if (id) {
        state.updateBlock(id, (b) => ({ ...b, attributes: { ...b.attributes, content: after } }));
        setTimeout(() => {
          const el = document.querySelector(`[data-block-id="${id}"] [contenteditable]`) as HTMLElement | null;
          if (el) { el.focus(); const r = document.createRange(); r.selectNodeContents(el); r.collapse(true); window.getSelection()?.removeAllRanges(); window.getSelection()?.addRange(r); }
        }, 0);
      }
    } else {
      const id = insertBlock('paragraph', idx !== -1 ? idx + 1 : null);
      if (id) focusBlock(id);
    }
  };

  const handleEnterAtStart = () => {
    const blocks = useEditorStore.getState().blocks;
    const idx = blocks.findIndex((b) => b.id === block.id);
    const id = insertBlock('paragraph', idx !== -1 ? idx : 0);
    if (id) focusBlock(id);
  };

  return (
    <RichText
      value={a.content as RichTextValue}
      onChange={(v) => updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, content: v } }))}
      placeholder={`Heading ${level}`}
      align={a.align as TextAlign}
      className={`be-heading ${sizes[level]} py-1 leading-tight`}
      tagName={`h${level}` as any}
      style={typography}
      onEnter={handleEnter}
      onEnterAtStart={handleEnterAtStart}
      onBackspaceEmpty={() => handleBlockBackspace(block.id)}
      onBackspaceAtStart={() => handleBlockBackspaceAtStart(block.id)}
      onSlash={(rect) => window.dispatchEvent(new CustomEvent('be-slash', { detail: { blockId: block.id, rect } }))}
    />
  );
}

export function ListBlock({ block }: BlockProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const removeBlock = useEditorStore((s) => s.removeBlock);
  const insertBlock = useEditorStore((s) => s.insertBlock);
  const a = block.attributes;
  const style = (a.style as ListStyle) || 'bullet';
  const items = (a.items as { id: string; content: RichTextValue; level?: number; checked?: boolean }[]) ?? [];
  const align = (a.align as TextAlign) || 'left';
  const typography = getTypographyStyle('list', a);

  const listStyleType = {
    bullet: 'disc',
    number: 'decimal',
    checklist: 'none',
    'alpha-upper': 'upper-alpha',
    'alpha-lower': 'lower-alpha',
    'roman-upper': 'upper-roman',
    'roman-lower': 'lower-roman',
  }[style] ?? 'disc';

  const tag = style === 'bullet' || style === 'checklist' ? 'ul' : 'ol';
  const Tag = tag as 'ul' | 'ol';

  const indentItem = (itemId: string) => {
    updateBlock(block.id, (b) => ({
      ...b,
      attributes: {
        ...b.attributes,
        items: ((b.attributes.items as any[]) ?? []).map((it) =>
          it.id === itemId ? { ...it, level: Math.min((it.level || 0) + 1, 4) } : it
        ),
      },
    }));
  };

  const outdentItem = (itemId: string) => {
    updateBlock(block.id, (b) => ({
      ...b,
      attributes: {
        ...b.attributes,
        items: ((b.attributes.items as any[]) ?? []).map((it) =>
          it.id === itemId ? { ...it, level: Math.max((it.level || 0) - 1, 0) } : it
        ),
      },
    }));
  };

  const updateItem = (itemId: string, content: RichTextValue) => {
    updateBlock(block.id, (b) => ({
      ...b,
      attributes: {
        ...b.attributes,
        items: ((b.attributes.items as any[]) ?? []).map((it) =>
          it.id === itemId ? { ...it, content } : it,
        ),
      },
    }));
  };

  const handleItemEnter = (itemId: string) => {
    const item = items.find((it) => it.id === itemId);
    const itemEl = document.querySelector(`[data-list-item="${itemId}"] [contenteditable]`) as HTMLElement | null;
    const domText = itemEl ? (itemEl.textContent || '').trim() : '';

    const textContent = domText || (Array.isArray(item?.content)
      ? item.content.map((span) => (typeof span === 'string' ? span : span?.text || '')).join('').trim()
      : (typeof item?.content === 'string' ? (item.content as string).trim() : ''));

    if (!textContent) {
      if (item && (item.level || 0) > 0) {
        outdentItem(itemId);
        return;
      }

      const currentBlocks = useEditorStore.getState().blocks;
      const blockIdx = currentBlocks.findIndex((b) => b.id === block.id);

      if (items.length <= 1) {
        removeBlock(block.id);
        const newPId = insertBlock('paragraph', blockIdx !== -1 ? blockIdx : null);
        if (newPId) focusBlock(newPId);
      } else {
        updateBlock(block.id, (b) => ({
          ...b,
          attributes: {
            ...b.attributes,
            items: ((b.attributes.items as any[]) ?? []).filter((it) => it.id !== itemId),
          },
        }));
        const newPId = insertBlock('paragraph', blockIdx !== -1 ? blockIdx + 1 : null);
        if (newPId) focusBlock(newPId);
      }
      return;
    }

    addItem(itemId);
  };

  const addItem = (afterId?: string) => {
    let targetLevel = 0;
    if (afterId) {
      const prev = items.find((it) => it.id === afterId);
      if (prev) targetLevel = prev.level || 0;
    }
    const newItem = { id: createId(), content: [] as RichTextValue, level: targetLevel };
    updateBlock(block.id, (b) => {
      const currentItems = (b.attributes.items as any[]) ?? [];
      if (afterId) {
        const idx = currentItems.findIndex((it) => it.id === afterId);
        return { ...b, attributes: { ...b.attributes, items: [...currentItems.slice(0, idx + 1), newItem, ...currentItems.slice(idx + 1)] } };
      }
      return { ...b, attributes: { ...b.attributes, items: [...currentItems, newItem] } };
    });
    setTimeout(() => {
      const el = document.querySelector(`[data-list-item="${newItem.id}"] [contenteditable]`) as HTMLElement | null;
      if (el) el.focus();
    }, 10);
  };

  const removeItem = (itemId: string) => {
    const item = items.find((it) => it.id === itemId);
    if (item && (item.level || 0) > 0) {
      outdentItem(itemId);
      return;
    }

    const currentBlocks = useEditorStore.getState().blocks;
    const blockIdx = currentBlocks.findIndex((b) => b.id === block.id);

    if (items.length <= 1) {
      removeBlock(block.id);
      const newPId = insertBlock('paragraph', blockIdx !== -1 ? blockIdx : null);
      if (newPId) focusBlock(newPId);
      return;
    }

    const idx = items.findIndex((it) => it.id === itemId);
    const prevItem = idx > 0 ? items[idx - 1] : items[1];
    updateBlock(block.id, (b) => ({
      ...b,
      attributes: { ...b.attributes, items: ((b.attributes.items as any[]) ?? []).filter((it) => it.id !== itemId) },
    }));
    if (prevItem) {
      setTimeout(() => {
        const el = document.querySelector(`[data-list-item="${prevItem.id}"] [contenteditable]`) as HTMLElement | null;
        if (el) {
          el.focus();
          const range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(false);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }, 10);
    }
  };

  const handlePasteListText = (text: string, currentItemId: string): boolean => {
    const rawLines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (rawLines.length === 0) return false;

    // If single line paste without list formatting, let standard paste handle it
    if (rawLines.length === 1 && !/^([0-9]+[\.\)]|[-*•+◦▪]|\[[ xX]\])/.test(rawLines[0].trim())) {
      return false;
    }

    // Determine leading spaces to compute indent levels
    const indentSizes = rawLines.map((line) => {
      const match = line.match(/^(\s*)/);
      return match ? match[1].replace(/\t/g, '  ').length : 0;
    });

    const nonZeroIndents = indentSizes.filter((s) => s > 0);
    const minIndentStep = nonZeroIndents.length > 0 ? Math.min(...nonZeroIndents) : 2;
    const stepSize = minIndentStep >= 2 ? minIndentStep : 2;
    const baseIndent = Math.min(...indentSizes);

    const parsedItems = rawLines.map((line) => {
      const rawIndentMatch = line.match(/^(\s*)/);
      const leadingSpaces = rawIndentMatch ? rawIndentMatch[1].replace(/\t/g, '  ').length : 0;
      const normalizedIndent = Math.max(0, leadingSpaces - baseIndent);
      const level = Math.min(Math.floor(normalizedIndent / stepSize), 4);

      let cleanText = line.trim();
      let checked: boolean | undefined = undefined;

      if (/^\[([ xX])\]\s*/.test(cleanText)) {
        const match = cleanText.match(/^\[([ xX])\]\s*/);
        if (match) {
          checked = match[1].toLowerCase() === 'x';
          cleanText = cleanText.replace(/^\[([ xX])\]\s*/, '');
        }
      } else {
        cleanText = cleanText.replace(/^([0-9]+[\.\)]|[-*•+◦▪])\s*/, '');
      }

      return {
        id: createId(),
        content: [{ text: cleanText }] as RichTextValue,
        level,
        ...(checked !== undefined ? { checked } : {}),
      };
    });

    updateBlock(block.id, (b) => {
      const currentItems = (b.attributes.items as any[]) ?? [];
      const idx = currentItems.findIndex((it) => it.id === currentItemId);
      if (idx === -1) {
        return { ...b, attributes: { ...b.attributes, items: [...currentItems, ...parsedItems] } };
      }

      // If current item is empty, replace it with parsed items
      const currentItemText = (currentItems[idx]?.content as any[])?.[0]?.text || '';
      if (!currentItemText.trim()) {
        const updated = [...currentItems.slice(0, idx), ...parsedItems, ...currentItems.slice(idx + 1)];
        return { ...b, attributes: { ...b.attributes, items: updated } };
      }

      // Otherwise insert after current item
      const updated = [...currentItems.slice(0, idx + 1), ...parsedItems, ...currentItems.slice(idx + 1)];
      return { ...b, attributes: { ...b.attributes, items: updated } };
    });

    return true;
  };

  const isChecklist = style === 'checklist';

  return (
    <div className="be-list py-1 my-1 w-full">
      <Tag
        style={{ ...typography }}
        className={`w-full ${
          isChecklist ? 'pl-2 space-y-1.5 list-none' : 'pl-6 space-y-1.5'
        } ${alignClass(align)}`}
      >
        {items.map((item) => {
          const itemLevel = item.level || 0;
          const checked = item.checked || false;

          const currentListStyle = isChecklist
            ? 'none'
            : (itemLevel > 0
              ? (style === 'bullet' ? (itemLevel % 2 === 1 ? 'circle' : 'square') : (itemLevel % 2 === 1 ? 'lower-alpha' : 'lower-roman'))
              : listStyleType);

          if (isChecklist) {
            return (
              <li
                key={item.id}
                data-list-item={item.id}
                style={{ marginLeft: `${itemLevel * 20}px`, listStyleType: 'none' }}
                className="py-0.5 flex items-start gap-2.5"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    updateBlock(block.id, (b) => {
                      const currentItems = (b.attributes.items as any[]) ?? [];
                      return {
                        ...b,
                        attributes: {
                          ...b.attributes,
                          items: currentItems.map((it) =>
                            it.id === item.id ? { ...it, checked: e.target.checked } : it
                          ),
                        },
                      };
                    });
                  }}
                  className="mt-1.5 h-4 w-4 rounded border-gray-300 dark:border-gray-700 text-primary-600 focus:ring-primary-500 cursor-pointer transition-colors shrink-0"
                />
                <RichText
                  value={item.content}
                  onChange={(v) => updateItem(item.id, v)}
                  placeholder="List item"
                  align={align}
                  className={`inline-block w-full min-h-[1.5em] text-base align-top focus:outline-none ${checked ? 'line-through opacity-50 transition-all' : ''}`}
                  tagName="span"
                  style={typography}
                  onEnter={() => handleItemEnter(item.id)}
                  onBackspaceEmpty={() => removeItem(item.id)}
                  onIndent={() => indentItem(item.id)}
                  onOutdent={() => outdentItem(item.id)}
                  onPasteText={(text) => handlePasteListText(text, item.id)}
                  onSlash={(rect) => window.dispatchEvent(new CustomEvent('be-slash', { detail: { blockId: block.id, rect } }))}
                />
              </li>
            );
          }

          return (
            <li
              key={item.id}
              data-list-item={item.id}
              style={{
                listStyleType: currentListStyle,
                listStylePosition: 'outside',
                marginLeft: `${itemLevel * 20}px`,
              }}
              className="py-0.5 pl-1"
            >
              <RichText
                value={item.content}
                onChange={(v) => updateItem(item.id, v)}
                placeholder="List item"
                align={align}
                className="inline-block w-full min-h-[1.5em] text-base align-top focus:outline-none"
                tagName="span"
                style={typography}
                onEnter={() => handleItemEnter(item.id)}
                onBackspaceEmpty={() => removeItem(item.id)}
                onIndent={() => indentItem(item.id)}
                onOutdent={() => outdentItem(item.id)}
                onPasteText={(text) => handlePasteListText(text, item.id)}
                onSlash={(rect) => window.dispatchEvent(new CustomEvent('be-slash', { detail: { blockId: block.id, rect } }))}
              />
            </li>
          );
        })}
      </Tag>
    </div>
  );
}

export function QuoteBlock({ block }: BlockProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const insertBlock = useEditorStore((s) => s.insertBlock);
  const a = block.attributes;
  const typography = getTypographyStyle('quote', a);

  const handleEnter = () => {
    const blocks = useEditorStore.getState().blocks;
    const idx = blocks.findIndex((b) => b.id === block.id);
    const id = insertBlock('paragraph', idx !== -1 ? idx + 1 : null);
    if (id) focusBlock(id);
  };

  return (
    <blockquote className={`be-quote border-l-4 border-primary-500 pl-4 py-3 my-2 ${alignClass(a.align as TextAlign)} bg-gray-50/80 dark:bg-gray-800/40 rounded-r-xl transition-all hover:bg-gray-100/80 dark:hover:bg-gray-800/60`} style={typography}>
      <RichText
        value={a.content as RichTextValue}
        onChange={(v) => updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, content: v } }))}
        placeholder="Write quote…"
        align={a.align as TextAlign}
        className="text-lg italic leading-relaxed text-gray-900 dark:text-gray-100"
        tagName="div"
        style={typography}
        onEnter={handleEnter}
        onBackspaceEmpty={() => handleBlockBackspace(block.id)}
      />
      <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-gray-200/60 dark:border-gray-700/50">
        <span className="text-sm font-bold text-gray-400 dark:text-gray-500 select-none shrink-0">—</span>
        <RichText
          value={a.citation as RichTextValue}
          onChange={(v) => updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, citation: v } }))}
          placeholder="Add quote author / citation name..."
          align={a.align as TextAlign}
          className="text-sm font-bold text-gray-700 dark:text-gray-300 w-full focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:font-normal"
          tagName="cite"
          style={typography}
        />
      </div>
    </blockquote>
  );
}

export { CodeBlock } from './CodeBlock';

export function PreformattedBlock({ block }: BlockProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const a = block.attributes;
  const typography = getTypographyStyle('preformatted', a);
  return (
    <pre className="be-preformatted bg-gray-100 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto font-mono text-sm whitespace-pre-wrap" style={{ textAlign: a.align as TextAlign, ...typography }}>
      <textarea
        value={a.content as string}
        onChange={(e) => updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, content: e.target.value } }))}
        placeholder="Preformatted text…"
        className="w-full bg-transparent outline-none resize-y min-h-[60px] font-mono text-sm"
        style={typography}
      />
    </pre>
  );
}

export function PullquoteBlock({ block }: BlockProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const insertBlock = useEditorStore((s) => s.insertBlock);
  const a = block.attributes;
  const typography = getTypographyStyle('pullquote', a);

  return (
    <figure className={`be-pullquote border-y-4 border-primary-400 dark:border-primary-600 py-6 px-4 my-3 text-center ${alignClass(a.align as TextAlign)} bg-gray-50/50 dark:bg-gray-800/30 rounded-xl`} style={typography}>
      <blockquote style={typography}>
        <RichText
          value={a.content as RichTextValue}
          onChange={(v) => updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, content: v } }))}
          placeholder="Write pull quote…"
          align={a.align as TextAlign}
          className="text-2xl font-semibold leading-snug text-gray-900 dark:text-gray-100"
          tagName="div"
          style={typography}
          onEnter={() => { const id = insertBlock('paragraph', null); if (id) focusBlock(id); }}
          onBackspaceEmpty={() => handleBlockBackspace(block.id)}
        />
      </blockquote>
      <div className="flex items-center justify-center gap-1.5 mt-3 pt-2 border-t border-gray-200/50 dark:border-gray-700/40 max-w-xs mx-auto">
        <span className="text-sm font-bold text-gray-400 dark:text-gray-500 select-none shrink-0">—</span>
        <RichText
          value={a.citation as RichTextValue}
          onChange={(v) => updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, citation: v } }))}
          placeholder="Add quote author / citation name..."
          align={a.align as TextAlign}
          className="text-sm font-bold text-gray-700 dark:text-gray-300 outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:font-normal"
          tagName="figcaption"
          style={typography}
        />
      </div>
    </figure>
  );
}

export function VerseBlock({ block }: BlockProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const insertBlock = useEditorStore((s) => s.insertBlock);
  const removeBlock = useEditorStore((s) => s.removeBlock);
  const a = block.attributes;
  const typography = getTypographyStyle('verse', a);

  return (
    <div className="be-verse-container my-3">
      <pre
        className={`be-verse font-serif text-base sm:text-lg leading-relaxed whitespace-pre-wrap p-4 bg-gray-100/80 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 rounded-xl border border-gray-200/80 dark:border-gray-700/60 shadow-2xs ${alignClass(a.align as TextAlign)} transition-all hover:bg-gray-100 dark:hover:bg-gray-800/70`}
        style={typography}
      >
        <RichText
          value={a.content as RichTextValue}
          onChange={(v) => updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, content: v } }))}
          placeholder={"An apprenticeship in unlearning\nAnd a solitude within the freedom of that convent\nOf which the poets say the stars are its eternal nuns\nAnd the flowers devout penitents for a single day,\nBut where, after all, the stars are just stars\nAnd the flowers are just flowers"}
          align={a.align as TextAlign}
          className="outline-none tracking-wide"
          tagName="div"
          style={typography}
          onEnter={() => { const id = insertBlock('paragraph', null); if (id) focusBlock(id); }}
          onBackspaceEmpty={() => { if (!a.content || (a.content as RichTextValue).length === 0) removeBlock(block.id); }}
        />
      </pre>
    </div>
  );
}
