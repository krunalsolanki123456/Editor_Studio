import { useState } from 'react';
import { Trash2, CopyPlus, ArrowUp, ArrowDown, Pin, GripVertical, Plus } from 'lucide-react';
import { useEditorStore } from './store';
import { getBlockLabel, getBlockIcon } from './blocks/registry';
import type { BlockInstance } from './types';
import BlockRenderer from './blocks/BlockRenderer';
import HtmlCodeEditor from './HtmlCodeEditor';

interface BlockWrapperProps {
  block: BlockInstance;
  index: number;
  total: number;
}

export default function BlockWrapper({ block, index, total }: BlockWrapperProps) {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const isPreviewMode = useEditorStore((s) => s.isPreviewMode);
  const openInserterAtIndex = useEditorStore((s) => s.openInserterAtIndex);
  const htmlModeBlockIds = useEditorStore((s) => s.htmlModeBlockIds);
  const isHtmlMode = htmlModeBlockIds.includes(block.id);
  const selected = selectedIds.includes(block.id);
  const selectBlock = useEditorStore((s) => s.selectBlock);
  const moveBlockToIndex = useEditorStore((s) => s.moveBlockToIndex);
  const moveBlock = useEditorStore((s) => s.moveBlock);
  const duplicateBlock = useEditorStore((s) => s.duplicateBlock);
  const removeBlock = useEditorStore((s) => s.removeBlock);

  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', block.id);
    (e.target as HTMLElement).classList.add('be-dragging');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).classList.remove('be-dragging');
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId && draggedId !== block.id) {
      moveBlockToIndex(draggedId, index);
    }
  };

  const Icon = getBlockIcon(block.type);

  const isMultiSelect = selectedIds.length > 1;
  const isPinnedBlock = Boolean(block.attributes?.pinned);

  let textSnippet = '';
  if (Array.isArray(block.attributes?.content)) {
    textSnippet = block.attributes.content.map((c: any) => c.text || '').join('');
  } else if (typeof block.attributes?.content === 'string') {
    textSnippet = block.attributes.content;
  } else if (Array.isArray(block.attributes?.items)) {
    textSnippet = block.attributes.items
      .map((it: any) => (Array.isArray(it.content) ? it.content.map((c: any) => c.text || '').join('') : String(it.content || '')))
      .filter(Boolean)
      .join(', ');
  }
  if (textSnippet.length > 30) {
    textSnippet = textSnippet.substring(0, 30) + '...';
  }

  const selectedOverlay = selected && !isPreviewMode
    ? (isMultiSelect ? 'bg-primary-500/10 dark:bg-primary-400/15 border border-primary-500/40 dark:border-primary-400/40 rounded-xl shadow-2xs p-1' : '')
    : '';

  const pinnedOverlay = isPinnedBlock && !isPreviewMode
    ? 'ring-2 ring-amber-400 dark:ring-amber-500 rounded-2xl bg-amber-50/40 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-600/60 p-3.5 shadow-md backdrop-blur-2xs transition-all my-2'
    : '';

  const wrapperClasses = 'relative group transition-all mb-2.5 w-full';

  return (
    <div
      data-block-id={block.id}
      className={`${wrapperClasses} ${selected && !isPreviewMode ? 'z-20 ' + selectedOverlay : ''} ${pinnedOverlay} ${isDragOver && !isPreviewMode ? 'border-t-2 border-primary-500' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={(e) => {
        if (isPreviewMode) return;
        e.stopPropagation();
        if (!selected) {
          selectBlock(block.id, e.shiftKey);
        }
      }}
      onFocusCapture={() => {
        if (!selected) {
          selectBlock(block.id);
        }
      }}
    >
      {/* Above-block inserter: only on desktop when block is selected */}
      {!isPreviewMode && !isMultiSelect && selected && (
        <div className="hidden sm:flex absolute -top-3.5 left-1/2 -translate-x-1/2 opacity-0 hover:opacity-100 transition-opacity z-40 items-center justify-center">
          <button
            type="button"
            title="Insert block above"
            onClick={(e) => {
              e.stopPropagation();
              openInserterAtIndex(index);
            }}
            className="h-6 px-2.5 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950/40 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-1 shadow-sm transition-all cursor-pointer text-[10px] font-extrabold hover:scale-105"
          >
            <Plus size={12} />
            <span>Above</span>
          </button>
        </div>
      )}

      {/* Visual Highlight Badge when Text/Block is Pinned */}
      {!isPreviewMode && isPinnedBlock && (
        <div className="mb-2.5 flex items-center gap-2 text-xs font-bold tracking-wide text-amber-900 dark:text-amber-100 bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 dark:from-amber-900 dark:via-amber-950 dark:to-amber-900 border-2 border-amber-400 dark:border-amber-600 px-3.5 py-1.5 rounded-xl shadow-md select-none w-fit">
          <Pin size={14} className="rotate-45 text-amber-700 dark:text-amber-300 animate-bounce shrink-0" />
          <span className="text-amber-800 dark:text-amber-300 font-extrabold uppercase text-[10px] tracking-wider bg-amber-300/60 dark:bg-amber-800/60 px-1.5 py-0.5 rounded">📌 PINNED TEXT</span>
          <span className="font-extrabold text-amber-950 dark:text-amber-50 underline decoration-amber-500 text-sm">
            "{textSnippet || getBlockLabel(block.type)}"
          </span>
        </div>
      )}

      {/* Action Control Badge for Block - Fixed Ultra-Slim Single-Line Height on ALL screens */}
      {!isPreviewMode && !isMultiSelect && selected && (
        <div className="absolute -top-3.5 right-1 sm:right-3 max-w-[calc(100vw-20px)] h-7 sm:h-8 flex items-center flex-nowrap shrink-0 whitespace-nowrap gap-0.5 sm:gap-1 bg-slate-900/95 text-white backdrop-blur-md border border-white/20 rounded-full px-2 sm:px-2.5 shadow-xl z-50 ring-2 ring-blue-500/80 pointer-events-auto select-none animate-in fade-in zoom-in-95 duration-150">
          {/* Drag Handle Icon */}
          <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className="h-5 w-5 flex items-center justify-center rounded text-gray-300 hover:text-white hover:bg-white/20 cursor-grab active:cursor-grabbing transition-colors shrink-0"
            title="Drag to reorder block"
          >
            <GripVertical size={12} />
          </div>

          <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-gray-200 pr-1 sm:pr-1.5 border-r border-white/20 select-none shrink-0 h-4 leading-none">
            <Icon size={12} className="text-blue-400 shrink-0" />
            <span className="hidden xs:inline max-w-[70px] sm:max-w-none truncate">{getBlockLabel(block.type)}</span>
          </span>

          {/* 1-Click Add Above & Below Buttons in Toolbar */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openInserterAtIndex(index);
            }}
            className="h-5 px-1 sm:px-1.5 rounded text-[10px] font-bold text-gray-300 hover:text-blue-300 hover:bg-white/15 cursor-pointer transition-colors flex items-center gap-0.5 shrink-0"
            title="Insert block above"
          >
            <Plus size={10} />
            <span className="hidden sm:inline">Above</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openInserterAtIndex(index + 1);
            }}
            className="h-5 px-1 sm:px-1.5 rounded text-[10px] font-bold text-gray-300 hover:text-blue-300 hover:bg-white/15 cursor-pointer transition-colors flex items-center gap-0.5 pr-1 sm:pr-1.5 border-r border-white/20 shrink-0"
            title="Insert block below"
          >
            <Plus size={10} />
            <span className="hidden sm:inline">Below</span>
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'up'); }}
            disabled={index === 0}
            className="h-5 w-5 flex items-center justify-center rounded text-gray-300 hover:text-white hover:bg-white/20 disabled:opacity-20 cursor-pointer transition-colors shrink-0"
            title="Move Up"
          >
            <ArrowUp size={12} />
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'down'); }}
            disabled={index === total - 1}
            className="h-5 w-5 flex items-center justify-center rounded text-gray-300 hover:text-white hover:bg-white/20 disabled:opacity-20 cursor-pointer transition-colors shrink-0"
            title="Move Down"
          >
            <ArrowDown size={12} />
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }}
            className="h-5 w-5 flex items-center justify-center rounded text-gray-300 hover:text-blue-300 hover:bg-blue-500/20 cursor-pointer transition-colors shrink-0"
            title="Duplicate"
          >
            <CopyPlus size={12} />
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}
            className="h-5 w-5 flex items-center justify-center rounded text-gray-300 hover:text-red-400 hover:bg-red-500/20 cursor-pointer transition-colors shrink-0"
            title="Delete Block"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

      {isHtmlMode ? <HtmlCodeEditor block={block} /> : <BlockRenderer block={block} selected={!isPreviewMode && selected} />}

      {/* Below-block inserter: only when block is selected */}
      {!isPreviewMode && !isMultiSelect && selected && (
        <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 opacity-0 hover:opacity-100 transition-opacity z-40 flex items-center justify-center">
          <button
            type="button"
            title="Insert block below / નીચે બ્લોક ઉમેરો"
            onClick={(e) => {
              e.stopPropagation();
              openInserterAtIndex(index + 1);
            }}
            className="h-6 px-2.5 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950/40 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-1 shadow-sm transition-all cursor-pointer text-[10px] font-extrabold hover:scale-105"
          >
            <Plus size={12} />
            <span>Below</span>
          </button>
        </div>
      )}
    </div>
  );
}

