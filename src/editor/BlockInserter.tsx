import { useState } from 'react';
import { BLOCK_DEFINITIONS, BLOCK_CATEGORIES, getBlockIcon } from './blocks/registry';
import { useEditorStore, findBlock } from './store';
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

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  text: <Type size={16} className="text-blue-600 dark:text-blue-400" />,
  media: <ImageIcon size={16} className="text-blue-600 dark:text-blue-400" />,
  layout: <Columns3 size={16} className="text-blue-600 dark:text-blue-400" />,
  embed: <Upload size={16} className="text-blue-600 dark:text-blue-400" />,
  content: <LayoutGrid size={16} className="text-blue-600 dark:text-blue-400" />,
};

export default function BlockInserter({ open, onClose, onInsert }: InserterProps) {
  const setInserterOpen = useEditorStore((s) => s.setInserterOpen);
  const blocks = useEditorStore((s) => s.blocks);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const selectedBlock = findBlock(blocks, selectedIds[0]);
  const activeBlockType = selectedBlock?.type;
  const activeCategory = selectedBlock ? BLOCK_DEFINITIONS.find((b) => b.type === selectedBlock.type)?.category : null;

  const [hoveredTooltip, setHoveredTooltip] = useState<{
    label: string;
    isActive?: boolean;
    top: number;
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

  const filteredBlocks = BLOCK_DEFINITIONS.filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.label.toLowerCase().includes(q) ||
      b.type.toLowerCase().includes(q) ||
      b.description.toLowerCase().includes(q) ||
      (b.keywords && b.keywords.some((k) => k.toLowerCase().includes(q)))
    );
  });

  const isSearching = search.trim().length > 0;

  if (!open) {
    return (
      <aside
        onScroll={() => setHoveredTooltip(null)}
        className="shrink-0 w-16 min-w-16 border-r border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 py-3.5 px-2 flex flex-col items-center gap-2 overflow-y-auto overflow-x-hidden be-scroll shadow-sm z-20 relative"
      >
        {/* Top Expand Inserter Button */}
        <div className="mb-1 flex items-center justify-center">
          <button
            type="button"
            onClick={() => setInserterOpen(true)}
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setHoveredTooltip({
                label: 'Expand Block Inserter',
                top: rect.top + rect.height / 2,
              });
            }}
            onMouseLeave={() => setHoveredTooltip(null)}
            className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 border border-gray-200/80 dark:border-gray-700/80 transition-all flex items-center justify-center cursor-pointer shadow-2xs hover:scale-105"
            title="Expand Block Inserter"
          >
            <PanelLeftOpen size={18} />
          </button>
        </div>

        <div className="w-8 h-px bg-gray-200/80 dark:bg-gray-800 my-0.5" />

        {/* Render ALL BLOCKS from BLOCK_DEFINITIONS with active state */}
        <div className="flex-1 flex flex-col items-center gap-2 w-full">
          {BLOCK_DEFINITIONS.map((def) => {
            const Icon = getBlockIcon(def.type);
            const isActive = activeBlockType === def.type;

            return (
              <div key={def.type} className="relative flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => onInsert(def.type)}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredTooltip({
                      label: def.label,
                      isActive,
                      top: rect.top + rect.height / 2,
                    });
                  }}
                  onMouseLeave={() => setHoveredTooltip(null)}
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${isActive
                    ? 'bg-primary-600 text-white ring-2 ring-primary-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 border-primary-600 shadow-md scale-105 z-10'
                    : 'bg-gray-50 dark:bg-gray-800/60 hover:bg-primary-50 dark:hover:bg-primary-950/40 text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 border-gray-200/70 dark:border-gray-700/70 shadow-2xs hover:scale-105'
                    }`}
                >
                  <Icon size={18} />
                </button>

                {isActive && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900 z-20 shadow-2xs pointer-events-none" />
                )}
              </div>
            );
          })}
        </div>

        {/* Floating Tooltip Rendered Dynamically at Hovered Icon Y Position */}
        {hoveredTooltip && (
          <div
            style={{ top: `${hoveredTooltip.top}px` }}
            className="fixed left-[72px] -translate-y-1/2 px-3 py-1.5 text-xs font-bold text-white dark:text-gray-900 bg-gray-900/95 dark:bg-gray-100 rounded-xl shadow-2xl whitespace-nowrap pointer-events-none z-[9999] flex items-center gap-1.5 border border-gray-700/60 dark:border-gray-300/60 transition-all duration-75"
          >
            <span>{hoveredTooltip.label}</span>
            {hoveredTooltip.isActive && (
              <span className="text-[10px] text-emerald-400 dark:text-emerald-600 uppercase font-extrabold">
                (Active)
              </span>
            )}
          </div>
        )}
      </aside>
    );
  }

  return (
    <>
      {open && (
        <div
          className="xl:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-[90]"
          onClick={onClose || (() => setInserterOpen(false))}
        />
      )}
      <div
        className={`
        transition-all duration-300 ease-out
        bg-[#f8fafc] dark:bg-gray-900
        border-r border-gray-200/90 dark:border-gray-800
        flex flex-col shadow-2xl xl:shadow-none
        max-xl:fixed max-xl:inset-y-0 max-xl:left-0 max-xl:z-[100] max-xl:w-80 max-xl:h-full
        ${open ? 'max-xl:translate-x-0 xl:w-72' : 'max-xl:-translate-x-full xl:w-0 xl:overflow-hidden'}
        `}
      >
        {/* Search Header Container */}
        <div className="p-3.5 border-b border-gray-200/70 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Blocks
            </span>
            <button
              type="button"
              onClick={() => setInserterOpen(false)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              title="Collapse Block Inserter"
            >
              <PanelLeftClose size={18} />
            </button>
          </div>

          <div className="relative flex items-center">
            <Search className="absolute left-3 text-gray-400 pointer-events-none" size={15} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="w-full pl-9 pr-7 py-2 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 transition-all shadow-2xs"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Blocks Accordion Container */}
        <div className="flex-1 overflow-y-auto be-scroll p-3.5 space-y-2.5">
          {BLOCK_CATEGORIES.map((cat) => {
            const catBlocks = filteredBlocks.filter((b) => b.category === cat.id);
            if (catBlocks.length === 0) return null;

            const isActiveCat = activeCategory === cat.id;
            const isOpen = isSearching || isActiveCat || !!openCategories[cat.id];

            return (
              <div
                key={cat.id}
                className={`rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900/90 shadow-2xs transition-all ${isOpen ? 'overflow-visible relative z-10' : 'overflow-hidden'
                  }`}
              >
                {/* Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className="w-full flex items-center justify-between p-3.5 text-left cursor-pointer hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {CATEGORY_ICONS[cat.id]}
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                      {cat.label}
                    </span>
                  </div>
                  {isOpen ? (
                    <ChevronUp size={16} className="text-blue-600 dark:text-blue-400" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-400 dark:text-gray-500" />
                  )}
                </button>

                {/* Accordion Body */}
                {isOpen && (
                  <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-gray-800/60">
                    <div className="grid grid-cols-2 gap-2.5 pt-2">
                      {catBlocks.map((block) => {
                        const Icon = getBlockIcon(block.type);
                        const isActive = activeBlockType === block.type;

                        return (
                          <button
                            key={block.type}
                            type="button"
                            onClick={() => onInsert(block.type)}
                            className={`group flex flex-col items-center justify-center p-3 h-[82px] rounded-xl border transition-all duration-150 cursor-pointer text-center overflow-hidden relative ${isActive
                              ? 'bg-blue-50/80 dark:bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/80 shadow-md font-bold'
                              : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-800/80 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md shadow-2xs'
                              }`}
                            title={block.description}
                          >
                            {isActive && (
                              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white dark:border-gray-900 shadow-2xs" />
                            )}
                            <Icon
                              size={20}
                              className={`mb-1.5 transition-all shrink-0 ${isActive
                                ? 'text-blue-600 dark:text-blue-400 scale-110'
                                : 'text-gray-800 dark:text-gray-200 group-hover:scale-110 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                                }`}
                            />
                            <span
                              className={`text-[11px] truncate w-full px-0.5 leading-tight ${isActive
                                ? 'font-bold text-blue-700 dark:text-blue-300'
                                : 'font-semibold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400'
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
            <div className="py-8 text-center text-xs text-gray-400 dark:text-gray-500">
              No blocks found matching "{search}"
            </div>
          )}
        </div>
      </div>
    </>
  );
}
