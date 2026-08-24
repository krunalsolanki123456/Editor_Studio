import { useState, useEffect, useMemo, useRef } from 'react';
import { getBlockIcon, createBlock, getFilteredBlockDefinitions, getBlockLabel } from './blocks/registry';
import { useEditorStore } from './store';
import { blockToHtmlCode } from './utils';
import { Lock } from 'lucide-react';
import type { UpgradeRequiredPayload } from './permissions/types';
import { getBlockAccessStatus, getUpgradePlan } from './permissions/permissionEngine';

interface SlashMenuProps {
  open: boolean;
  blockId: string | null;
  anchor: { x: number; y: number } | null;
  onClose: () => void;
  onUpgradeRequired?: (payload: UpgradeRequiredPayload) => void;
}

export default function SlashMenu({ open, blockId, anchor, onClose, onUpgradeRequired }: SlashMenuProps) {
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const insertBlock = useEditorStore((s) => s.insertBlock);
  const removeBlock = useEditorStore((s) => s.removeBlock);
  const blocks = useEditorStore((s) => s.blocks);
  const filterOptions = useEditorStore((s) => s.filterOptions);
  const currentPlan = useEditorStore((s) => s.currentPlan);
  const blockPermissions = useEditorStore((s) => s.blockPermissions);
  const listRef = useRef<HTMLDivElement>(null);

  const availableDefinitions = useMemo(() => {
    return getFilteredBlockDefinitions(filterOptions);
  }, [filterOptions]);

  useEffect(() => {
    if (open) { setQuery(''); setHighlighted(0); }
  }, [open]);

  const filtered = useMemo(() => {
    const defs = availableDefinitions.filter((b) => {
      // Hide globally disabled blocks from slash menu
      const status = getBlockAccessStatus(b.type, currentPlan, blockPermissions);
      return status !== 'disabled';
    });
    if (!query.trim()) return defs;
    const q = query.toLowerCase();
    return defs.filter((b) =>
      b.label.toLowerCase().includes(q) || b.keywords.some((k: string) => k.includes(q)),
    );
  }, [availableDefinitions, query, currentPlan, blockPermissions]);

  useEffect(() => { setHighlighted(0); }, [query]);

  if (!open || !anchor) return null;

  const handleSelect = (type: string) => {
    // ── Permission Check ──────────────────────────────────────────────────────
    const accessStatus = getBlockAccessStatus(type, currentPlan, blockPermissions);
    if (accessStatus === 'locked') {
      const requiredPlan = currentPlan
        ? getUpgradePlan(type, currentPlan, blockPermissions)
        : null;
      if (onUpgradeRequired) {
        onUpgradeRequired({
          blockType: type,
          blockLabel: getBlockLabel(type),
          currentPlan: currentPlan ?? 'free',
          requiredPlan: requiredPlan ?? 'pro',
        });
      }
      onClose();
      return; // DO NOT insert
    }
    if (accessStatus === 'disabled') {
      onClose();
      return; // Silently rejected
    }
    // ─────────────────────────────────────────────────────────────────────────

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
          const accessStatus = getBlockAccessStatus(block.type, currentPlan, blockPermissions);
          const isLocked = accessStatus === 'locked';
          const reqPlan = isLocked && currentPlan
            ? getUpgradePlan(block.type, currentPlan, blockPermissions)
            : null;

          return (
            <button key={block.type} onClick={() => handleSelect(block.type)} onMouseEnter={() => setHighlighted(i)}
              className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${i === highlighted ? 'bg-primary-50 dark:bg-primary-900/30' : ''}`}>
              <div className={`w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 ${
                isLocked
                  ? 'bg-amber-100 dark:bg-amber-950/50'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                {isLocked
                  ? <Lock size={14} className="text-amber-500 dark:text-amber-400" />
                  : <Icon size={16} className="text-gray-500 dark:text-gray-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium truncate">{block.label}</span>
                  {reqPlan && (
                    <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded leading-none ${
                      reqPlan === 'enterprise'
                        ? 'bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400'
                        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                    }`}>
                      {reqPlan}
                    </span>
                  )}
                </div>
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
