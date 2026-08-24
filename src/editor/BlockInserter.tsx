import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { BLOCK_CATEGORIES, getBlockIcon, getFilteredBlockDefinitions } from './blocks/registry';
import { useEditorStore, findBlock } from './store';
import ResponsivePanelShell from './ResponsivePanelShell';
import {
  X,
  ChevronDown,
  ChevronUp,
  Type,
  Image as ImageIcon,
  Columns3,
  Upload,
  LayoutGrid,
  PanelLeftOpen,
  Lock,
  ZapOff,
  // Zap,
} from 'lucide-react';
import type { UpgradeRequiredPayload } from './permissions/types';
import { getBlockAccessStatus, getUpgradePlan } from './permissions/permissionEngine';
import { getBlockLabel } from './blocks/registry';
// import PricingComparisonModal from './permissions/PricingComparisonModal';

interface InserterProps {
  open: boolean;
  onClose?: () => void;
  onInsert: (type: string) => void;
  onUpgradeRequired?: (payload: UpgradeRequiredPayload) => void;
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

export default function BlockInserter({ open, onClose, onInsert, onUpgradeRequired }: InserterProps) {
  const setInserterOpen = useEditorStore((s) => s.setInserterOpen);
  const blocks = useEditorStore((s) => s.blocks);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const filterOptions = useEditorStore((s) => s.filterOptions);
  const currentPlan = useEditorStore((s) => s.currentPlan);
  const blockPermissions = useEditorStore((s) => s.blockPermissions);

  const availableDefinitions = useMemo(() => {
    return getFilteredBlockDefinitions(filterOptions);
  }, [filterOptions]);

  const selectedBlock = findBlock(blocks, selectedIds[0]);
  const activeBlockType = selectedBlock?.type;
  const activeCategory = selectedBlock ? availableDefinitions.find((b) => b.type === selectedBlock.type)?.category : null;

  const [activeTab] = useState<string>('all');
  const [hoveredRailTooltip, setHoveredRailTooltip] = useState<{
    label: string;
    isActive?: boolean;
    top: number;
    left: number;
  } | null>(null);

  // Upgrade modal state
  const [upgradeModal, setUpgradeModal] = useState<UpgradeRequiredPayload | null>(null);
  // const [showPricingModal, setShowPricingModal] = useState(false);

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
      return true;
    });
  }, [availableDefinitions, activeTab]);

  const handleInsertBlock = (type: string) => {
    // Check permission status
    const status = getBlockAccessStatus(type, currentPlan, blockPermissions);

    if (status === 'disabled') return; // Silently blocked

    if (status === 'locked') {
      // Show upgrade modal
      const requiredPlan = currentPlan
        ? getUpgradePlan(type, currentPlan, blockPermissions)
        : null;
      const payload: UpgradeRequiredPayload = {
        blockType: type,
        blockLabel: getBlockLabel(type),
        currentPlan: currentPlan ?? 'free',
        requiredPlan: requiredPlan ?? 'pro',
      };
      setUpgradeModal(payload);
      return;
    }

    // Available — insert normally
    onInsert(type);
    if (typeof window !== 'undefined' && window.innerWidth < 1280) {
      setInserterOpen(false);
      if (onClose) onClose();
    }
  };

  const handleUpgradeClick = () => {
    if (upgradeModal && onUpgradeRequired) {
      onUpgradeRequired(upgradeModal);
    }
    setUpgradeModal(null);
  };

  // Plan badge display helper
  const getPlanBadge = (type: string) => {
    if (!currentPlan && !blockPermissions) return null;
    const status = getBlockAccessStatus(type, currentPlan, blockPermissions);
    if (status === 'available') return null;
    if (status === 'disabled') return (
      <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 leading-none">
        OFF
      </span>
    );
    // locked
    const reqPlan = currentPlan ? getUpgradePlan(type, currentPlan, blockPermissions) : 'pro';
    if (!reqPlan) return null;
    const colors: Record<string, string> = {
      pro: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400',
      enterprise: 'bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-400',
    };
    return (
      <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded leading-none ${colors[reqPlan] ?? colors.pro}`}>
        {reqPlan.toUpperCase()}
      </span>
    );
  };

  return (
    <>
      {/* Mobile-only Bottom Sheet (< 576px) */}
      <div className="xs:hidden">
        <ResponsivePanelShell
          open={open}
          side="left"
          onClose={onClose || (() => setInserterOpen(false))}
          className="bg-slate-50/95 dark:bg-slate-900/95 border-r border-slate-200/90 dark:border-slate-800 flex flex-col shadow-2xl xl:shadow-none backdrop-blur-md"
          widthClassName="w-full"
        >
          {/* Header Container */}
          <div className="p-3.5 sm:p-4 border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 sticky top-0 z-10 backdrop-blur-md">
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

          {/* Blocks Accordion / Grid Container */}
          <div className="flex-1 min-h-0 overflow-y-auto be-scroll p-3.5 space-y-3 pb-24">
            {BLOCK_CATEGORIES.map((cat) => {
              if (activeTab !== 'all' && activeTab !== cat.id) return null;
              const catBlocks = filteredBlocks.filter((b) => b.category === cat.id);
              if (catBlocks.length === 0) return null;

              const isActiveCat = activeCategory === cat.id;
              const isOpen = activeTab !== 'all' || isActiveCat || !!openCategories[cat.id];
              const catStyle = CATEGORY_STYLES[cat.id] || CATEGORY_STYLES.content;

              return (
                <div
                  key={cat.id}
                  className={`rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-2xs transition-all ${isOpen ? 'overflow-visible relative z-10' : 'overflow-hidden'}`}
                >
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

                  {isOpen && (
                    <div className="px-3 pb-3 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                      <div className="grid grid-cols-2 gap-2 pt-1.5">
                        {catBlocks.map((block) => {
                          const Icon = getBlockIcon(block.type);
                          const isActive = activeBlockType === block.type;
                          const accessStatus = getBlockAccessStatus(block.type, currentPlan, blockPermissions);
                          const isLocked = accessStatus === 'locked';
                          const isDisabled = accessStatus === 'disabled';
                          const badge = getPlanBadge(block.type);

                          return (
                            <button
                              key={block.type}
                              type="button"
                              onClick={() => handleInsertBlock(block.type)}
                              aria-disabled={isDisabled}
                              className={`group flex flex-col items-center justify-center p-2.5 h-[84px] rounded-xl border transition-all duration-150 cursor-pointer text-center overflow-hidden relative ${
                                isDisabled
                                  ? 'bg-slate-100/60 dark:bg-slate-800/30 border-slate-200/50 dark:border-slate-800/50 opacity-50 cursor-not-allowed'
                                  : isLocked
                                  ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/40 hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-md shadow-2xs hover:-translate-y-0.5'
                                  : isActive
                                  ? 'bg-blue-50/90 dark:bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/80 shadow-md font-bold'
                                  : 'bg-slate-50/60 dark:bg-slate-800/60 border-slate-200/70 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md shadow-2xs hover:-translate-y-0.5'
                              }`}
                              title={isDisabled ? 'This block is disabled by the administrator' : isLocked ? `Requires ${badge ? '' : 'upgrade'}` : block.description}
                            >
                              {/* Active indicator */}
                              {isActive && !isLocked && !isDisabled && (
                                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-2xs" />
                              )}
                              {/* Lock icon for locked blocks */}
                              {isLocked && (
                                <span className="absolute top-1.5 right-1.5">
                                  <Lock size={10} className="text-amber-500" />
                                </span>
                              )}
                              {/* Disabled icon */}
                              {isDisabled && (
                                <span className="absolute top-1.5 right-1.5">
                                  <ZapOff size={10} className="text-slate-400" />
                                </span>
                              )}
                              <div className={`p-1.5 rounded-xl mb-1 transition-all ${
                                isDisabled
                                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                                  : isLocked
                                  ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                                  : isActive
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/50 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                              }`}>
                                <Icon size={17} />
                              </div>
                              <span className={`text-[11px] truncate w-full px-0.5 leading-tight ${
                                isDisabled
                                  ? 'font-semibold text-slate-400 dark:text-slate-500'
                                  : isLocked
                                  ? 'font-semibold text-amber-700 dark:text-amber-400'
                                  : isActive
                                  ? 'font-bold text-blue-700 dark:text-blue-300'
                                  : 'font-semibold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                              }`}>
                                {block.label}
                              </span>
                              {/* Plan badge */}
                              {badge && <span className="mt-0.5">{badge}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── [OPTIONAL / DEMO] Bottom Mobile Plan & Pricing Footer (Uncomment when needed) ── */}
          {/*
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 shrink-0 z-20">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50/50 to-blue-50/40 dark:from-purple-950/40 dark:via-slate-800/80 dark:to-blue-950/30 border border-purple-200/80 dark:border-purple-800/60 flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-purple-500/30">
                  <Zap size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-black tracking-wider text-purple-700 dark:text-purple-300">
                    Current Plan
                  </div>
                  <div className="text-xs font-black text-slate-900 dark:text-white capitalize truncate">
                    {currentPlan ? `${currentPlan} Plan` : 'Unrestricted'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPricingModal(true)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-[11px] shadow-sm shadow-purple-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
              >
                Plans & Pricing
              </button>
            </div>
          </div>
          */}
        </ResponsivePanelShell>
      </div>

      {/* Desktop / Tablet Animated Sidebar (>= 576px) — Smoothly expands/collapses width */}
      <aside
        className={`hidden xs:flex h-full min-h-0 flex-col overflow-hidden shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 transition-[width,min-width,max-width] duration-300 ease-in-out select-none relative z-30 ${open
          ? 'w-80 min-w-[20rem] max-w-[20rem]'
          : 'w-16 min-w-[4rem] max-w-[4rem]'
          }`}
      >
        {!open ? (
          /* Collapsed Rail (64px) */
          <div className="w-16 h-full flex flex-col items-center py-3.5 px-2 gap-2 shrink-0 animate-in fade-in duration-200">
            {/* Top Expand Inserter Button */}
            <div className="mb-1 flex items-center justify-center shrink-0">
              <button
                type="button"
                onClick={() => setInserterOpen(true)}
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center cursor-pointer shadow-2xs hover:scale-105"
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
                const accessStatus = getBlockAccessStatus(def.type, currentPlan, blockPermissions);
                const isLocked = accessStatus === 'locked';
                const isDisabled = accessStatus === 'disabled';

                return (
                  <div key={def.type} className="relative flex items-center justify-center shrink-0">
                    <button
                      type="button"
                      onClick={() => handleInsertBlock(def.type)}
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
                      aria-disabled={isDisabled}
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer relative ${
                        isDisabled
                          ? 'bg-slate-100 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/50 text-slate-400 opacity-50 cursor-not-allowed'
                          : isLocked
                          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-amber-500 dark:text-amber-400 hover:scale-105'
                          : isActive
                          ? 'bg-blue-600 text-white ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 border-blue-600 shadow-md scale-105 z-10'
                          : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 border-slate-200/70 dark:border-slate-700/70 shadow-2xs hover:scale-105'
                      }`}
                    >
                      {isLocked ? <Lock size={16} /> : <Icon size={18} />}
                    </button>

                    {isActive && !isLocked && !isDisabled && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 z-20 shadow-2xs pointer-events-none" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── [OPTIONAL / DEMO] Bottom Collapsed Pricing Button (Uncomment when needed) ── */}
            {/*
            <div className="mt-auto pt-2 border-t border-slate-200 dark:border-slate-800 w-full flex flex-col items-center shrink-0">
              <button
                type="button"
                onClick={() => setShowPricingModal(true)}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredRailTooltip({
                    label: '⚡ View Plans & Pricing',
                    top: rect.top + rect.height / 2,
                    left: rect.right + 10,
                  });
                }}
                onMouseLeave={() => setHoveredRailTooltip(null)}
                className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-md shadow-purple-500/30 cursor-pointer"
                title="View Plans & Pricing"
              >
                <Zap size={18} />
              </button>
            </div>
            */}
          </div>
        ) : (
          /* Expanded Library (320px) */
          <div className="w-80 h-full flex flex-col min-h-0 bg-slate-50/95 dark:bg-slate-900/95 animate-in fade-in duration-200 shrink-0">
            {/* Header Container */}
            <div className="p-3.5 sm:p-4 border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 sticky top-0 z-10 backdrop-blur-md">
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

            {/* Blocks Accordion / Grid Container */}
            <div className="flex-1 min-h-0 overflow-y-auto be-scroll p-3.5 space-y-3 pb-4">
              {BLOCK_CATEGORIES.map((cat) => {
                if (activeTab !== 'all' && activeTab !== cat.id) return null;
                const catBlocks = filteredBlocks.filter((b) => b.category === cat.id);
                if (catBlocks.length === 0) return null;

                const isActiveCat = activeCategory === cat.id;
                const isOpen = activeTab !== 'all' || isActiveCat || !!openCategories[cat.id];
                const catStyle = CATEGORY_STYLES[cat.id] || CATEGORY_STYLES.content;

                return (
                  <div
                    key={cat.id}
                    className={`rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-2xs transition-all ${isOpen ? 'overflow-visible relative z-10' : 'overflow-hidden'}`}
                  >
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

                    {isOpen && (
                      <div className="px-3 pb-3 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                        <div className="grid grid-cols-2 gap-2 pt-1.5">
                          {catBlocks.map((block) => {
                            const Icon = getBlockIcon(block.type);
                            const isActive = activeBlockType === block.type;
                            const accessStatus = getBlockAccessStatus(block.type, currentPlan, blockPermissions);
                            const isLocked = accessStatus === 'locked';
                            const isDisabled = accessStatus === 'disabled';
                            const badge = getPlanBadge(block.type);

                            return (
                              <button
                                key={block.type}
                                type="button"
                                onClick={() => handleInsertBlock(block.type)}
                                aria-disabled={isDisabled}
                                className={`group flex flex-col items-center justify-center p-2.5 h-[84px] rounded-xl border transition-all duration-150 cursor-pointer text-center overflow-hidden relative ${
                                  isDisabled
                                    ? 'bg-slate-100/60 dark:bg-slate-800/30 border-slate-200/50 dark:border-slate-800/50 opacity-50 cursor-not-allowed'
                                    : isLocked
                                    ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/40 hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-md shadow-2xs hover:-translate-y-0.5'
                                    : isActive
                                    ? 'bg-blue-50/90 dark:bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/80 shadow-md font-bold'
                                    : 'bg-slate-50/60 dark:bg-slate-800/60 border-slate-200/70 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md shadow-2xs hover:-translate-y-0.5'
                                }`}
                                title={isDisabled ? 'This block is disabled by the administrator' : isLocked ? 'Requires upgrade' : block.description}
                              >
                                {isActive && !isLocked && !isDisabled && (
                                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-2xs" />
                                )}
                                {isLocked && (
                                  <span className="absolute top-1.5 right-1.5">
                                    <Lock size={10} className="text-amber-500" />
                                  </span>
                                )}
                                {isDisabled && (
                                  <span className="absolute top-1.5 right-1.5">
                                    <ZapOff size={10} className="text-slate-400" />
                                  </span>
                                )}
                                <div className={`p-1.5 rounded-xl mb-1 transition-all ${
                                  isDisabled
                                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                                    : isLocked
                                    ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                                    : isActive
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/50 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                                }`}>
                                  <Icon size={17} />
                                </div>
                                <span className={`text-[11px] truncate w-full px-0.5 leading-tight ${
                                  isDisabled
                                    ? 'font-semibold text-slate-400 dark:text-slate-500'
                                    : isLocked
                                    ? 'font-semibold text-amber-700 dark:text-amber-400'
                                    : isActive
                                    ? 'font-bold text-blue-700 dark:text-blue-300'
                                    : 'font-semibold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                                }`}>
                                  {block.label}
                                </span>
                                {badge && <span className="mt-0.5">{badge}</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── [OPTIONAL / DEMO] Bottom Pinned Plan & Pricing Footer (Uncomment when needed) ── */}
            {/*
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 shrink-0 z-20 shadow-xs">
              <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50/50 to-blue-50/40 dark:from-purple-950/40 dark:via-slate-800/80 dark:to-blue-950/30 border border-purple-200/80 dark:border-purple-800/60 flex items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-purple-500/30">
                    <Zap size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase font-black tracking-wider text-purple-700 dark:text-purple-300">
                      Current Plan
                    </div>
                    <div className="text-xs font-black text-slate-900 dark:text-white capitalize truncate">
                      {currentPlan ? `${currentPlan} Plan` : 'Unrestricted'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPricingModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-[11px] shadow-sm shadow-purple-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                >
                  Plans & Pricing
                </button>
              </div>
            </div>
            */}
          </div>
        )}

        {/* Dynamic Portal Floating Tooltip */}
        {hoveredRailTooltip && typeof document !== 'undefined' && createPortal(
          <div
            style={{
              position: 'fixed',
              top: `${hoveredRailTooltip.top}px`,
              left: `${hoveredRailTooltip.left}px`,
              transform: 'translateY(-50%)',
            }}
            className="px-3 py-1.5 text-xs font-bold text-white bg-slate-900/95 dark:bg-slate-800 rounded-xl shadow-2xl whitespace-nowrap pointer-events-none z-[9999999] flex items-center gap-1.5 border border-slate-700/60 animate-in fade-in duration-100"
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

      {/* ── Upgrade Modal ─────────────────────────────────────── */}
      {upgradeModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
          onClick={() => setUpgradeModal(null)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          {/* Modal */}
          <div
            className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Plan badge header */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                upgradeModal.requiredPlan === 'enterprise'
                  ? 'bg-violet-100 dark:bg-violet-950/60'
                  : 'bg-amber-100 dark:bg-amber-950/60'
              }`}>
                <Lock size={20} className={upgradeModal.requiredPlan === 'enterprise' ? 'text-violet-600 dark:text-violet-400' : 'text-amber-600 dark:text-amber-400'} />
              </div>
              <div>
                <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                  {upgradeModal.blockLabel}
                </div>
                <div className={`text-xs font-bold uppercase tracking-wider ${
                  upgradeModal.requiredPlan === 'enterprise'
                    ? 'text-violet-600 dark:text-violet-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {upgradeModal.requiredPlan} Feature
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
              <strong className="text-slate-900 dark:text-slate-100">{upgradeModal.blockLabel}</strong> is available on
              the <strong className={upgradeModal.requiredPlan === 'enterprise' ? 'text-violet-600 dark:text-violet-400' : 'text-amber-600 dark:text-amber-400'}>
                {upgradeModal.requiredPlan.charAt(0).toUpperCase() + upgradeModal.requiredPlan.slice(1)}
              </strong> plan.
              Upgrade your subscription to unlock this block and more.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleUpgradeClick}
                className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  upgradeModal.requiredPlan === 'enterprise'
                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-lg shadow-violet-500/25'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/25'
                }`}
              >
                Upgrade to {upgradeModal.requiredPlan.charAt(0).toUpperCase() + upgradeModal.requiredPlan.slice(1)}
              </button>
              <button
                type="button"
                onClick={() => setUpgradeModal(null)}
                className="px-4 py-2.5 rounded-xl font-semibold text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── [OPTIONAL / DEMO] Pricing & Feature Comparison Modal (Uncomment when needed) ── */}
      {/*
      <PricingComparisonModal
        open={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        currentPlan={currentPlan ?? 'free'}
        blockPermissions={blockPermissions ?? undefined}
        onUpgradeRequired={onUpgradeRequired}
      />
      */}
    </>
  );
}
