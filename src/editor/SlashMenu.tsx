import { useState, useEffect, useMemo, useRef } from 'react';
import { getBlockIcon, createBlock, getFilteredBlockDefinitions } from './blocks/registry';
import { useEditorStore } from './store';
import { blockToHtmlCode } from './utils';

interface SlashMenuProps {
  open: boolean;
  blockId: string | null;
  anchor: { x: number; y: number } | null;
  onClose: () => void;
}

export default function SlashMenu({ open, blockId, anchor, onClose }: SlashMenuProps) {
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const insertBlock = useEditorStore((s) => s.insertBlock);
  const removeBlock = useEditorStore((s) => s.removeBlock);
  const blocks = useEditorStore((s) => s.blocks);
  const filterOptions = useEditorStore((s) => s.filterOptions);
  const listRef = useRef<HTMLDivElement>(null);

  const availableDefinitions = useMemo(() => {
    return getFilteredBlockDefinitions(filterOptions);
  }, [filterOptions]);

  useEffect(() => {
    if (open) { setQuery(''); setHighlighted(0); }
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return availableDefinitions;
    const q = query.toLowerCase();
    return availableDefinitions.filter((b) =>
      b.label.toLowerCase().includes(q) || b.keywords.some((k: string) => k.includes(q)),
    );
  }, [availableDefinitions, query]);

  useEffect(() => { setHighlighted(0); }, [query]);

  if (!open || !anchor) return null;

  const handleSelect = (type: string) => {
    const blockIndex = blocks.findIndex((b) => b.id === blockId);
    let insertIndex = blockIndex;

    if (blockId && blockIndex !== -1) {
      const currentBlock = blocks[blockIndex];

      // Check if current block has real content beyond just "/"
      const hasContent = (() => {
        if (Array.isArray(currentBlock.attributes?.content)) {
          const text = (currentBlock.attributes.content as any[]).map((s: any) => s.text ?? '').join('').replace('/', '').trim();
          return text.length > 0;
        }
        if (typeof currentBlock.attributes?.content === 'string') {
          return currentBlock.attributes.content.replace('/', '').trim().length > 0;
        }
        return false;
      })();

      if (type === 'code' || type === 'preformatted') {
        const codeText = blockToHtmlCode(currentBlock);
        useEditorStore.getState().updateBlock(blockId, (b) => ({
          ...b,
          type,
          attributes: { ...createBlock(type)?.attributes, content: codeText },
        }));
        onClose();
        return;
      }

      if (hasContent) {
        // Insert after current block, don't remove it
        insertIndex = blockIndex + 1;
      } else {
        // Empty block — replace it
        removeBlock(blockId);
      }
    }
    const newId = insertBlock(type, insertIndex);
    onClose();
    if (newId) {
      setTimeout(() => {
        const el = document.querySelector(
          `[data-block-id="${newId}"] [contenteditable], [data-block-id="${newId}"] textarea, [data-block-id="${newId}"] input`
        ) as HTMLElement | null;
        if (el) el.focus();
      }, 30);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[highlighted]) handleSelect(filtered[highlighted].type); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  return (
    <div className="fixed z-50 w-72 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-scale-in"
      style={{
        left: Math.max(12, Math.min(anchor.x, window.innerWidth - 300)),
        top: Math.max(10, Math.min(anchor.y + 10, window.innerHeight - 340)),
      }}>
      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
        <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown}
          placeholder="Search for a block…"
          className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 outline-none text-sm focus:ring-2 focus:ring-primary-500" />
      </div>
      <div ref={listRef} className="max-h-72 overflow-y-auto be-scroll p-1">
        {filtered.map((block, i) => {
          const Icon = getBlockIcon(block.type);
          return (
            <button key={block.type} onClick={() => handleSelect(block.type)} onMouseEnter={() => setHighlighted(i)}
              className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${i === highlighted ? 'bg-primary-50 dark:bg-primary-900/30' : ''}`}>
              <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                <Icon size={16} className="text-gray-500 dark:text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{block.label}</div>
                <div className="text-xs text-gray-400 truncate">{block.description}</div>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && <div className="text-center text-sm text-gray-400 py-4">No blocks found</div>}
      </div>
    </div>
  );
}
