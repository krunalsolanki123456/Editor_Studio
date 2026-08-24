import { useState, useContext, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Columns, Layout, GripVertical, ArrowUp, ArrowDown,
  Copy, CopyPlus, Trash2, Ungroup, MoveHorizontal, MoveVertical,
  Check, ChevronDown, Repeat, ArrowLeftRight
} from 'lucide-react';
import type { BlockInstance } from '../types';
import { useEditorStore } from '../store';
import BlockWrapper from '../BlockWrapper';
import { NestedBlockContext } from '../NestedBlockContext';
import { useResponsive } from '../responsive';
import { createId } from '../utils';

interface BlockProps {
  block: BlockInstance;
  selected: boolean;
}

function focusBlock(id: string) {
  setTimeout(() => {
    (document.querySelector(`[data-block-id="${id}"] [contenteditable]`) as HTMLElement | null)?.focus();
  }, 10);
}

// ==========================================
// COLUMN BLOCK
// ==========================================

export function ColumnBlock({ block, selected = false }: BlockProps) {
  const inner = block.innerBlocks ?? [];
  const insertBlockInto = useEditorStore((s) => s.insertBlockInto);
  const selectBlock = useEditorStore((s) => s.selectBlock);

  const parentContext = useContext(NestedBlockContext);
  const isCover = parentContext.isCover;
  const a = block.attributes || {};

  // Column specific styling
  const isEmpty = inner.length === 0;
  const paddingPx = typeof a.padding === 'number' ? `${a.padding}px` : (a.padding as string) || (isEmpty ? '12px' : '0px');
  const gapPx = typeof a.gap === 'number' ? `${a.gap}px` : (a.gap as string) || '12px';
  const borderRadius = typeof a.borderRadius === 'number' ? `${a.borderRadius}px` : (a.borderRadius as string) || '12px';
  const bgStyle = (a.backgroundColor as string) || 'transparent';
  const borderW = typeof a.borderWidth === 'number' ? `${a.borderWidth}px` : (a.borderWidth as string) || '1px';

  // Per specification: "Columns should have subtle dashed borders ONLY when empty. Hide borders once blocks are added."
  const borderStyle = isEmpty
    ? `${borderW} dashed ${isCover ? 'rgba(255, 255, 255, 0.3)' : 'rgba(203, 213, 225, 0.9)'}`
    : (a.borderWidth ? `${borderW} ${a.borderStyle || 'solid'} ${a.borderColor || '#e2e8f0'}` : 'none');

  const containerStyle: React.CSSProperties = {
    padding: paddingPx,
    gap: gapPx,
    borderRadius,
    background: bgStyle,
    border: borderStyle,
    boxShadow: (a.shadow as string) || undefined,
    minHeight: (a.minHeight as string) || (isEmpty ? '110px' : 'auto'),
    maxWidth: (a.maxWidth as string) || '100%',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: (a.verticalAlign as string) || 'flex-start',
    alignItems: (a.horizontalAlign as string) || 'stretch',
    boxSizing: 'border-box',
  };

  return (
    <div
      className={`be-column group/col relative transition-all duration-200 w-full ${selected ? 'ring-2 ring-blue-500 rounded-xl' : ''
        }`}
      style={containerStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          selectBlock(block.id);
        }
      }}
    >
      <NestedBlockContext.Provider value={{ isNested: true, isCover }}>
        {inner.length > 0 ? (
          <div
            className="flex flex-col w-full max-w-full"
            style={{ gap: gapPx }}
          >
            {inner.map((b, idx) => (
              <BlockWrapper
                key={b.id}
                block={b}
                index={idx}
                total={inner.length}
              />
            ))}
          </div>
        ) : (
          /* SUBTLE EMPTY COLUMN AFFORDANCE */
          <div
            className="flex-1 flex flex-col items-center justify-center p-3 text-center w-full min-h-[80px] cursor-pointer hover:bg-slate-500/5 rounded-lg transition-colors group/empty select-none"
            onClick={(e) => {
              e.stopPropagation();
              const id = insertBlockInto(block.id, 'paragraph');
              if (id) focusBlock(id);
            }}
          >
            <button
              type="button"
              title="Add block"
              className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover/empty:text-blue-500 group-hover/empty:bg-blue-50 dark:group-hover/empty:bg-blue-950/40 border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-all cursor-pointer"
            >
              <Plus size={13} />
            </button>
          </div>
        )}
      </NestedBlockContext.Provider>
    </div>
  );
}

export function ColumnsBlock({ block }: BlockProps) {
  const a = block.attributes;
  const cols = (a.columns as number) || 2;
  const layoutRatio = (a.layoutRatio as string) || 'equal';
  const layoutMode = (a.layoutMode as string) || 'grid';
  const flexDirection = (a.flexDirection as string) || 'row';
  const alignItems = (a.alignItems as string) || 'stretch';
  const justifyContent = (a.justifyContent as string) || 'flex-start';
  const gapPx = typeof a.gap === 'number' ? a.gap : (a.gap ? parseInt(String(a.gap), 10) : 20);

  const { isMobile, isTablet } = useResponsive();
  const inner = block.innerBlocks ?? [];

  let gridColumnsCss = `repeat(${cols}, minmax(0, 1fr))`;
  if (layoutRatio === '70-30' && cols === 2) {
    gridColumnsCss = '7fr 3fr';
  } else if (layoutRatio === '30-70' && cols === 2) {
    gridColumnsCss = '3fr 7fr';
  }

  if (isMobile) {
    gridColumnsCss = '1fr';
  } else if (isTablet && cols > 2) {
    gridColumnsCss = `repeat(2, minmax(0, 1fr))`;
  }

  const containerStyle: React.CSSProperties = layoutMode === 'flex'
    ? {
      display: 'flex',
      flexDirection: (isMobile ? 'column' : flexDirection) as React.CSSProperties['flexDirection'],
      alignItems: alignItems as React.CSSProperties['alignItems'],
      justifyContent: justifyContent as React.CSSProperties['justifyContent'],
      flexWrap: 'wrap',
      gap: isMobile ? '16px' : isTablet ? '16px' : `${gapPx}px`,
      width: '100%',
      maxWidth: '1200px',
      margin: '0 auto',
    }
    : {
      display: 'grid',
      gridTemplateColumns: gridColumnsCss,
      gap: isMobile ? '16px' : isTablet ? '16px' : `${gapPx}px`,
      width: '100%',
      maxWidth: '1200px',
      margin: '0 auto',
    };

  return (
    <div className={`be-columns be-columns-grid w-full max-w-[1200px] mx-auto ${layoutMode === 'flex' ? 'flex flex-wrap' : 'grid'}`} style={containerStyle}>
      {inner.map((col) => (
        <ColumnBlock key={col.id} block={col} selected={false} />
      ))}
    </div>
  );
}

const GROUP_LAYOUT_PRESETS = [
  {
    id: 'single',
    title: 'Single Column',
    desc: '1 Full Width Column',
    icon: (
      <svg width="40" height="28" viewBox="0 0 40 28" fill="none" className="stroke-current">
        <rect x="2" y="2" width="36" height="24" rx="4" strokeWidth="1.5" fill="none" />
      </svg>
    ),
  },
  {
    id: '50-50',
    title: 'Two Columns',
    desc: '50% / 50% Split',
    icon: (
      <svg width="40" height="28" viewBox="0 0 40 28" fill="none" className="stroke-current">
        <rect x="2" y="2" width="16" height="24" rx="4" strokeWidth="1.5" fill="none" />
        <rect x="22" y="2" width="16" height="24" rx="4" strokeWidth="1.5" fill="none" />
      </svg>
    ),
  },
  {
    id: '70-30',
    title: '70 / 30 Split',
    desc: 'Wide Left + Narrow Right',
    icon: (
      <svg width="40" height="28" viewBox="0 0 40 28" fill="none" className="stroke-current">
        <rect x="2" y="2" width="24" height="24" rx="4" strokeWidth="1.5" fill="none" />
        <rect x="29" y="2" width="9" height="24" rx="4" strokeWidth="1.5" fill="none" />
      </svg>
    ),
  },
  {
    id: '30-70',
    title: '30 / 70 Split',
    desc: 'Narrow Left + Wide Right',
    icon: (
      <svg width="40" height="28" viewBox="0 0 40 28" fill="none" className="stroke-current">
        <rect x="2" y="2" width="9" height="24" rx="4" strokeWidth="1.5" fill="none" />
        <rect x="14" y="2" width="24" height="24" rx="4" strokeWidth="1.5" fill="none" />
      </svg>
    ),
  },
  {
    id: 'three',
    title: 'Three Columns',
    desc: '3 Equal Columns',
    icon: (
      <svg width="40" height="28" viewBox="0 0 40 28" fill="none" className="stroke-current">
        <rect x="2" y="2" width="10" height="24" rx="3" strokeWidth="1.5" fill="none" />
        <rect x="15" y="2" width="10" height="24" rx="3" strokeWidth="1.5" fill="none" />
        <rect x="28" y="2" width="10" height="24" rx="3" strokeWidth="1.5" fill="none" />
      </svg>
    ),
  },
  {
    id: 'four',
    title: 'Four Columns',
    desc: '4 Equal Columns',
    icon: (
      <svg width="40" height="28" viewBox="0 0 40 28" fill="none" className="stroke-current">
        <rect x="2" y="2" width="7" height="24" rx="2" strokeWidth="1.5" fill="none" />
        <rect x="11" y="2" width="7" height="24" rx="2" strokeWidth="1.5" fill="none" />
        <rect x="20" y="2" width="7" height="24" rx="2" strokeWidth="1.5" fill="none" />
        <rect x="29" y="2" width="7" height="24" rx="2" strokeWidth="1.5" fill="none" />
      </svg>
    ),
  },
];

export function GroupBlock({ block, selected = false }: BlockProps) {
  const inner = block.innerBlocks ?? [];
  const insertBlockInto = useEditorStore((s) => s.insertBlockInto);
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const moveBlock = useEditorStore((s) => s.moveBlock);
  const duplicateBlock = useEditorStore((s) => s.duplicateBlock);
  const removeBlock = useEditorStore((s) => s.removeBlock);
  const copyBlocks = useEditorStore((s) => s.copyBlocks);
  const ungroupSelectedBlocks = useEditorStore((s) => s.ungroupSelectedBlocks);
  const selectBlock = useEditorStore((s) => s.selectBlock);
  const { isMobile, isTablet } = useResponsive();

  const [isEditing, setIsEditing] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);
  const layoutBtnRef = useRef<HTMLButtonElement>(null);

  const toggleLayoutMenu = () => {
    if (!showLayoutMenu && layoutBtnRef.current) {
      const rect = layoutBtnRef.current.getBoundingClientRect();
      setMenuCoords({
        top: rect.bottom + 8,
        left: Math.max(12, Math.min(rect.left, window.innerWidth - 260)),
      });
      setShowLayoutMenu(true);
    } else {
      setShowLayoutMenu(false);
    }
  };

  useEffect(() => {
    if (!showLayoutMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (layoutBtnRef.current && !layoutBtnRef.current.contains(e.target as Node)) {
        setShowLayoutMenu(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [showLayoutMenu]);

  const a = block.attributes || {};

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isEditing) {
        setIsEditing(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing]);

  const paddingPx = isMobile ? '12px' : isTablet ? '16px' : typeof a.padding === 'number' ? `${a.padding}px` : (a.padding as string) || '24px';
  const gapPx = isMobile ? '12px' : typeof a.gap === 'number' ? `${a.gap}px` : (a.gap as string) || '16px';
  const borderRadius = typeof a.borderRadius === 'number' ? `${a.borderRadius}px` : (a.borderRadius as string) || '20px';
  const bgStyle = (a.gradient as string) || (a.backgroundColor as string) || '#ffffff';
  const borderW = typeof a.borderWidth === 'number' ? `${a.borderWidth}px` : (a.borderWidth as string) || '1px';
  const borderC = (a.borderColor as string) || (selected ? '#2563eb' : 'rgba(226, 232, 240, 0.9)');

  const containerStyle: React.CSSProperties = {
    padding: paddingPx,
    gap: gapPx,
    borderRadius,
    background: bgStyle,
    border: `${borderW} ${a.borderStyle || 'solid'} ${borderC}`,
    boxShadow: (a.shadow as string) || '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
    minHeight: (a.minHeight as string) || 'auto',
    maxWidth: '100%',
    width: '100%',
    display: (a.display as string) || 'flex',
    flexDirection: (isMobile ? 'column' : (a.flexDirection as string) || 'column') as React.CSSProperties['flexDirection'],
    alignItems: (a.alignItems as string) || 'stretch',
    justifyContent: (a.justifyContent as string) || 'flex-start',
    flexWrap: (a.flexWrap as React.CSSProperties['flexWrap']) || 'nowrap',
    overflow: (a.overflow as React.CSSProperties['overflow']) || 'visible',
    boxSizing: 'border-box',
  };

  const applyPreset = (presetId: string) => {
    if (presetId === 'single') {
      const pId = insertBlockInto(block.id, 'paragraph');
      if (pId) focusBlock(pId);
      return;
    }

    let cols = 2;
    let layoutRatio = 'equal';
    if (presetId === '50-50') { cols = 2; layoutRatio = 'equal'; }
    else if (presetId === '70-30') { cols = 2; layoutRatio = '70-30'; }
    else if (presetId === '30-70') { cols = 2; layoutRatio = '30-70'; }
    else if (presetId === 'three') { cols = 3; layoutRatio = 'equal'; }
    else if (presetId === 'four') { cols = 4; layoutRatio = 'equal'; }

    const columnBlocks: BlockInstance[] = Array.from({ length: cols }, () => ({
      id: createId(),
      type: 'column',
      attributes: {},
      innerBlocks: [],
    }));

    const columnsBlock: BlockInstance = {
      id: createId(),
      type: 'columns',
      attributes: { columns: cols, layoutRatio },
      innerBlocks: columnBlocks,
    };

    updateBlock(block.id, (b) => ({
      ...b,
      innerBlocks: [columnsBlock],
    }));
  };

  return (
    <div
      className={`be-group relative transition-all duration-200 rounded-2xl w-full max-w-full ${selected
        ? 'ring-2 ring-blue-500 border-blue-500 shadow-xl z-20'
        : 'hover:border-blue-400 dark:hover:border-blue-500'
        }`}
      style={containerStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          selectBlock(block.id);
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
        selectBlock(block.id);
      }}
    >
      {/* FLOATING GLASSMORPHISM GROUP/COLUMN TOOLBAR */}
      {selected && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 max-w-[calc(100vw-24px)] bg-slate-900/95 dark:bg-slate-900/95 text-white backdrop-blur-md border border-slate-700/80 rounded-full px-2.5 xs:px-3 py-1 xs:py-1.5 shadow-2xl flex items-center gap-0.5 xs:gap-1 z-50 pointer-events-auto transition-all animate-fade-in whitespace-nowrap overflow-x-auto no-scrollbar">
          <div className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-white shrink-0" title="Drag Group">
            <GripVertical size={14} />
          </div>
          <div className="w-px h-4 bg-slate-700 mx-0.5 shrink-0" />
          <button
            type="button"
            onClick={() => moveBlock(block.id, 'up')}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Move Up"
          >
            <ArrowUp size={13} />
          </button>
          <button
            type="button"
            onClick={() => moveBlock(block.id, 'down')}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Move Down"
          >
            <ArrowDown size={13} />
          </button>
          <div className="w-px h-4 bg-slate-700 mx-0.5 shrink-0" />
          <button
            type="button"
            onClick={() => {
              const currentDir = (a.flexDirection as string) || 'column';
              const nextDir = currentDir === 'row' ? 'column' : 'row';
              updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, flexDirection: nextDir } }));
            }}
            className={`p-1 px-1.5 xs:px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${(a.flexDirection as string) === 'row'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            title="Toggle Flex Direction (Row / Column)"
          >
            {(a.flexDirection as string) === 'row' ? <MoveHorizontal size={13} /> : <MoveVertical size={13} />}
            <span>{(a.flexDirection as string) === 'row' ? 'Row' : 'Column'}</span>
          </button>

          <div className="relative shrink-0">
            <button
              ref={layoutBtnRef}
              type="button"
              onClick={toggleLayoutMenu}
              className="p-1 px-1.5 xs:px-2 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              title="Layout Presets"
            >
              <Layout size={13} />
              <span>Layout</span>
              <ChevronDown size={11} />
            </button>

            {showLayoutMenu && menuCoords && typeof document !== 'undefined' && createPortal(
              <div
                style={{
                  position: 'fixed',
                  top: `${menuCoords.top}px`,
                  left: `${menuCoords.left}px`,
                  zIndex: 9999999,
                }}
                className="w-60 max-w-[calc(100vw-2rem)] p-2 bg-[#0f172a] text-slate-100 border border-slate-700/90 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] grid grid-cols-1 gap-1 animate-in fade-in zoom-in-95 duration-100"
              >
                {GROUP_LAYOUT_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      applyPreset(p.id);
                      setShowLayoutMenu(false);
                    }}
                    className="flex items-center gap-2 p-2 rounded-xl text-xs text-slate-200 hover:text-white hover:bg-slate-800 text-left transition-colors cursor-pointer"
                  >
                    <span className="text-blue-400">{p.icon}</span>
                    <div className="min-w-0">
                      <span className="font-bold block truncate">{p.title}</span>
                      <span className="text-[10px] text-slate-400 block truncate">{p.desc}</span>
                    </div>
                  </button>
                ))}
              </div>,
              document.body
            )}
          </div>

          <div className="w-px h-4 bg-slate-700 mx-0.5 shrink-0" />

          <button
            type="button"
            onClick={() => duplicateBlock(block.id)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Duplicate Group"
          >
            <CopyPlus size={13} />
          </button>

          <button
            type="button"
            onClick={() => copyBlocks([block.id])}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Copy Group"
          >
            <Copy size={13} />
          </button>

          <button
            type="button"
            onClick={() => ungroupSelectedBlocks()}
            className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Ungroup (Ctrl+Shift+G)"
          >
            <Ungroup size={13} />
          </button>

          <button
            type="button"
            onClick={() => removeBlock(block.id)}
            className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Delete Group"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}

      <NestedBlockContext.Provider value={{ isNested: true, isCover: false }}>
        {inner.length > 0 ? (
          <div className="flex flex-col w-full max-w-full" style={{ gap: gapPx }}>
            {inner.map((b, idx) => (
              <BlockWrapper key={b.id} block={b} index={idx} total={inner.length} />
            ))}
          </div>
        ) : (
          <div
            className="py-6 px-4 text-center w-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-500/5 rounded-xl transition-colors group/empty select-none"
            onClick={(e) => {
              e.stopPropagation();
              const id = insertBlockInto(block.id, 'paragraph');
              if (id) focusBlock(id);
            }}
          >
            <button
              type="button"
              title="Add block"
              className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover/empty:text-blue-500 group-hover/empty:bg-blue-50 dark:group-hover/empty:bg-blue-950/40 border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-all cursor-pointer mb-1"
            >
              <Plus size={13} />
            </button>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Empty group · Click or type <kbd className="px-1 py-0.5 font-mono text-[10px] bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-500">/</kbd>
            </span>
          </div>
        )}
      </NestedBlockContext.Provider>


    </div>
  );
}

// ==========================================
// ROW BLOCK (Horizontal Container with Columns & Presets)
// ==========================================

const ROW_PRESETS = [
  {
    id: '100',
    title: '1 Column (100%)',
    desc: 'Single full width column',
    cols: 1,
    ratios: ['100%'],
    flexValues: ['1 1 100%'],
  },
  {
    id: '50-50',
    title: '50 / 50',
    desc: '2 Equal Columns',
    cols: 2,
    ratios: ['50%', '50%'],
    flexValues: ['1 1 0%', '1 1 0%'],
  },
  {
    id: '70-30',
    title: '70 / 30',
    desc: '70% Left + 30% Right',
    cols: 2,
    ratios: ['70%', '30%'],
    flexValues: ['7 1 0%', '3 1 0%'],
  },
  {
    id: '30-70',
    title: '30 / 70',
    desc: '30% Left + 70% Right',
    cols: 2,
    ratios: ['30%', '70%'],
    flexValues: ['3 1 0%', '7 1 0%'],
  },
  {
    id: '33-33-33',
    title: '33 / 33 / 33',
    desc: '3 Equal Columns',
    cols: 3,
    ratios: ['33.33%', '33.33%', '33.33%'],
    flexValues: ['1 1 0%', '1 1 0%', '1 1 0%'],
  },
  {
    id: '25-25-25-25',
    title: '25 / 25 / 25 / 25',
    desc: '4 Equal Columns',
    cols: 4,
    ratios: ['25%', '25%', '25%', '25%'],
    flexValues: ['1 1 0%', '1 1 0%', '1 1 0%', '1 1 0%'],
  },
  {
    id: '40-30-30',
    title: '40 / 30 / 30',
    desc: '40% + 30% + 30%',
    cols: 3,
    ratios: ['40%', '30%', '30%'],
    flexValues: ['4 1 0%', '3 1 0%', '3 1 0%'],
  },
  {
    id: '20-40-40',
    title: '20 / 40 / 40',
    desc: '20% + 40% + 40%',
    cols: 3,
    ratios: ['20%', '40%', '40%'],
    flexValues: ['2 1 0%', '4 1 0%', '4 1 0%'],
  },
];

export function RowBlock({ block, selected = false }: BlockProps) {
  const inner = block.innerBlocks ?? [];
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const moveBlock = useEditorStore((s) => s.moveBlock);
  const duplicateBlock = useEditorStore((s) => s.duplicateBlock);
  const removeBlock = useEditorStore((s) => s.removeBlock);
  const copyBlocks = useEditorStore((s) => s.copyBlocks);
  const selectBlock = useEditorStore((s) => s.selectBlock);
  const insertBlockInto = useEditorStore((s) => s.insertBlockInto);
  const { isMobile, isTablet } = useResponsive();

  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);
  const layoutBtnRef = useRef<HTMLButtonElement>(null);

  const toggleLayoutMenu = () => {
    if (!showLayoutMenu && layoutBtnRef.current) {
      const rect = layoutBtnRef.current.getBoundingClientRect();
      setMenuCoords({
        top: rect.bottom + 8,
        left: Math.max(12, Math.min(rect.left, window.innerWidth - 270)),
      });
      setShowLayoutMenu(true);
    } else {
      setShowLayoutMenu(false);
    }
  };

  useEffect(() => {
    if (!showLayoutMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (layoutBtnRef.current && !layoutBtnRef.current.contains(e.target as Node)) {
        setShowLayoutMenu(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [showLayoutMenu]);

  const a = block.attributes || {};

  // Ensure row always has columns by default
  useEffect(() => {
    if (inner.length === 0) {
      updateBlock(block.id, (b) => ({
        ...b,
        innerBlocks: [
          { id: createId(), type: 'column', attributes: { widthRatio: '50%', flex: '1 1 0%' }, innerBlocks: [] },
          { id: createId(), type: 'column', attributes: { widthRatio: '50%', flex: '1 1 0%' }, innerBlocks: [] },
        ],
      }));
    }
  }, [inner.length, block.id, updateBlock]);

  // Keyboard shortcut handlers for Row (Ctrl+D duplicate, Delete remove, Ctrl+Arrow move)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selected) return;
      const target = e.target as HTMLElement;
      if (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateBlock(block.id);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowUp') {
        e.preventDefault();
        moveBlock(block.id, 'up');
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowDown') {
        e.preventDefault();
        moveBlock(block.id, 'down');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeBlock(block.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected, block.id, duplicateBlock, moveBlock, removeBlock]);

  // Apply row layout ratio preset
  const applyRowPreset = (presetId: string) => {
    const preset = ROW_PRESETS.find((p) => p.id === presetId) || ROW_PRESETS[1];
    const newColumnsCount = preset.cols;
    const nextInner = [...inner];

    if (newColumnsCount > nextInner.length) {
      for (let i = nextInner.length; i < newColumnsCount; i += 1) {
        nextInner.push({ id: createId(), type: 'column', attributes: {}, innerBlocks: [] });
      }
    } else if (newColumnsCount < nextInner.length) {
      nextInner.length = newColumnsCount;
    }

    const updatedColumns = nextInner.map((col, idx) => ({
      ...col,
      attributes: {
        ...col.attributes,
        widthRatio: preset.ratios[idx] || `${100 / newColumnsCount}%`,
        flex: preset.flexValues[idx] || '1 1 0%',
      },
    }));

    updateBlock(block.id, (b) => ({
      ...b,
      attributes: {
        ...b.attributes,
        layoutRatio: presetId,
        columns: newColumnsCount,
      },
      innerBlocks: updatedColumns,
    }));
  };

  // Add extra column to Row
  const addColumnToRow = () => {
    const nextCols = inner.length + 1;
    const equalFlex = '1 1 0%';
    const updatedColumns = inner.map((col) => ({
      ...col,
      attributes: { ...col.attributes, flex: equalFlex, widthRatio: `${Math.round(100 / nextCols)}%` },
    }));

    updatedColumns.push({
      id: createId(),
      type: 'column',
      attributes: { flex: equalFlex, widthRatio: `${Math.round(100 / nextCols)}%` },
      innerBlocks: [],
    });

    updateBlock(block.id, (b) => ({
      ...b,
      attributes: { ...b.attributes, columns: nextCols, layoutRatio: 'custom' },
      innerBlocks: updatedColumns,
    }));
  };

  // Remove last column from Row
  const removeColumnFromRow = () => {
    if (inner.length <= 1) return;
    const nextCols = inner.length - 1;
    const nextInner = inner.slice(0, nextCols);
    const equalFlex = '1 1 0%';

    const updatedColumns = nextInner.map((col) => ({
      ...col,
      attributes: { ...col.attributes, flex: equalFlex, widthRatio: `${Math.round(100 / nextCols)}%` },
    }));

    updateBlock(block.id, (b) => ({
      ...b,
      attributes: { ...b.attributes, columns: nextCols, layoutRatio: 'custom' },
      innerBlocks: updatedColumns,
    }));
  };

  // Set all columns to Equal Width
  const setEqualWidth = () => {
    const equalFlex = '1 1 0%';
    const updatedColumns = inner.map((col) => ({
      ...col,
      attributes: { ...col.attributes, flex: equalFlex, widthRatio: `${Math.round(100 / inner.length)}%` },
    }));

    updateBlock(block.id, (b) => ({
      ...b,
      attributes: { ...b.attributes, layoutRatio: 'equal' },
      innerBlocks: updatedColumns,
    }));
  };

  // Styling calculations
  const gapPx = isMobile ? 16 : isTablet ? 16 : typeof a.gap === 'number' ? a.gap : (a.gap ? parseInt(String(a.gap), 10) : 20);
  const paddingPx = isMobile ? '16px' : typeof a.padding === 'number' ? `${a.padding}px` : (a.padding as string) || '12px';
  const flexDirection = (isMobile ? 'column' : (a.flexDirection as string) || 'row') as React.CSSProperties['flexDirection'];
  const flexWrap = (a.flexWrap as string) || (flexDirection === 'row' ? 'nowrap' : 'wrap');
  const alignItems = (a.alignItems as string) || 'stretch';
  const justifyContent = (a.justifyContent as string) || 'flex-start';
  const bgStyle = (a.backgroundColor as string) || undefined;
  const borderRadius = typeof a.borderRadius === 'number' ? `${a.borderRadius}px` : (a.borderRadius as string) || '16px';

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection,
    flexWrap: flexWrap as React.CSSProperties['flexWrap'],
    alignItems: alignItems as React.CSSProperties['alignItems'],
    justifyContent: justifyContent as React.CSSProperties['justifyContent'],
    gap: `${gapPx}px`,
    padding: paddingPx,
    borderRadius,
    background: bgStyle,
    boxShadow: (a.shadow as string) || undefined,
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
  };

  return (
    <div
      className={`be-row relative transition-all duration-200 rounded-2xl w-full max-w-full ${selected ? 'ring-2 ring-blue-500 border border-blue-500 shadow-xl z-20' : ''
        }`}
      style={containerStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          selectBlock(block.id);
        }
      }}
    >
      {/* FLOATING GLASSMORPHISM ROW TOOLBAR (Single Unified Toolbar) */}
      {selected && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 max-w-[calc(100vw-24px)] bg-slate-900/95 dark:bg-slate-900/95 text-white backdrop-blur-md border border-slate-700/80 rounded-full px-2.5 xs:px-3.5 py-1 xs:py-1.5 shadow-2xl flex items-center gap-1 xs:gap-1.5 z-50 pointer-events-auto transition-all animate-fade-in whitespace-nowrap overflow-x-auto no-scrollbar">
          {/* Block Label Badge & Drag Handle */}
          <div className="flex items-center gap-1.5 pr-1 border-r border-slate-700/80 shrink-0">
            <div className="cursor-grab active:cursor-grabbing p-0.5 text-slate-400 hover:text-white" title="Drag Row">
              <GripVertical size={14} />
            </div>
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
              <Layout size={13} className="text-blue-400" />
              <span>Row</span>
            </span>
          </div>

          {/* Move Up / Down */}
          <button
            type="button"
            onClick={() => moveBlock(block.id, 'up')}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Move Up"
          >
            <ArrowUp size={13} />
          </button>

          <button
            type="button"
            onClick={() => moveBlock(block.id, 'down')}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Move Down"
          >
            <ArrowDown size={13} />
          </button>

          <div className="w-px h-4 bg-slate-700 mx-0.5 shrink-0" />

          {/* Layout Ratio Presets Dropdown */}
          <div className="relative shrink-0">
            <button
              ref={layoutBtnRef}
              type="button"
              onClick={toggleLayoutMenu}
              className="p-1 px-2.5 rounded-lg text-xs font-bold text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
              title="Row Layout Presets"
            >
              <Columns size={13} className="text-blue-400" />
              <span>Layout ({inner.length} Cols)</span>
              <ChevronDown size={11} />
            </button>

            {showLayoutMenu && menuCoords && typeof document !== 'undefined' && createPortal(
              <div
                style={{
                  position: 'fixed',
                  top: `${menuCoords.top}px`,
                  left: `${menuCoords.left}px`,
                  zIndex: 9999999,
                }}
                className="w-64 max-w-[calc(100vw-2rem)] p-2 bg-[#0f172a] text-slate-100 border border-slate-700/90 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] grid grid-cols-1 gap-1.5 animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase text-slate-400 border-b border-slate-800 pb-1.5 mb-0.5">
                  Select Layout Preset
                </div>
                {ROW_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      applyRowPreset(p.id);
                      setShowLayoutMenu(false);
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl text-xs text-left transition-all cursor-pointer ${a.layoutRatio === p.id
                      ? 'bg-blue-600 text-white font-bold shadow-lg ring-1 ring-blue-400/50'
                      : 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 hover:text-white'
                      }`}
                  >
                    <div>
                      <span className="block font-bold text-xs">{p.title}</span>
                      <span className={`text-[11px] block mt-0.5 ${a.layoutRatio === p.id ? 'text-blue-100' : 'text-slate-300'}`}>
                        {p.desc}
                      </span>
                    </div>
                    {a.layoutRatio === p.id && <Check size={15} className="text-white shrink-0" />}
                  </button>
                ))}
              </div>,
              document.body
            )}
          </div>

          <div className="w-px h-4 bg-slate-700 mx-0.5" />

          {/* Row Orientation Toggle Button (Horizontal Row vs Vertical Stacked Up & Down) */}
          <button
            type="button"
            onClick={() => {
              const currentDir = (a.flexDirection as string) || 'row';
              const nextDir = currentDir === 'column' ? 'row' : 'column';
              updateBlock(block.id, (b) => ({
                ...b,
                attributes: { ...b.attributes, flexDirection: nextDir },
              }));
            }}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${(a.flexDirection as string) === 'column'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            title={(a.flexDirection as string) === 'column' ? 'Switch to Horizontal Side-by-Side' : 'Switch to Vertical Up & Down Stack'}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M7 6c0 4 2.5 6 5 6s5-2 5-6" />
              <path d="M7 18c0-4 2.5-6 5-6s5 2 5 6" />
            </svg>
          </button>

          {/* Add Column Button */}
          <button
            type="button"
            onClick={addColumnToRow}
            className="p-1 px-2 rounded-lg text-xs font-bold text-blue-400 hover:text-blue-300 hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
            title="Add Column to Row"
          >
            <Plus size={13} />
            <span>Column</span>
          </button>

          {/* Add Image directly to Row Button */}
          <button
            type="button"
            onClick={() => {
              insertBlockInto(block.id, 'image');
            }}
            className="p-1 px-2 rounded-lg text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
            title="Add Image to Row"
          >
            <Plus size={13} />
            <span>🖼️ Image</span>
          </button>

          {/* Remove Column Button */}
          {inner.length > 1 && (
            <button
              type="button"
              onClick={removeColumnFromRow}
              className="p-1 px-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Remove Last Column"
            >
              - Column
            </button>
          )}

          {/* Equal Width Button */}
          <button
            type="button"
            onClick={setEqualWidth}
            className="p-1 px-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
            title="Equal Width Columns"
          >
            <Repeat size={13} />
            <span>Equal</span>
          </button>

          {/* Reverse Row Direction Button */}
          <button
            type="button"
            onClick={() => {
              const currentDir = (a.flexDirection as string) || 'row';
              const nextDir = currentDir === 'row-reverse' ? 'row' : 'row-reverse';
              updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, flexDirection: nextDir } }));
            }}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${(a.flexDirection as string) === 'row-reverse'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            title="Reverse Column Order"
          >
            <ArrowLeftRight size={14} />
          </button>

          <div className="w-px h-4 bg-slate-700 mx-0.5" />

          {/* Duplicate Row */}
          <button
            type="button"
            onClick={() => duplicateBlock(block.id)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Duplicate Row (Ctrl+D)"
          >
            <CopyPlus size={14} />
          </button>

          {/* Copy Row */}
          <button
            type="button"
            onClick={() => copyBlocks([block.id])}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Copy Row"
          >
            <Copy size={14} />
          </button>

          {/* Delete Row */}
          <button
            type="button"
            onClick={() => removeBlock(block.id)}
            className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Delete Row (Delete)"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}

      {/* COLUMNS INSIDE ROW */}
      <NestedBlockContext.Provider value={{ isNested: true, isCover: false }}>
        {inner.map((colBlock) => {
          const colAttr = colBlock.attributes || {};
          const isStacked = flexDirection === 'column';
          let rawFlex = String(colAttr.flex || '1 1 0%');
          if (rawFlex.startsWith('0 0 ')) {
            const num = parseFloat(rawFlex.replace('0 0 ', '').replace('%', ''));
            if (!isNaN(num) && num > 0) {
              rawFlex = `${num} 1 0%`;
            }
          }
          const flexStyle = (isMobile || isStacked) ? '1 1 100%' : rawFlex;
          const hasFixedPxWidth = Boolean(colAttr.widthRatio && String(colAttr.widthRatio).endsWith('px'));
          const widthStyle = (isMobile || isStacked) ? '100%' : (hasFixedPxWidth ? String(colAttr.widthRatio) : undefined);

          return (
            <div
              key={colBlock.id}
              className="flex flex-col min-w-0 transition-all duration-200"
              style={{
                flex: flexStyle,
                width: widthStyle,
              }}
            >
              <ColumnBlock block={colBlock} selected={false} />
            </div>
          );
        })}
      </NestedBlockContext.Provider>
    </div>
  );
}

export function StackBlock({ block }: BlockProps) {
  const inner = block.innerBlocks ?? [];
  const insertBlockInto = useEditorStore((s) => s.insertBlockInto);
  const { isMobile } = useResponsive();

  return (
    <div className={`be-stack w-full max-w-full flex flex-col ${isMobile ? 'gap-2 p-2' : 'gap-4 p-3'} rounded-xl border border-dashed border-gray-200 dark:border-gray-800`}>
      {inner.length > 0 ? (
        inner.map((b, idx) => <BlockWrapper key={b.id} block={b} index={idx} total={inner.length} />)
      ) : (
        <div
          className="py-4 px-3 text-center w-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-500/5 rounded-lg transition-colors group/empty select-none"
          onClick={(e) => {
            e.stopPropagation();
            const id = insertBlockInto(block.id, 'paragraph');
            if (id) focusBlock(id);
          }}
        >
          <button
            type="button"
            title="Add block"
            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover/empty:text-blue-500 group-hover/empty:bg-blue-50 dark:group-hover/empty:bg-blue-950/40 border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-all cursor-pointer"
          >
            <Plus size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

export function SpacerBlock({ block }: BlockProps) {
  const a = block.attributes;
  const { isMobile, isTablet } = useResponsive();
  const rawH = (a.height as number) || 40;
  const responsiveH = isMobile ? Math.min(rawH, 20) : isTablet ? Math.min(rawH, 30) : rawH;

  return (
    <div className="be-spacer flex items-center justify-center group hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded transition-colors w-full"
      style={{ height: `${responsiveH}px` }}>
      <div className="w-full border-t border-dashed border-gray-200 dark:border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

export function SeparatorBlock({ block }: BlockProps) {
  const a = block.attributes;
  if (a.style === 'wide') return <hr className="be-separator border-0 border-t-2 border-gray-300 dark:border-gray-600 my-4 w-full" style={{ marginTop: '16px', marginBottom: '16px' }} />;
  if (a.style === 'dots') return <div className="be-separator flex justify-center my-4 w-full" style={{ marginTop: '16px', marginBottom: '16px' }}><span className="text-gray-400 tracking-widest">· · ·</span></div>;
  return <hr className="be-separator border-0 border-t border-gray-200 dark:border-gray-700 my-4 w-full" style={{ marginTop: '16px', marginBottom: '16px' }} />;
}
