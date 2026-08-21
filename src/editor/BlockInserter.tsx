import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { BLOCK_CATEGORIES, getBlockIcon, getFilteredBlockDefinitions } from './blocks/registry';
import { useEditorStore, findBlock } from './store';
import ResponsivePanelShell from './ResponsivePanelShell';
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Type,
  Image as ImageIcon,
  Columns3,
  Upload,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

interface InserterProps {
  open: boolean;
  onClose?: () => void;
  onInsert: (type: string) => void;
}

const CATEGORY_STYLES: Record<string, { badgeBg: string; textColor: string; borderColor: string; icon: React.ReactNode }> = {
  text: {
    badgeBg: 'bg-blue-50 dark:bg-blue-950/50',
    textColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-200 dark:border-blue-800/60',
    icon: <Type size={15} className="text-blue-600 dark:text-blue-400" />,
  },
  media: {
    badgeBg: 'bg-purple-50 dark:bg-purple-950/50',
    textColor: 'text-purple-600 dark:text-purple-400',
    borderColor: 'border-purple-200 dark:border-purple-800/60',
    icon: <ImageIcon size={15} className="text-purple-600 dark:text-purple-400" />,
  },
  layout: {
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/50',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-200 dark:border-emerald-800/60',
    icon: <Columns3 size={15} className="text-emerald-600 dark:text-emerald-400" />,
  },
  embed: {
    badgeBg: 'bg-amber-50 dark:bg-amber-950/50',
    textColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-200 dark:border-amber-800/60',
    icon: <Upload size={15} className="text-amber-600 dark:text-amber-400" />,
  },
  content: {
    badgeBg: 'bg-rose-50 dark:bg-rose-950/50',
    textColor: 'text-rose-600 dark:text-rose-400',
    borderColor: 'border-rose-200 dark:border-rose-800/60',
    icon: <LayoutGrid size={15} className="text-rose-600 dark:text-rose-400" />,
  },
};

export default function BlockInserter({ open, onClose, onInsert }: InserterProps) {
  const setInserterOpen = useEditorStore((s) => s.setInserterOpen);
  const blocks = useEditorStore((s) => s.blocks);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const inserterTargetIndex = useEditorStore((s) => s.inserterTargetIndex);
  const openInserterAtIndex = useEditorStore((s) => s.openInserterAtIndex);
  const filterOptions = useEditorStore((s) => s.filterOptions);

  const availableDefinitions = useMemo(() => {
    return getFilteredBlockDefinitions(filterOptions);
  }, [filterOptions]);

  const selectedBlock = findBlock(blocks, selectedIds[0]);
  const activeBlockType = selectedBlock?.type;
  const activeCategory = selectedBlock ? availableDefinitions.find((b) => b.type === selectedBlock.type)?.category : null;

  const [activeTab, setActiveTab] = useState<string>('all');
  const [hoveredRailTooltip, setHoveredRailTooltip] = useState<{
    label: string;
    isActive?: boolean;
    top: number;
    left: number;
  } | null>(null);

  const [search, setSearch] = useState('');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    text: true,
    media: false,
    layout: false,
    embed: false,
    content: false,
  });

  const toggleCategory = (catId: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const filteredBlocks = useMemo(() => {
    return availableDefinitions.filter((b) => {
      if (activeTab !== 'all' && b.category !== activeTab) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        b.label.toLowerCase().includes(q) ||
        b.type.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        (b.keywords && b.keywords.some((k) => k.toLowerCase().includes(q)))
      );
    });
  }, [availableDefinitions, search, activeTab]);

  const isSearching = search.trim().length > 0;

  if (!open) {
    return (
      <aside
        className="hidden xs:flex shrink-0 w-16 min-w-16 h-full max-h-full border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 py-3.5 px-2 flex-col items-center gap-2 overflow-hidden shadow-sm z-30 relative select-none"
      >
        {/* Top Expand Inserter Button */}
        <div className="mb-1 flex items-center justify-center shrink-0">
          <button
            type="button"
            onClick={() => setInserterOpen(true)}
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setHoveredRailTooltip({
                label: 'Expand Block Library',
                top: rect.top + rect.height / 2,
                left: rect.right + 10,
              });
            }}
            onMouseLeave={() => setHoveredRailTooltip(null)}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center cursor-pointer shadow-2xs hover:scale-105"
            title="Expand Block Library"
          >
            <PanelLeftOpen size={18} />
          </button>
        </div>

        <div className="w-8 h-px bg-slate-200 dark:border-slate-800 my-0.5 shrink-0" />

        {/* Scrollable list of ALL block definitions */}
        <div
          onScroll={() => setHoveredRailTooltip(null)}
          className="flex-1 min-h-0 w-full flex flex-col items-center gap-2 overflow-y-auto be-scroll py-1 px-0.5"
        >
          {availableDefinitions.map((def) => {
            const Icon = getBlockIcon(def.type);
            const isActive = activeBlockType === def.type;

            return (
              <div key={def.type} className="relative flex items-center justify-center shrink-0">
                <button
                  type="button"
                  onClick={() => onInsert(def.type)}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredRailTooltip({
                      label: def.label,
                      isActive,
                      top: rect.top + rect.height / 2,
                      left: rect.right + 10,
                    });
                  }}
                  onMouseLeave={() => setHoveredRailTooltip(null)}
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${isActive
                    ? 'bg-blue-600 text-white ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 border-blue-600 shadow-md scale-105 z-10'
                    : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 border-slate-200/70 dark:border-slate-700/70 shadow-2xs hover:scale-105'
                    }`}
                >
                  <Icon size={18} />
                </button>

                {isActive && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 z-20 shadow-2xs pointer-events-none" />
                )}
              </div>
            );
          })}
        </div>

        {/* Dynamic Portal Floating Tooltip Rendered at exact Button Position */}
        {hoveredRailTooltip && typeof document !== 'undefined' && createPortal(
          <div
            style={{
              position: 'fixed',
              top: `${hoveredRailTooltip.top}px`,
              left: `${hoveredRailTooltip.left}px`,
              transform: 'translateY(-50%)',
            }}
            className="px-3 py-1.5 text-xs font-bold text-white bg-slate-900/95 dark:bg-slate-800 rounded-xl shadow-2xl whitespace-nowrap pointer-events-none z-[999999] flex items-center gap-1.5 border border-slate-700/60 animate-in fade-in duration-100"
          >
            <span>{hoveredRailTooltip.label}</span>
            {hoveredRailTooltip.isActive && (
              <span className="text-[10px] text-emerald-400 uppercase font-extrabold">
                (Active)
              </span>
            )}
          </div>,
          document.body
        )}
      </aside>
    );
  }

  const selectedIndex = selectedBlock ? blocks.findIndex((b) => b.id === selectedBlock.id) : -1;
  const isInsertingAbove = inserterTargetIndex !== null && selectedIndex !== -1 && inserterTargetIndex <= selectedIndex;

  const handleInsertBlock = (type: string) => {
    onInsert(type);
    if (typeof window !== 'undefined' && window.innerWidth < 1280) {
      setInserterOpen(false);
      if (onClose) onClose();
    }
  };

  return (
    <>
      <ResponsivePanelShell
        open={open}
        side="left"
        onClose={onClose || (() => setInserterOpen(false))}
        className="bg-slate-50/95 dark:bg-slate-900/95 border-r border-slate-200/90 dark:border-slate-800 flex flex-col shadow-2xl xl:shadow-none transition-transform duration-300 ease-out backdrop-blur-md"
        widthClassName="w-[min(20rem,calc(100vw-1rem))] xl:w-80"
      >
        {/* Search & Header Container */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 sticky top-0 z-10 space-y-2.5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Blocks Library
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                {availableDefinitions.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => (onClose ? onClose() : setInserterOpen(false))}
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
              title="Close Blocks Library"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Blocks Accordion / Grid Container with extra bottom padding on mobile */}
        <div className="flex-1 min-h-0 overflow-y-auto be-scroll p-3.5 space-y-3 pb-24 xs:pb-4">
          {BLOCK_CATEGORIES.map((cat) => {
            if (activeTab !== 'all' && activeTab !== cat.id) return null;
            const catBlocks = filteredBlocks.filter((b) => b.category === cat.id);
            if (catBlocks.length === 0) return null;

            const isActiveCat = activeCategory === cat.id;
            const isOpen = isSearching || activeTab !== 'all' || isActiveCat || !!openCategories[cat.id];
            const catStyle = CATEGORY_STYLES[cat.id] || CATEGORY_STYLES.content;

            return (
              <div
                key={cat.id}
                className={`rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-2xs transition-all ${isOpen ? 'overflow-visible relative z-10' : 'overflow-hidden'
                  }`}
              >
                {/* Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className="w-full flex items-center justify-between p-3 text-left cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`p-1 rounded-lg ${catStyle.badgeBg}`}>
                      {catStyle.icon}
                    </span>
                    <span className={`text-xs font-extrabold uppercase tracking-wider ${catStyle.textColor}`}>
                      {cat.label}
                    </span>
                  </div>
                  {isOpen ? (
                    <ChevronUp size={15} className={catStyle.textColor} />
                  ) : (
                    <ChevronDown size={15} className="text-slate-400 dark:text-slate-500" />
                  )}
                </button>

                {/* Accordion Body */}
                {isOpen && (
                  <div className="px-3 pb-3 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                    <div className="grid grid-cols-2 gap-2 pt-1.5">
                      {catBlocks.map((block) => {
                        const Icon = getBlockIcon(block.type);
                        const isActive = activeBlockType === block.type;

                        return (
                          <button
                            key={block.type}
                            type="button"
                            onClick={() => handleInsertBlock(block.type)}
                            className={`group flex flex-col items-center justify-center p-2.5 h-[84px] rounded-xl border transition-all duration-150 cursor-pointer text-center overflow-hidden relative hover:-translate-y-0.5 ${isActive
                              ? 'bg-blue-50/90 dark:bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/80 shadow-md font-bold'
                              : 'bg-slate-50/60 dark:bg-slate-800/60 border-slate-200/70 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md shadow-2xs'
                              }`}
                            title={block.description}
                          >
                            {isActive && (
                              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-2xs" />
                            )}
                            <div className={`p-1.5 rounded-xl mb-1 transition-all ${isActive
                              ? 'bg-blue-600 text-white'
                              : 'bg-white dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/50 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                              }`}>
                              <Icon size={17} />
                            </div>
                            <span
                              className={`text-[11px] truncate w-full px-0.5 leading-tight ${isActive
                                ? 'font-bold text-blue-700 dark:text-blue-300'
                                : 'font-semibold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                                }`}
                            >
                              {block.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredBlocks.length === 0 && (
            <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500 space-y-1">
              <p className="font-bold">No blocks found</p>
              <p className="text-[11px]">Try searching with a different keyword</p>
            </div>
          )}
        </div>
      </ResponsivePanelShell>
    </>
  );
}
