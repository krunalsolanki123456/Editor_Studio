import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Range, getTrackBackground } from 'react-range';
import {
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Type as TypeIcon, Sparkles, PanelRightClose, PanelRightOpen,
  ChevronDown, ChevronUp, Sliders, Plus, Trash2, Crop, RotateCcw,
  Upload, Image as ImageIcon, Layout, Layers, Palette, Square,
  Rows, Columns as ColumnsIcon, Grid, Move, Code, Maximize2,
  Link as LinkIcon, Video,
} from 'lucide-react';
import { createId } from './utils';
import { useEditorStore, findBlock } from './store';
import { getBlockIcon } from './blocks/registry';
import ResponsivePanelShell from './ResponsivePanelShell';
import { fileToDataUrl } from './media';
import CustomSelect from './CustomSelect';
import type { TextAlign, ListStyle, HeadingLevel } from './types';
import type { LucideIcon } from 'lucide-react';
import {
  TEXT_FONT_FAMILIES,
  TEXT_FONT_WEIGHTS,
  TEXT_TRANSFORMS,
  getTypographyControls,
  type TextBlockType,
} from './typography';
import {
  ensureTableColumnStyles,
  ensureTableRowStyles,
  getTableRowRole,
  updateTableColumnStyle,
  updateTableRowStyle,
  applyZebraStriping,
  clearAllRowStyles,
  clearAllColumnStyles,
} from './table';

const ALIGN_OPTIONS: { value: TextAlign; icon: LucideIcon; label: string }[] = [
  { value: 'left', icon: AlignLeft, label: 'Left' },
  { value: 'center', icon: AlignCenter, label: 'Center' },
  { value: 'right', icon: AlignRight, label: 'Right' },
  { value: 'justify', icon: AlignJustify, label: 'Justify' },
];

const LIST_STYLES: { value: ListStyle; label: string }[] = [
  { value: 'bullet', label: 'Bullet' },
  { value: 'number', label: 'Numbered' },
  { value: 'checklist', label: 'Checklist' },
  { value: 'alpha-upper', label: 'A, B, C' },
  { value: 'alpha-lower', label: 'a, b, c' },
  { value: 'roman-upper', label: 'I, II, III' },
  { value: 'roman-lower', label: 'i, ii, iii' },
];

const sectionStateCache: Record<string, boolean> = {};

function Section({
  title,
  icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(() => {
    return sectionStateCache[title] !== undefined ? sectionStateCache[title] : defaultOpen;
  });

  const toggleOpen = () => {
    const nextState = !isOpen;
    sectionStateCache[title] = nextState;
    setIsOpen(nextState);
  };

  return (
    <div
      className={`rounded-2xl border border-gray-200/90 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xs mb-3 transition-all ${
        isOpen ? 'overflow-visible relative z-10 focus-within:z-20' : 'overflow-hidden'
      }`}
    >
      <button
        type="button"
        onClick={toggleOpen}
        className="w-full flex items-center justify-between p-3 text-left cursor-pointer hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors rounded-2xl"
      >
        <div className="flex items-center gap-2">
          {icon || <Sliders size={15} className="text-primary-600 dark:text-primary-400" />}
          <span className="text-xs font-bold text-gray-800 dark:text-gray-200 tracking-wide">
            {title}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp size={15} className="text-primary-600 dark:text-primary-400" />
        ) : (
          <ChevronDown size={15} className="text-gray-400 dark:text-gray-500" />
        )}
      </button>

      {isOpen && (
        <div className="px-3 pb-3.5 pt-1 border-t border-gray-100 dark:border-gray-800/80 space-y-3 overflow-visible relative">
          {children}
        </div>
      )}
    </div>
  );
}

function formatColorDisplay(val: string): string {
  if (!val) return '';
  const rgbMatch = val.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2], 10).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3], 10).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`.toUpperCase();
  }
  return val.toUpperCase();
}

function ColorPickerControl({
  label,
  value,
  onChange,
  defaultColor = '#000000',
  onClear,
}: {
  label: string;
  value: string | undefined;
  onChange: (val: string) => void;
  defaultColor?: string;
  onClear?: () => void;
}) {
  const isHex = (str?: string) => Boolean(str && /^#([0-9a-f]{3}){1,2}$/i.test(str));
  const hexFromRgb = (str?: string) => {
    if (!str) return '#ffffff';
    if (isHex(str)) return str;
    const m = str.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (m) {
      const r = parseInt(m[1], 10).toString(16).padStart(2, '0');
      const g = parseInt(m[2], 10).toString(16).padStart(2, '0');
      const b = parseInt(m[3], 10).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
    return isHex(defaultColor) ? defaultColor : '#ffffff';
  };
  const pickerVal = hexFromRgb(value || defaultColor);
  const currentVal = value || defaultColor;
  const isNone = !value && Boolean(onClear);

  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50/90 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-700/60 shadow-2xs gap-2">
      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap shrink-0">{label}</span>
      <div className="flex items-center gap-2 shrink-0">
        {isNone ? (
          <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500 italic whitespace-nowrap">None</span>
        ) : (
          <span
            className="text-[11px] font-mono text-gray-600 dark:text-gray-300 font-semibold whitespace-nowrap"
            title={currentVal}
          >
            {formatColorDisplay(currentVal)}
          </span>
        )}

        <label className="relative w-7 h-7 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer overflow-hidden shadow-2xs hover:scale-105 transition-transform shrink-0">
          <input
            type="color"
            value={pickerVal}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            title={`Choose ${label}`}
          />
          <div
            className="w-full h-full rounded-lg"
            style={{ backgroundColor: value ? currentVal : (onClear ? 'transparent' : currentVal) }}
          />
        </label>

        {onClear && value && (
          <button
            type="button"
            onClick={onClear}
            className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-gray-200/70 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

function AlignControl({ value, onChange }: { value: TextAlign; onChange: (a: TextAlign) => void }) {
  return (
    <div className="p-1 bg-gray-100/90 dark:bg-gray-800/70 rounded-xl flex gap-1 border border-gray-200/90 dark:border-gray-700/60 shadow-2xs">
      {ALIGN_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              active
                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 font-semibold shadow-2xs scale-[1.02]'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/40'
            }`}
            title={opt.label}
          >
            <Icon size={15} />
          </button>
        );
      })}
    </div>
  );
}

export function ReactRangeSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  className = '',
}: {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (val: number) => void;
  className?: string;
}) {
  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Number.isFinite(max) && max > safeMin ? max : 100;
  const safeVal = Math.min(Math.max(Number.isFinite(value) ? value : safeMin, safeMin), safeMax);

  return (
    <div className={`w-full flex items-center px-1 ${className}`}>
      <Range
        values={[safeVal]}
        step={step}
        min={safeMin}
        max={safeMax}
        onChange={(values) => onChange(values[0])}
        renderTrack={({ props, children }) => (
          <div
            onMouseDown={props.onMouseDown}
            onTouchStart={props.onTouchStart}
            style={{
              ...props.style,
              height: '24px',
              display: 'flex',
              width: '100%',
            }}
          >
            <div
              ref={props.ref}
              style={{
                height: '6px',
                width: '100%',
                borderRadius: '9999px',
                background: getTrackBackground({
                  values: [safeVal],
                  colors: ['#3b82f6', '#cbd5e1'],
                  min: safeMin,
                  max: safeMax,
                }),
                alignSelf: 'center',
              }}
            >
              {children}
            </div>
          </div>
        )}
        renderThumb={({ props, isDragged }) => (
          <div
            {...props}
            key={props.key}
            style={{
              ...props.style,
              height: '16px',
              width: '16px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: isDragged ? '0 0 0 4px rgba(59, 130, 246, 0.35)' : '0 1px 3px rgba(0,0,0,0.25)',
              border: '2.5px solid #2563eb',
              outline: 'none',
              cursor: 'pointer',
            }}
          />
        )}
      />
    </div>
  );
}

function RangeSliderControl({
  label,
  value,
  min,
  max,
  step = 1,
  unit = 'px',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (val: number) => void;
}) {
  return (
    <div className="space-y-1.5 p-2.5 rounded-xl bg-gray-50/80 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 shadow-2xs">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-gray-700 dark:text-gray-300">{label}</span>
        <span className="font-mono font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-2 py-0.5 rounded-md border border-primary-200/60 dark:border-primary-800/60 text-[11px]">
          {value}{unit}
        </span>
      </div>
      <ReactRangeSlider
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

function ToggleControl({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50/80 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 shadow-2xs">
      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer p-0.5 ${checked ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-700'
          }`}
      >
        <div
          className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'
            }`}
        />
      </button>
    </div>
  );
}

function isTextBlockType(type: string): type is TextBlockType {
  return type === 'paragraph' || type === 'heading' || type === 'list' || type === 'quote' || type === 'pullquote' || type === 'code' || type === 'preformatted' || type === 'table';
}

export default function SettingsSidebar() {
  const blocks = useEditorStore((s) => s.blocks);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const open = useEditorStore((s) => s.settingsSidebarOpen);
  const setOpen = useEditorStore((s) => s.setSettingsSidebarOpen);
  const block = findBlock(blocks, selectedIds[0]);
  const a = block?.attributes ?? {};
  const typography = block && isTextBlockType(block.type) ? getTypographyControls(block.type, a) : null;
  const tableRows = block?.type === 'table' ? (a.rows as string[][]) ?? [] : [];
  const tableRowStyles = block?.type === 'table' ? ensureTableRowStyles(a, tableRows.length) : [];
  const tableColumnStyles = block?.type === 'table' ? ensureTableColumnStyles(a, tableRows[0]?.length ?? 0) : [];

  const BlockIcon = block ? getBlockIcon(block.type) : TypeIcon;

  const getMiniSections = () => {
    if (!block) {
      return [
        { id: 'select-block', title: 'Select a Block', icon: Sparkles },
      ];
    }

    const sections: { id: string; title: string; icon: LucideIcon }[] = [];

    if (block.type === 'paragraph' || block.type === 'heading' || block.type === 'quote' ||
      block.type === 'pullquote' || block.type === 'list' || block.type === 'code' || block.type === 'preformatted' || block.type === 'table') {
      sections.push({ id: 'alignment', title: 'Alignment', icon: AlignLeft });
    }

    if (typography) {
      sections.push({ id: 'typography', title: 'Typography', icon: TypeIcon });
    }

    if (block.type === 'heading') {
      sections.push({ id: 'heading-level', title: 'Heading Level', icon: TypeIcon });
    }

    if (block.type === 'list') {
      sections.push({ id: 'list-style', title: 'List Style', icon: Sliders });
    }

    if (block.type === 'spacer') {
      sections.push({ id: 'height', title: 'Spacer Height', icon: Sliders });
    }

    if (block.type === 'separator') {
      sections.push({ id: 'style', title: 'Separator Style', icon: Sliders });
    }

    if (block.type === 'table') {
      sections.push({ id: 'table-layout', title: 'Table Layout & Spacing', icon: Layout });
      sections.push({ id: 'table-borders', title: 'Borders & Corners', icon: Square });
      sections.push({ id: 'table-colors', title: 'Table Colors', icon: Palette });
      sections.push({ id: 'table-rows', title: 'Row Styles', icon: Rows });
      sections.push({ id: 'table-cols', title: 'Column Styles', icon: ColumnsIcon });
    }

    if (block.type === 'cover') {
      sections.push({ id: 'bg-image', title: 'Background Image', icon: ImageIcon });
      sections.push({ id: 'img-settings', title: 'Image Settings', icon: Sliders });
      sections.push({ id: 'overlay', title: 'Overlay', icon: Layers });
      sections.push({ id: 'layout', title: 'Layout', icon: Layout });
      sections.push({ id: 'advanced', title: 'Advanced', icon: Code });
    }

    if (block.type === 'button') {
      sections.push({ id: 'link', title: 'Link Settings', icon: LinkIcon });
      sections.push({ id: 'btn-width', title: 'Button Width', icon: Maximize2 });
      sections.push({ id: 'btn-style', title: 'Button Style', icon: Sparkles });
      sections.push({ id: 'btn-colors', title: 'Button Colors', icon: Palette });
      sections.push({ id: 'btn-radius', title: 'Border Radius', icon: Square });
    }

    if (block.type === 'image') {
      sections.push({ id: 'crop', title: 'Crop & Tools', icon: Crop });
      sections.push({ id: 'dimensions', title: 'Dimensions', icon: Maximize2 });
      sections.push({ id: 'styling', title: 'Image Styling & Opacity', icon: Palette });
      sections.push({ id: 'link-acc', title: 'Link & Accessibility', icon: LinkIcon });
    }

    if (block.type === 'gallery') {
      sections.push({ id: 'gallery-settings', title: 'Gallery Settings', icon: Grid });
      sections.push({ id: 'gallery-borders', title: 'Borders', icon: Square });
    }

    if (block.type === 'slider') {
      sections.push({ id: 'general', title: 'General Settings', icon: Sliders });
      sections.push({ id: 'slides', title: 'Slides', icon: Layers });
      sections.push({ id: 'nav', title: 'Navigation', icon: Move });
      sections.push({ id: 'autoplay', title: 'Autoplay', icon: Sparkles });
      sections.push({ id: 'layout', title: 'Layout', icon: Layout });
    }

    if (block.type === 'columns') {
      sections.push({ id: 'columns-ctrl', title: 'Columns Count', icon: ColumnsIcon });
    }

    if (block.type === 'code') {
      sections.push({ id: 'code-settings', title: 'Code Settings', icon: Code });
    }

    if (sections.length === 0) {
      sections.push({ id: 'block-props', title: `${block.type} Properties`, icon: Sliders });
    }

    return sections;
  };

  const [hoveredSettingsTooltip, setHoveredSettingsTooltip] = useState<{
    label: string;
    top: number;
    left: number;
  } | null>(null);

  const setAttr = (key: string, value: unknown) => {
    if (!block) return;

    if (block.type === 'columns' && key === 'columns') {
      const nextColumns = Number(value);
      updateBlock(block.id, (b) => {
        const currentInner = b.innerBlocks ?? [];
        const nextInner = [...currentInner];

        if (nextColumns > currentInner.length) {
          for (let i = currentInner.length; i < nextColumns; i += 1) {
            nextInner.push({ id: createId(), type: 'column', attributes: {}, innerBlocks: [] });
          }
        } else if (nextColumns < currentInner.length) {
          nextInner.length = nextColumns;
        }

        return { ...b, attributes: { ...b.attributes, [key]: nextColumns }, innerBlocks: nextInner };
      });
      return;
    }

    if (key === 'level') {
      updateBlock(block.id, (b) => {
        const nextAttrs: Record<string, unknown> = { ...b.attributes, level: value };
        delete nextAttrs.fontSize;
        delete nextAttrs.fontWeight;
        return { ...b, attributes: nextAttrs };
      });
      return;
    }

    updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, [key]: value } }));
  };

  const setTableRowAttr = (rowIndex: number, key: string, value: unknown) => {
    if (!block || block.type !== 'table') return;
    updateBlock(block.id, (b) => ({
      ...b,
      attributes: {
        ...b.attributes,
        rowStyles: updateTableRowStyle(b.attributes, rowIndex, { [key]: value }),
      },
    }));
  };

  const setTableColumnAttr = (columnIndex: number, key: string, value: unknown) => {
    if (!block || block.type !== 'table') return;
    updateBlock(block.id, (b) => ({
      ...b,
      attributes: {
        ...b.attributes,
        columnStyles: updateTableColumnStyle(b.attributes, columnIndex, { [key]: value }),
      },
    }));
  };

  const renderRail = () => {
    const miniSections = getMiniSections();
    return (
      <div className="w-16 h-full flex flex-col items-center py-3.5 px-2 gap-2 shrink-0 animate-in fade-in duration-200">
        {/* Toggle Expand Sidebar Button */}
        <div className="flex items-center justify-center shrink-0">
          <button
            type="button"
            onClick={() => setOpen(true)}
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setHoveredSettingsTooltip({
                label: 'Expand Sidebar',
                top: rect.top + rect.height / 2,
                left: rect.left - 10,
              });
            }}
            onMouseLeave={() => setHoveredSettingsTooltip(null)}
            className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-all flex items-center justify-center cursor-pointer shadow-2xs"
            title="Expand Sidebar"
          >
            <PanelRightOpen size={18} />
          </button>
        </div>

        {/* Current Selected Block Icon */}
        <div className="my-1 flex items-center justify-center shrink-0">
          <div
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setHoveredSettingsTooltip({
                label: block ? `${block.type} Settings` : 'Block Settings',
                top: rect.top + rect.height / 2,
                left: rect.left - 10,
              });
            }}
            onMouseLeave={() => setHoveredSettingsTooltip(null)}
            className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0 cursor-pointer"
          >
            <BlockIcon size={18} />
          </div>
        </div>

        <div className="w-8 h-px bg-gray-200/80 dark:bg-gray-800 my-1 shrink-0" />

        {/* Scrollable Mini Section Icons List */}
        <div
          onScroll={() => setHoveredSettingsTooltip(null)}
          className="flex-1 min-h-0 w-full flex flex-col items-center gap-2.5 overflow-y-auto be-scroll py-1 px-0.5"
        >
          {miniSections.map((sec) => {
            const Icon = sec.icon;
            return (
              <div key={sec.id} className="flex items-center justify-center shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    sectionStateCache[sec.title] = true;
                    setOpen(true);
                  }}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredSettingsTooltip({
                      label: sec.title,
                      top: rect.top + rect.height / 2,
                      left: rect.left - 10,
                    });
                  }}
                  onMouseLeave={() => setHoveredSettingsTooltip(null)}
                  className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800/40 hover:bg-primary-50 dark:hover:bg-primary-950/40 text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 border border-gray-200/60 dark:border-gray-800 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105"
                >
                  <Icon size={17} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Dynamic Portal Floating Tooltip Rendered at exact Button Position */}
        {hoveredSettingsTooltip && typeof document !== 'undefined' && createPortal(
          <div
            style={{
              position: 'fixed',
              top: `${hoveredSettingsTooltip.top}px`,
              left: `${hoveredSettingsTooltip.left}px`,
              transform: 'translate(-100%, -50%)',
            }}
            className="px-3 py-1.5 text-xs font-bold text-white bg-slate-900/95 dark:bg-slate-800 rounded-xl shadow-2xl whitespace-nowrap pointer-events-none z-[999999] flex items-center gap-1.5 border border-slate-700/60 animate-in fade-in duration-100"
          >
            <span>{hoveredSettingsTooltip.label}</span>
          </div>,
          document.body
        )}
      </div>
    );
  };

  const renderContent = () => (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto be-scroll pr-1 pb-20 xs:pb-4">
      <div className="flex items-center gap-2.5 mb-4 p-3 rounded-2xl bg-gradient-to-r from-primary-500/10 via-indigo-500/5 to-transparent border border-primary-100 dark:border-primary-900/30">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
          <BlockIcon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-bold text-gray-900 dark:text-gray-100 capitalize block truncate">
            {block ? `${block.type} settings` : 'Block Settings'}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium block">
            {block ? 'Customize properties' : 'Select a block to edit'}
          </span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-800 transition-colors cursor-pointer shrink-0"
          title="Close settings"
        >
          <PanelRightClose size={18} />
        </button>
      </div>

      {!block && (
        <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500 bg-gray-50/50 dark:bg-gray-800/20 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 p-6">
          <Sparkles size={24} className="mx-auto mb-2 text-primary-400 animate-pulse" />
          <p className="font-medium text-gray-600 dark:text-gray-400 mb-1">No block selected</p>
          <p className="text-xs">Click any block in the canvas to customize its settings.</p>
        </div>
      )}



          {block && (block.type === 'paragraph' || block.type === 'heading' || block.type === 'quote' ||
            block.type === 'pullquote' || block.type === 'list' || block.type === 'code' || block.type === 'preformatted') && (
              <Section title="Alignment">
                <AlignControl value={a.align as TextAlign} onChange={(v) => setAttr('align', v)} />
              </Section>
            )}

          {block && typography && (
            <Section title="Typography">
              <div className="space-y-3.5">
              {/* Text Color Control */}
              <ColorPickerControl
                label="Text color"
                value={typography.textColor}
                onChange={(v) => setAttr('textColor', v)}
                defaultColor="#111827"
              />

              {/* Background Color Control */}
              <ColorPickerControl
                label="Background"
                value={typography.backgroundColor}
                onChange={(v) => setAttr('backgroundColor', v)}
                defaultColor="#ffffff"
                onClear={() => setAttr('backgroundColor', '')}
              />

              {/* Font Family Dropdown */}
              <div className="space-y-1 block text-sm">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">Font family</span>
                <CustomSelect
                  value={typography.fontFamily}
                  options={TEXT_FONT_FAMILIES.map((f) => ({ value: f.value, label: f.label }))}
                  onChange={(val) => setAttr('fontFamily', val)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1 block text-sm">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">Font size</span>
                  <CustomSelect
                    value={typography.fontSize}
                    options={Array.from({ length: (block.type === 'pullquote' ? 72 : block.type === 'heading' ? 60 : block.type === 'code' || block.type === 'preformatted' ? 28 : 48) - 11 }, (_, i) => 12 + i).map((size) => ({ value: size, label: `${size}px` }))}
                    onChange={(val) => setAttr('fontSize', Number(val))}
                  />
                </div>

                <div className="space-y-1 block text-sm">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">Weight</span>
                  <CustomSelect
                    value={typography.fontWeight}
                    options={TEXT_FONT_WEIGHTS.map((w) => ({ value: w.value, label: w.label }))}
                    onChange={(val) => setAttr('fontWeight', Number(val))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1 block text-sm">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">Line height</span>
                  <CustomSelect
                    value={typography.lineHeight}
                    options={[1.2, 1.4, 1.6, 1.7, 1.8, 2].map((v) => ({ value: v, label: String(v) }))}
                    onChange={(val) => setAttr('lineHeight', Number(val))}
                  />
                </div>

                <div className="space-y-1 block text-sm">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">Letter spacing</span>
                  <CustomSelect
                    value={typography.letterSpacing}
                    options={[-1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5].map((v) => ({ value: v, label: `${v}px` }))}
                    onChange={(val) => setAttr('letterSpacing', Number(val))}
                  />
                </div>
              </div>

              {/* Quick Text Formatting Buttons (Bold, Italic, Underline, Strikethrough) */}
              <div className="space-y-1 block text-sm">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">Text Style</span>
                <div className="p-1 bg-white dark:bg-gray-800 rounded-xl flex gap-1 border border-gray-200/80 dark:border-gray-700/80 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setAttr('fontWeight', (a.fontWeight as number) === 700 ? 400 : 700)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${(a.fontWeight as number) === 700 ? 'bg-primary-500 text-white shadow-2xs' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    title="Bold"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttr('fontStyle', a.fontStyle === 'italic' ? 'normal' : 'italic')}
                    className={`flex-1 py-1.5 rounded-lg text-xs italic font-semibold transition-all cursor-pointer ${a.fontStyle === 'italic' ? 'bg-primary-500 text-white shadow-2xs' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    title="Italic"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttr('textDecoration', a.textDecoration === 'underline' ? 'none' : 'underline')}
                    className={`flex-1 py-1.5 rounded-lg text-xs underline font-semibold transition-all cursor-pointer ${a.textDecoration === 'underline' ? 'bg-primary-500 text-white shadow-2xs' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    title="Underline"
                  >
                    U
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttr('textDecoration', a.textDecoration === 'line-through' ? 'none' : 'line-through')}
                    className={`flex-1 py-1.5 rounded-lg text-xs line-through font-semibold transition-all cursor-pointer ${a.textDecoration === 'line-through' ? 'bg-primary-500 text-white shadow-2xs' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    title="Strikethrough"
                  >
                    S
                  </button>
                </div>
              </div>

              <div className="space-y-1 block text-sm">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">Transform</span>
                <CustomSelect
                  value={typography.textTransform || 'none'}
                  options={TEXT_TRANSFORMS.map((t) => ({ value: t.value, label: t.label }))}
                  onChange={(val) => setAttr('textTransform', val)}
                />
              </div>
              </div>
            </Section>
          )}

        {block && block.type === 'heading' && (
          <Section title="Heading Level">
            <div className="p-1 bg-white dark:bg-gray-800 rounded-xl flex gap-1 border border-gray-200/80 dark:border-gray-700/80 shadow-2xs">
              {[1, 2, 3, 4, 5, 6].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setAttr('level', lvl as HeadingLevel)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${a.level === lvl ? 'bg-primary-500 text-white shadow-2xs' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  H{lvl}
                </button>
              ))}
            </div>
          </Section>
        )}

        {block && block.type === 'list' && (
          <Section title="List Style">
            <div className="grid grid-cols-2 gap-2">
              {LIST_STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setAttr('style', s.value)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer border ${a.style === s.value ? 'bg-primary-500 text-white border-primary-500 shadow-2xs' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200/80 dark:border-gray-700/80 hover:bg-gray-50 dark:hover:bg-gray-750 shadow-2xs'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </Section>
        )}

        {block && block.type === 'spacer' && (
          <Section title="Height">
            <div className="flex items-center gap-2">
              <ReactRangeSlider min={16} max={400} value={(a.height as number) || 40}
                onChange={(val) => setAttr('height', val)} />
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 w-12">{(a.height as number) || 40}px</span>
            </div>
          </Section>
        )}

        {block && block.type === 'separator' && (
          <Section title="Style">
            <div className="p-1 bg-white dark:bg-gray-800 rounded-xl flex gap-1 border border-gray-200/80 dark:border-gray-700/80 shadow-2xs">
              {['default', 'wide', 'dots'].map((s) => (
                <button
                  key={s}
                  onClick={() => setAttr('style', s)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${a.style === s ? 'bg-primary-500 text-white shadow-2xs' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </Section>
        )}

        {block && block.type === 'group' && (
          <>
            <Section title="Group Layout">
              <div className="space-y-3 text-xs">
                {/* Flex Direction */}
                <div className="space-y-1">
                  <span className="font-semibold text-gray-700 dark:text-gray-300 block">Direction</span>
                  <div className="p-1 bg-gray-100 dark:bg-gray-800 rounded-xl flex gap-1 border border-gray-200/80 dark:border-gray-700/80">
                    <button
                      type="button"
                      onClick={() => setAttr('flexDirection', 'column')}
                      className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${(a.flexDirection as string || 'column') === 'column' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                    >
                      Column (Vertical)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttr('flexDirection', 'row')}
                      className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${a.flexDirection === 'row' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                    >
                      Row (Horizontal)
                    </button>
                  </div>
                </div>

                {/* Justify Content */}
                <div className="space-y-1">
                  <span className="font-semibold text-gray-700 dark:text-gray-300 block">Justify Content</span>
                  <CustomSelect
                    value={(a.justifyContent as string) || 'flex-start'}
                    options={[
                      { value: 'flex-start', label: 'Start' },
                      { value: 'center', label: 'Center' },
                      { value: 'flex-end', label: 'End' },
                      { value: 'space-between', label: 'Space Between' },
                      { value: 'space-around', label: 'Space Around' },
                    ]}
                    onChange={(val) => setAttr('justifyContent', val)}
                  />
                </div>

                {/* Align Items */}
                <div className="space-y-1">
                  <span className="font-semibold text-gray-700 dark:text-gray-300 block">Align Items</span>
                  <CustomSelect
                    value={(a.alignItems as string) || 'stretch'}
                    options={[
                      { value: 'stretch', label: 'Stretch' },
                      { value: 'flex-start', label: 'Start' },
                      { value: 'center', label: 'Center' },
                      { value: 'flex-end', label: 'End' },
                    ]}
                    onChange={(val) => setAttr('alignItems', val)}
                  />
                </div>
              </div>
            </Section>

            <Section title="Spacing & Gap">
              <div className="space-y-3 text-xs">
                {/* Padding */}
                <RangeSliderControl
                  label="Padding"
                  min={0}
                  max={100}
                  unit="px"
                  value={typeof a.padding === 'number' ? a.padding : 24}
                  onChange={(val) => setAttr('padding', val)}
                />

                {/* Gap */}
                <RangeSliderControl
                  label="Gap"
                  min={0}
                  max={80}
                  unit="px"
                  value={typeof a.gap === 'number' ? a.gap : 16}
                  onChange={(val) => setAttr('gap', val)}
                />
              </div>
            </Section>

            <Section title="Colors & Background">
              <div className="space-y-3">
                <ColorPickerControl
                  label="Background Color"
                  value={a.backgroundColor as string}
                  onChange={(v) => setAttr('backgroundColor', v)}
                  defaultColor="#ffffff"
                  onClear={() => setAttr('backgroundColor', '')}
                />
              </div>
            </Section>

            <Section title="Border & Radius">
              <div className="space-y-3 text-xs">
                <ColorPickerControl
                  label="Border Color"
                  value={a.borderColor as string}
                  onChange={(v) => setAttr('borderColor', v)}
                  defaultColor="#e2e8f0"
                />

                <RangeSliderControl
                  label="Corner Radius"
                  min={0}
                  max={60}
                  unit="px"
                  value={typeof a.borderRadius === 'number' ? a.borderRadius : 20}
                  onChange={(val) => setAttr('borderRadius', val)}
                />
              </div>
            </Section>
          </>
        )}

        {block && block.type === 'row' && (
          <>
            <Section title="Row Layout & Columns">
              <div className="space-y-3 text-xs">
                {/* Layout Ratio Presets */}
                <div className="space-y-1">
                  <span className="font-semibold text-gray-700 dark:text-gray-300 block">Layout Preset</span>
                  <CustomSelect
                    value={(a.layoutRatio as string) || '50-50'}
                    options={[
                      { value: '100', label: '1 Column (100%)' },
                      { value: '50-50', label: '2 Columns (50 / 50)' },
                      { value: '70-30', label: '2 Columns (70 / 30)' },
                      { value: '30-70', label: '2 Columns (30 / 70)' },
                      { value: '33-33-33', label: '3 Columns (33 / 33 / 33)' },
                      { value: '25-25-25-25', label: '4 Columns (25 / 25 / 25 / 25)' },
                      { value: '40-30-30', label: '3 Columns (40 / 30 / 30)' },
                      { value: '20-40-40', label: '3 Columns (20 / 40 / 40)' },
                    ]}
                    onChange={(val) => {
                      setAttr('layoutRatio', val);
                    }}
                  />
                </div>

                {/* Align Items */}
                <div className="space-y-1">
                  <span className="font-semibold text-gray-700 dark:text-gray-300 block">Align Items (Vertical)</span>
                  <CustomSelect
                    value={(a.alignItems as string) || 'stretch'}
                    options={[
                      { value: 'stretch', label: 'Stretch (Equal Height)' },
                      { value: 'flex-start', label: 'Top' },
                      { value: 'center', label: 'Middle' },
                      { value: 'flex-end', label: 'Bottom' },
                    ]}
                    onChange={(val) => setAttr('alignItems', val)}
                  />
                </div>

                {/* Justify Content */}
                <div className="space-y-1">
                  <span className="font-semibold text-gray-700 dark:text-gray-300 block">Justify Content</span>
                  <CustomSelect
                    value={(a.justifyContent as string) || 'flex-start'}
                    options={[
                      { value: 'flex-start', label: 'Start' },
                      { value: 'center', label: 'Center' },
                      { value: 'flex-end', label: 'End' },
                      { value: 'space-between', label: 'Space Between' },
                    ]}
                    onChange={(val) => setAttr('justifyContent', val)}
                  />
                </div>
              </div>
            </Section>

            <Section title="Row Spacing & Gap">
              <div className="space-y-3 text-xs">
                <RangeSliderControl
                  label="Column Gap"
                  min={0}
                  max={60}
                  unit="px"
                  value={typeof a.gap === 'number' ? a.gap : 20}
                  onChange={(val) => setAttr('gap', val)}
                />

                <RangeSliderControl
                  label="Row Padding"
                  min={0}
                  max={80}
                  unit="px"
                  value={typeof a.padding === 'number' ? a.padding : 16}
                  onChange={(val) => setAttr('padding', val)}
                />
              </div>
            </Section>

            <Section title="Row Background & Colors">
              <div className="space-y-3">
                <ColorPickerControl
                  label="Background Color"
                  value={a.backgroundColor as string}
                  onChange={(v) => setAttr('backgroundColor', v)}
                  defaultColor="#ffffff"
                  onClear={() => setAttr('backgroundColor', '')}
                />
              </div>
            </Section>
          </>
        )}

        {block && block.type === 'column' && (
          <>
            <Section title="Column Width & Alignment">
              <div className="space-y-3 text-xs">
                {/* Column Ratio / Width */}
                <div className="space-y-1">
                  <span className="font-semibold text-gray-700 dark:text-gray-300 block">Width Ratio</span>
                  <input
                    type="text"
                    value={(a.widthRatio as string) || '50%'}
                    onChange={(e) => setAttr('widthRatio', e.target.value)}
                    placeholder="e.g. 50%, 300px, 1fr"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 outline-none"
                  />
                </div>

                {/* Vertical Alignment */}
                <div className="space-y-1">
                  <span className="font-semibold text-gray-700 dark:text-gray-300 block">Vertical Alignment</span>
                  <CustomSelect
                    value={(a.verticalAlign as string) || 'flex-start'}
                    options={[
                      { value: 'flex-start', label: 'Top' },
                      { value: 'center', label: 'Middle' },
                      { value: 'flex-end', label: 'Bottom' },
                    ]}
                    onChange={(val) => setAttr('verticalAlign', val)}
                  />
                </div>
              </div>
            </Section>

            <Section title="Column Spacing & Background">
              <div className="space-y-3 text-xs">
                <ColorPickerControl
                  label="Background Color"
                  value={a.backgroundColor as string}
                  onChange={(v) => setAttr('backgroundColor', v)}
                  defaultColor="transparent"
                  onClear={() => setAttr('backgroundColor', '')}
                />

                <RangeSliderControl
                  label="Padding"
                  min={0}
                  max={60}
                  unit="px"
                  value={typeof a.padding === 'number' ? a.padding : 0}
                  onChange={(val) => setAttr('padding', val)}
                />
              </div>
            </Section>
          </>
        )}

        {block && block.type === 'gallery' && (() => {
          const images = (a.images as any[]) ?? [];
          const sIdx = typeof a.selectedImageIndex === 'number' && a.selectedImageIndex >= 0 && a.selectedImageIndex < images.length ? a.selectedImageIndex : null;

          // helper to update single image properties in the images array
          const updateSingleImage = (updater: (img: any) => any) => {
            if (sIdx === null) return;
            updateBlock(block.id, (b) => {
              const list = [...((b.attributes.images as any[]) ?? [])];
              if (list[sIdx]) {
                list[sIdx] = updater(list[sIdx]);
              }
              return { ...b, attributes: { ...b.attributes, images: list } };
            });
          };

          const selectedImg = sIdx !== null ? (images[sIdx] || {}) : null;

          return (
            <>
              {/* IF INDIVIDUAL IMAGE IS SELECTED: SHOW IMAGE SPECIFIC CONTROLS FIRST */}
              {selectedImg && sIdx !== null && (
                <div className="mb-4 space-y-3 pb-4 border-b border-gray-200 dark:border-gray-800">
                  <div className="p-2.5 bg-primary-50 dark:bg-primary-950/50 rounded-xl border border-primary-200 dark:border-primary-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-primary-700 dark:text-primary-300">
                      Editing Image #{sIdx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAttr('selectedImageIndex', null)}
                      className="text-[11px] font-bold text-primary-600 dark:text-primary-400 hover:underline cursor-pointer"
                    >
                      Deselect Image
                    </button>
                  </div>

                  {/* General (Alt Text, Caption, Link, Open in new tab) */}
                  <Section title={`Image #${sIdx + 1} Settings`}>
                    <div className="space-y-3 text-xs">
                      <label className="space-y-1 block">
                        <span className="text-gray-500 font-medium block">Alt Text</span>
                        <input
                          type="text"
                          value={selectedImg.alt || ''}
                          onChange={(e) => updateSingleImage((img) => ({ ...img, alt: e.target.value }))}
                          placeholder="Describe image for SEO & accessibility"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none"
                        />
                      </label>

                      <label className="space-y-1 block">
                        <span className="text-gray-500 font-medium block">Caption</span>
                        <input
                          type="text"
                          value={selectedImg.caption || ''}
                          onChange={(e) => updateSingleImage((img) => ({ ...img, caption: e.target.value }))}
                          placeholder="Image caption text..."
                          className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none"
                        />
                      </label>

                      <label className="space-y-1 block">
                        <span className="text-gray-500 font-medium block">Link URL</span>
                        <input
                          type="text"
                          value={selectedImg.link || ''}
                          onChange={(e) => updateSingleImage((img) => ({ ...img, link: e.target.value }))}
                          placeholder="https://example.com"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none"
                        />
                      </label>

                      <ToggleControl
                        label="Open In New Tab"
                        checked={selectedImg.linkTarget === '_blank'}
                        onChange={(checked) => updateSingleImage((img) => ({ ...img, linkTarget: checked ? '_blank' : '_self' }))}
                      />
                    </div>
                  </Section>

                  {/* Image Style */}
                  <Section title={`Image #${sIdx + 1} Style`}>
                    <div className="space-y-3 text-xs">

                      <RangeSliderControl
                        label="Border Radius"
                        min={0}
                        max={32}
                        unit="px"
                        value={selectedImg.borderRadius ?? 12}
                        onChange={(val) => updateSingleImage((img) => ({ ...img, borderRadius: val }))}
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <label className="space-y-1 block">
                          <span className="text-gray-500 block">Border Width</span>
                          <input
                            type="number"
                            min={0}
                            max={10}
                            value={selectedImg.borderWidth ?? 0}
                            onChange={(e) => updateSingleImage((img) => ({ ...img, borderWidth: parseInt(e.target.value, 10) }))}
                            className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                          />
                        </label>

                        <ColorPickerControl
                          label="Border Color"
                          value={selectedImg.borderColor}
                          onChange={(v) => updateSingleImage((img) => ({ ...img, borderColor: v }))}
                          defaultColor="#3b82f6"
                        />
                      </div>

                      <div className="space-y-1">
                        <span className="text-gray-500 font-medium block">Shadow</span>
                        <CustomSelect
                          value={selectedImg.shadow || 'none'}
                          options={[
                            { value: 'none', label: 'None' },
                            { value: 'sm', label: 'Small' },
                            { value: 'md', label: 'Medium' },
                            { value: 'lg', label: 'Large' },
                            { value: 'xl', label: 'Extra Large' },
                          ]}
                          onChange={(val) => updateSingleImage((img) => ({ ...img, shadow: String(val) }))}
                        />
                      </div>

                      <RangeSliderControl
                        label="Opacity"
                        min={10}
                        max={100}
                        unit="%"
                        value={selectedImg.opacity ?? 100}
                        onChange={(val) => updateSingleImage((img) => ({ ...img, opacity: val }))}
                      />
                    </div>
                  </Section>
                </div>
              )}

              {/* ALWAYS SHOW GALLERY CONTAINER SETTINGS */}
              {/* General */}
              <Section title="Gallery Settings">
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-gray-500 block mb-1 font-semibold">Number of Columns: {(a.columns as number) || 3}</span>
                    <div className="p-1 bg-white dark:bg-gray-800 rounded-xl flex gap-1 border border-gray-200/80 dark:border-gray-700/80 shadow-2xs">
                      {[1, 2, 3, 4, 5, 6].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setAttr('columns', c)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${a.columns === c ? 'bg-primary-500 text-white shadow-2xs' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <RangeSliderControl
                    label="Gap / Spacing"
                    value={(a.gap as number) ?? 12}
                    min={0}
                    max={48}
                    unit="px"
                    onChange={(val) => setAttr('gap', val)}
                  />

                  <div className="space-y-1">
                    <span className="text-gray-500 font-semibold block">Image Ratio</span>
                    <CustomSelect
                      value={(a.imageRatio as string) || 'original'}
                      options={[
                        { value: 'original', label: 'Original' },
                        { value: '1:1', label: 'Square (1:1)' },
                        { value: '4:3', label: 'Standard (4:3)' },
                        { value: '16:9', label: 'Widescreen (16:9)' },
                        { value: '3:2', label: 'Classic (3:2)' },
                      ]}
                      onChange={(val) => setAttr('imageRatio', String(val))}
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-gray-500 font-semibold block">Layout Type</span>
                    <CustomSelect
                      value={(a.layoutType as string) || 'grid'}
                      options={[
                        { value: 'grid', label: 'Grid Layout' },
                        { value: 'masonry', label: 'Masonry Layout' },
                      ]}
                      onChange={(val) => setAttr('layoutType', String(val))}
                    />
                  </div>

                  <ToggleControl
                    label="Show Image Captions"
                    checked={a.showCaptions !== false}
                    onChange={(checked) => setAttr('showCaptions', checked)}
                  />
                </div>
              </Section>

              {/* Borders */}
              <Section title="Borders">
                <div className="space-y-3 text-xs">
                  <RangeSliderControl
                    label="Border Radius"
                    value={(a.borderRadius as number) ?? 12}
                    min={0}
                    max={32}
                    unit="px"
                    onChange={(val) => setAttr('borderRadius', val)}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1 block">
                      <span className="text-gray-500 block">Border Width</span>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={(a.borderWidth as number) ?? 0}
                        onChange={(e) => setAttr('borderWidth', parseInt(e.target.value, 10))}
                        className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                      />
                    </label>

                    <ColorPickerControl
                      label="Border Color"
                      value={a.borderColor as string}
                      onChange={(v) => setAttr('borderColor', v)}
                      defaultColor="#e2e8f0"
                    />
                  </div>
                </div>
              </Section>
            </>
          );
        })()}

        {block && block.type === 'cover' && (
          <>
            {/* Background Image */}
            <Section title="Background Image">
              <div className="space-y-3 text-xs">
                {/* File Upload & URL */}
                <div className="space-y-2">
                  <label className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/80 cursor-pointer transition-colors">
                    <Upload size={14} /> Upload Image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files ?? []);
                        if (files.length > 0) {
                          const url = await fileToDataUrl(files[0]);
                          setAttr('url', url);
                        }
                      }}
                    />
                  </label>

                  <div className="space-y-1">
                    <span className="text-gray-500 font-medium block">Image URL</span>
                    <input
                      type="text"
                      value={(a.url as string) || ''}
                      onChange={(e) => setAttr('url', e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none"
                    />
                  </div>

                  {Boolean(a.url) && (
                    <button
                      type="button"
                      onClick={() => setAttr('url', '')}
                      className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors cursor-pointer"
                    >
                      Remove Image
                    </button>
                  )}
                </div>
              </div>
            </Section>

            {/* Image Settings */}
            <Section title="Image Settings">
              <div className="space-y-3 text-xs">
                {/* Focal Point Picker */}
                <div className="space-y-1">
                  <span className="text-gray-500 font-semibold block">Focal Point Picker</span>
                  <div
                    className="relative w-full h-32 rounded-xl overflow-hidden border border-gray-300 dark:border-gray-700 cursor-crosshair bg-slate-900 shadow-inner"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                      const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                      setAttr('focalPoint', { x, y });
                    }}
                  >
                    {Boolean(a.url) && (
                      <img
                        src={a.url as string}
                        alt="Focal preview"
                        className="w-full h-full object-cover opacity-60 pointer-events-none"
                      />
                    )}
                    {/* Focal Dot Indicator */}
                    <div
                      className="absolute w-5 h-5 rounded-full border-2 border-white bg-primary-500 shadow-lg pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-all flex items-center justify-center"
                      style={{
                        left: `${((a.focalPoint as any)?.x ?? 50)}%`,
                        top: `${((a.focalPoint as any)?.y ?? 50)}%`,
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 block text-right">
                    X: {((a.focalPoint as any)?.x ?? 50)}%, Y: {((a.focalPoint as any)?.y ?? 50)}%
                  </span>
                </div>

                {/* Background Size */}
                <div className="space-y-1">
                  <span className="text-gray-500 font-medium block">Background Size</span>
                  <CustomSelect
                    value={(a.backgroundSize as string) || 'cover'}
                    options={[
                      { value: 'cover', label: 'Cover' },
                      { value: 'contain', label: 'Contain' },
                      { value: 'auto', label: 'Auto' },
                    ]}
                    onChange={(val) => setAttr('backgroundSize', String(val))}
                  />
                </div>

                {/* Background Position */}
                <div className="space-y-1">
                  <span className="text-gray-500 font-medium block">Background Position</span>
                  <CustomSelect
                    value={(a.backgroundPosition as string) || 'center'}
                    options={[
                      { value: 'top', label: 'Top' },
                      { value: 'center', label: 'Center' },
                      { value: 'bottom', label: 'Bottom' },
                      { value: 'left', label: 'Left' },
                      { value: 'right', label: 'Right' },
                    ]}
                    onChange={(val) => setAttr('backgroundPosition', String(val))}
                  />
                </div>

                {/* Background Repeat */}
                <div className="space-y-1">
                  <span className="text-gray-500 font-medium block">Background Repeat</span>
                  <CustomSelect
                    value={(a.backgroundRepeat as string) || 'no-repeat'}
                    options={[
                      { value: 'no-repeat', label: 'No Repeat' },
                      { value: 'repeat', label: 'Repeat' },
                      { value: 'repeat-x', label: 'Repeat X' },
                      { value: 'repeat-y', label: 'Repeat Y' },
                    ]}
                    onChange={(val) => setAttr('backgroundRepeat', String(val))}
                  />
                </div>

                {/* Background Attachment */}
                <div className="space-y-1">
                  <span className="text-gray-500 font-medium block">Background Attachment</span>
                  <CustomSelect
                    value={(a.backgroundAttachment as string) || 'scroll'}
                    options={[
                      { value: 'scroll', label: 'Scroll' },
                      { value: 'fixed', label: 'Fixed (Parallax)' },
                    ]}
                    onChange={(val) => setAttr('backgroundAttachment', String(val))}
                  />
                </div>
              </div>
            </Section>

            {/* Overlay */}
            <Section title="Overlay">
              <div className="space-y-3 text-xs">
                <ColorPickerControl
                  label="Overlay Color"
                  value={a.overlayColor as string}
                  onChange={(v) => setAttr('overlayColor', v)}
                  defaultColor="#000000"
                />

                <RangeSliderControl
                  label="Overlay Opacity"
                  value={typeof a.overlayOpacity === 'number' ? a.overlayOpacity : (typeof a.overlay === 'number' ? a.overlay : 50)}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(val) => setAttr('overlayOpacity', val)}
                />
              </div>
            </Section>

            {/* Layout */}
            <Section title="Layout">
              <div className="space-y-3 text-xs">
                {/* Height Presets */}
                <div className="space-y-1">
                  <span className="text-gray-500 font-semibold block">Height</span>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    {[
                      { label: 'Small', val: '300px' },
                      { label: 'Medium', val: '450px' },
                      { label: 'Large', val: '600px' },
                      { label: 'Full Screen', val: '100vh' },
                    ].map((hp) => (
                      <button
                        key={hp.val}
                        type="button"
                        onClick={() => setAttr('minHeight', hp.val)}
                        className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${a.minHeight === hp.val ? 'bg-primary-500 text-white shadow-2xs' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                      >
                        {hp.label}
                      </button>
                    ))}
                  </div>

                  <div className="pt-1">
                    <span className="text-gray-500 font-medium block mb-1">Custom Height</span>
                    <input
                      type="text"
                      value={(a.minHeight as string) || '450px'}
                      onChange={(e) => setAttr('minHeight', e.target.value)}
                      placeholder="e.g. 450px or 80vh"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none"
                    />
                  </div>
                </div>

                {/* Content Width */}
                <div className="space-y-1">
                  <span className="text-gray-500 font-semibold block">Content Width</span>
                  <CustomSelect
                    value={(a.contentWidth as string) || '800px'}
                    options={[
                      { value: '600px', label: 'Small (600px)' },
                      { value: '800px', label: 'Medium (800px)' },
                      { value: '1100px', label: 'Large (1100px)' },
                      { value: '100%', label: 'Full Width (100%)' },
                    ]}
                    onChange={(val) => setAttr('contentWidth', String(val))}
                  />
                </div>

                {/* Vertical Alignment */}
                <div className="space-y-1">
                  <span className="text-gray-500 font-semibold block">Vertical Alignment</span>
                  <div className="p-1 bg-white dark:bg-gray-800 rounded-xl flex gap-1 border border-gray-200 dark:border-gray-700">
                    {[
                      { label: 'Top', val: 'top' },
                      { label: 'Center', val: 'center' },
                      { label: 'Bottom', val: 'bottom' },
                    ].map((va) => (
                      <button
                        key={va.val}
                        type="button"
                        onClick={() => setAttr('verticalAlign', va.val)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${(a.verticalAlign || 'center') === va.val ? 'bg-primary-500 text-white shadow-2xs' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                      >
                        {va.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Horizontal Alignment */}
                <div className="space-y-1">
                  <span className="text-gray-500 font-semibold block">Horizontal Alignment</span>
                  <div className="p-1 bg-white dark:bg-gray-800 rounded-xl flex gap-1 border border-gray-200 dark:border-gray-700">
                    {[
                      { label: 'Left', val: 'left' },
                      { label: 'Center', val: 'center' },
                      { label: 'Right', val: 'right' },
                    ].map((ha) => (
                      <button
                        key={ha.val}
                        type="button"
                        onClick={() => setAttr('horizontalAlign', ha.val)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${(a.horizontalAlign || 'center') === ha.val ? 'bg-primary-500 text-white shadow-2xs' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                      >
                        {ha.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            {/* Cover Caption & Typography */}
            <Section title="Caption & Typography">
              <div className="space-y-3 text-xs">
                <ToggleControl
                  label="Enable Cover Caption"
                  checked={a.showCaption !== false}
                  onChange={(checked) => setAttr('showCaption', checked)}
                />

                {a.showCaption !== false && (
                  <>
                    <div className="space-y-1">
                      <span className="text-gray-500 font-semibold block">Caption Text</span>
                      <input
                        type="text"
                        value={Array.isArray(a.caption) && a.caption[0]?.text ? a.caption[0].text : (typeof a.caption === 'string' ? a.caption : '')}
                        onChange={(e) => setAttr('caption', [{ text: e.target.value }])}
                        placeholder="Enter cover caption…"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 outline-none text-xs focus:border-primary-500"
                      />
                    </div>
                    <ColorPickerControl
                      label="Caption Text Color"
                      value={(a.captionStyle as any)?.textColor}
                      onChange={(val) => {
                        const curr = (a.captionStyle as Record<string, any>) || {};
                        setAttr('captionStyle', { ...curr, textColor: val });
                      }}
                      defaultColor="#ffffff"
                      onClear={() => {
                        const curr = (a.captionStyle as Record<string, any>) || {};
                        const { textColor: _textColor, ...rest } = curr;
                        setAttr('captionStyle', rest);
                      }}
                    />

                    <ColorPickerControl
                      label="Caption Background Color"
                      value={(a.captionStyle as any)?.backgroundColor}
                      onChange={(val) => {
                        const curr = (a.captionStyle as Record<string, any>) || {};
                        setAttr('captionStyle', { ...curr, backgroundColor: val });
                      }}
                      defaultColor="#ffffff"
                      onClear={() => {
                        const curr = (a.captionStyle as Record<string, any>) || {};
                        const { backgroundColor: _backgroundColor, ...rest } = curr;
                        setAttr('captionStyle', rest);
                      }}
                    />

                    <RangeSliderControl
                      label="Font Size"
                      min={10}
                      max={32}
                      unit="px"
                      value={(a.captionStyle as any)?.fontSize ?? 14}
                      onChange={(val) => {
                        const curr = (a.captionStyle as Record<string, any>) || {};
                        setAttr('captionStyle', { ...curr, fontSize: val });
                      }}
                    />

                    <div className="space-y-1">
                      <span className="text-gray-500 font-semibold block">Caption Formatting</span>
                      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                        <button
                          type="button"
                          onClick={() => {
                            const curr = (a.captionStyle as Record<string, any>) || {};
                            setAttr('captionStyle', { ...curr, bold: !curr.bold });
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${(a.captionStyle as any)?.bold
                            ? 'bg-primary-600 text-white shadow-xs'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                        >
                          B
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const curr = (a.captionStyle as Record<string, any>) || {};
                            setAttr('captionStyle', { ...curr, italic: !curr.italic });
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-serif italic font-semibold transition-all cursor-pointer ${(a.captionStyle as any)?.italic
                            ? 'bg-primary-600 text-white shadow-xs'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                        >
                          I
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const curr = (a.captionStyle as Record<string, any>) || {};
                            setAttr('captionStyle', { ...curr, underline: !curr.underline });
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-xs underline font-semibold transition-all cursor-pointer ${(a.captionStyle as any)?.underline
                            ? 'bg-primary-600 text-white shadow-xs'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                        >
                          U
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-gray-500 font-semibold block">Font Weight</span>
                      <CustomSelect
                        value={String((a.captionStyle as any)?.fontWeight ?? 400)}
                        options={TEXT_FONT_WEIGHTS.map((fw) => ({ value: String(fw.value), label: fw.label }))}
                        onChange={(val) => {
                          const curr = (a.captionStyle as Record<string, any>) || {};
                          setAttr('captionStyle', { ...curr, fontWeight: Number(val) });
                        }}
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-gray-500 font-semibold block">Font Family</span>
                      <CustomSelect
                        value={(a.captionStyle as any)?.fontFamily || 'system'}
                        options={TEXT_FONT_FAMILIES.map((f) => ({ value: f.value, label: f.label }))}
                        onChange={(val) => {
                          const curr = (a.captionStyle as Record<string, any>) || {};
                          setAttr('captionStyle', { ...curr, fontFamily: String(val) });
                        }}
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-gray-500 font-semibold block">Caption Alignment</span>
                      <AlignControl
                        value={(a.captionStyle as any)?.align || 'center'}
                        onChange={(val) => {
                          const curr = (a.captionStyle as Record<string, any>) || {};
                          setAttr('captionStyle', { ...curr, align: val });
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            </Section>

            {/* Advanced */}
            <Section title="Advanced">
              <div className="space-y-3 text-xs">
                <label className="space-y-1 block">
                  <span className="text-gray-500 font-medium block">Additional CSS class(es)</span>
                  <input
                    type="text"
                    value={(a.customCssClass as string) || ''}
                    onChange={(e) => setAttr('customCssClass', e.target.value)}
                    placeholder="e.g. my-custom-cover"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none"
                  />
                </label>

                <label className="space-y-1 block">
                  <span className="text-gray-500 font-medium block">HTML Anchor / Custom ID</span>
                  <input
                    type="text"
                    value={(a.customId as string) || ''}
                    onChange={(e) => setAttr('customId', e.target.value)}
                    placeholder="e.g. hero-cover"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none"
                  />
                </label>
              </div>
            </Section>
          </>
        )}

        {block && block.type === 'media-text' && (
          <>
            {/* Media Settings */}
            <Section title="Media Settings">
              <div className="space-y-3 text-xs">
                {/* Upload & URL */}
                <div className="space-y-2">
                  <label className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/80 cursor-pointer transition-colors">
                    <Upload size={14} /> Upload Media
                    <input
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files ?? []);
                        if (files.length > 0) {
                          const url = await fileToDataUrl(files[0]);
                          const isVideo = files[0].type.startsWith('video/');
                          setAttr('mediaUrl', url);
                          setAttr('mediaType', isVideo ? 'video' : 'image');
                        }
                      }}
                    />
                  </label>

                  <div className="space-y-1">
                    <span className="text-gray-500 font-medium block">Media URL</span>
                    <input
                      type="text"
                      value={(a.mediaUrl as string) || ''}
                      onChange={(e) => setAttr('mediaUrl', e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-gray-500 font-medium block">Alternative Text (Alt)</span>
                    <input
                      type="text"
                      value={(a.mediaAlt as string) || ''}
                      onChange={(e) => setAttr('mediaAlt', e.target.value)}
                      placeholder="Describe media for accessibility"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none text-xs"
                    />
                  </div>

                  {Boolean(a.mediaUrl) && (
                    <button
                      type="button"
                      onClick={() => setAttr('mediaUrl', '')}
                      className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors cursor-pointer"
                    >
                      Remove Media
                    </button>
                  )}
                </div>

                <ToggleControl
                  label="Crop media to fill entire column"
                  checked={Boolean(a.imageFill)}
                  onChange={(checked) => setAttr('imageFill', checked)}
                />
              </div>
            </Section>

            {/* Layout & Positioning */}
            <Section title="Layout & Positioning">
              <div className="space-y-3 text-xs">
                {/* Media Position */}
                <div className="space-y-1">
                  <span className="text-gray-500 font-semibold block">Media Position</span>
                  <div className="p-1 bg-white dark:bg-gray-800 rounded-xl flex gap-1 border border-gray-200 dark:border-gray-700">
                    {[
                      { label: 'Media on Left', val: 'left' },
                      { label: 'Media on Right', val: 'right' },
                    ].map((pos) => (
                      <button
                        key={pos.val}
                        type="button"
                        onClick={() => setAttr('mediaPosition', pos.val)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${(a.mediaPosition || 'left') === pos.val ? 'bg-primary-500 text-white shadow-2xs' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Media Width Slider */}
                <RangeSliderControl
                  label="Media Width"
                  value={typeof a.mediaWidth === 'number' ? a.mediaWidth : 50}
                  min={15}
                  max={85}
                  unit="%"
                  onChange={(val) => setAttr('mediaWidth', val)}
                />

                {/* Vertical Alignment */}
                <div className="space-y-1">
                  <span className="text-gray-500 font-semibold block">Vertical Alignment</span>
                  <div className="p-1 bg-white dark:bg-gray-800 rounded-xl flex gap-1 border border-gray-200 dark:border-gray-700">
                    {[
                      { label: 'Top', val: 'top' },
                      { label: 'Center', val: 'center' },
                      { label: 'Bottom', val: 'bottom' },
                    ].map((va) => (
                      <button
                        key={va.val}
                        type="button"
                        onClick={() => setAttr('verticalAlign', va.val)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${(a.verticalAlign || 'center') === va.val ? 'bg-primary-500 text-white shadow-2xs' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                      >
                        {va.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stack on Mobile */}
                <ToggleControl
                  label="Stack on Mobile (<= 768px)"
                  checked={a.stackOnMobile !== false}
                  onChange={(checked) => setAttr('stackOnMobile', checked)}
                />
              </div>
            </Section>

            {/* Colors */}
            <Section title="Colors">
              <div className="space-y-3 text-xs">
                <ColorPickerControl
                  label="Text Color"
                  value={a.textColor as string}
                  onChange={(v) => setAttr('textColor', v)}
                  defaultColor="#111827"
                  onClear={() => setAttr('textColor', '')}
                />
                <ColorPickerControl
                  label="Background Color"
                  value={a.backgroundColor as string}
                  onChange={(v) => setAttr('backgroundColor', v)}
                  defaultColor="#ffffff"
                  onClear={() => setAttr('backgroundColor', '')}
                />
              </div>
            </Section>
          </>
        )}

        {block && block.type === 'button' && (
          <>
            <Section title="Link Settings">
              <div className="space-y-3 text-xs">
                <label className="space-y-1 block">
                  <span className="text-gray-500 font-medium block">Button Text</span>
                  <input
                    type="text"
                    value={(a.text as string) || ''}
                    onChange={(e) => setAttr('text', e.target.value)}
                    placeholder="Click Me"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none"
                  />
                </label>

                <label className="space-y-1 block">
                  <span className="text-gray-500 font-medium block">Link URL</span>
                  <input
                    type="text"
                    value={(a.url as string) || ''}
                    onChange={(e) => setAttr('url', e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none"
                  />
                </label>

                <ToggleControl
                  label="Open In New Tab"
                  checked={a.linkTarget === '_blank'}
                  onChange={(checked) => setAttr('linkTarget', checked ? '_blank' : '_self')}
                />
              </div>
            </Section>

            <Section title="Button Width">
              <div className="p-1 bg-white dark:bg-gray-800 rounded-xl flex gap-1 border border-gray-200/80 dark:border-gray-700/80 shadow-2xs">
                {['auto', '25%', '50%', '75%', '100%'].map((w) => (
                  <button
                    key={w}
                    onClick={() => setAttr('width', w)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${(a.width || 'auto') === w ? 'bg-primary-500 text-white shadow-2xs' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Alignment">
              <AlignControl value={a.align as TextAlign} onChange={(v) => setAttr('align', v)} />
            </Section>
            <Section title="Style">
              <div className="p-1 bg-white dark:bg-gray-800 rounded-xl flex gap-1 border border-gray-200/80 dark:border-gray-700/80 shadow-2xs">
                {['fill', 'outline'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setAttr('style', s)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${a.style === s ? 'bg-primary-500 text-white shadow-2xs' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Section>
            <Section title="Colors">
              <div className="space-y-2">
                <ColorPickerControl
                  label="Background"
                  value={a.color as string}
                  onChange={(v) => setAttr('color', v)}
                  defaultColor="#3b82f6"
                />
                <ColorPickerControl
                  label="Text"
                  value={a.textColor as string}
                  onChange={(v) => setAttr('textColor', v)}
                  defaultColor="#ffffff"
                />
              </div>
            </Section>
            <Section title="Border Radius">
              <div className="flex items-center gap-2">
                <ReactRangeSlider min={0} max={30} value={(a.radius as number) || 0}
                  onChange={(val) => setAttr('radius', val)} />
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 w-12">{(a.radius as number) || 0}px</span>
              </div>
            </Section>
          </>
        )}

        {block && block.type === 'columns' && (
          <>
            <Section title="Layout Mode">
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <span className="text-gray-500 font-semibold block">Display Mode</span>
                  <div className="p-1 bg-white dark:bg-gray-800 rounded-xl flex gap-1 border border-gray-200/80 dark:border-gray-700/80 shadow-2xs">
                    {[
                      { label: 'Grid', val: 'grid' },
                      { label: 'Flex (d-flex)', val: 'flex' },
                      { label: 'Center (d-flex)', val: 'center-flex' },
                    ].map((m) => {
                      const isSelected = m.val === 'center-flex'
                        ? a.layoutMode === 'flex' && a.alignItems === 'center' && a.justifyContent === 'center'
                        : (a.layoutMode || 'grid') === m.val && !(a.alignItems === 'center' && a.justifyContent === 'center');
                      return (
                        <button
                          key={m.val}
                          type="button"
                          onClick={() => {
                            if (m.val === 'center-flex') {
                              setAttr('layoutMode', 'flex');
                              setAttr('alignItems', 'center');
                              setAttr('justifyContent', 'center');
                            } else {
                              setAttr('layoutMode', m.val);
                            }
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${isSelected ? 'bg-primary-500 text-white shadow-2xs' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {(a.layoutMode || 'grid') === 'grid' && (
                  <div className="space-y-1">
                    <span className="text-gray-500 font-semibold block">Columns Count</span>
                    <div className="p-1 bg-white dark:bg-gray-800 rounded-xl flex gap-1 border border-gray-200/80 dark:border-gray-700/80 shadow-2xs">
                      {[1, 2, 3, 4].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setAttr('columns', c)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${a.columns === c ? 'bg-primary-500 text-white shadow-2xs' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Section>

            {(a.layoutMode || 'grid') === 'flex' && (
              <Section title="Flexbox Settings (d-flex)">
                <div className="space-y-3 text-xs">
                  {/* Quick Center Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setAttr('alignItems', 'center');
                      setAttr('justifyContent', 'center');
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/50 dark:hover:bg-primary-900/60 text-primary-700 dark:text-primary-300 font-semibold text-xs border border-primary-200 dark:border-primary-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    ✨ 1-Click Center Both (Vertical & Horizontal)
                  </button>
                  {/* Flex Direction */}
                  <div className="space-y-1">
                    <span className="text-gray-500 font-semibold block">Flex Direction</span>
                    <CustomSelect
                      value={(a.flexDirection as string) || 'row'}
                      options={[
                        { value: 'row', label: 'Row (Horizontal)' },
                        { value: 'column', label: 'Column (Vertical)' },
                        { value: 'row-reverse', label: 'Row Reverse' },
                        { value: 'column-reverse', label: 'Column Reverse' },
                      ]}
                      onChange={(val) => setAttr('flexDirection', val)}
                    />
                  </div>

                  {/* Vertical Align (Align Items) */}
                  <div className="space-y-1">
                    <span className="text-gray-500 font-semibold block">Align Items (Vertical)</span>
                    <CustomSelect
                      value={(a.alignItems as string) || 'stretch'}
                      options={[
                        { value: 'stretch', label: 'Stretch' },
                        { value: 'flex-start', label: 'Top (flex-start)' },
                        { value: 'center', label: 'Center' },
                        { value: 'flex-end', label: 'Bottom (flex-end)' },
                        { value: 'baseline', label: 'Baseline' },
                      ]}
                      onChange={(val) => setAttr('alignItems', val)}
                    />
                  </div>

                  {/* Justify Content (Horizontal) */}
                  <div className="space-y-1">
                    <span className="text-gray-500 font-semibold block">Justify Content (Horizontal)</span>
                    <CustomSelect
                      value={(a.justifyContent as string) || 'flex-start'}
                      options={[
                        { value: 'flex-start', label: 'Start (flex-start)' },
                        { value: 'center', label: 'Center' },
                        { value: 'flex-end', label: 'End (flex-end)' },
                        { value: 'space-between', label: 'Space Between' },
                        { value: 'space-around', label: 'Space Around' },
                        { value: 'space-evenly', label: 'Space Evenly' },
                      ]}
                      onChange={(val) => setAttr('justifyContent', val)}
                    />
                  </div>

                  {/* Flex Wrap */}
                  <div className="space-y-1">
                    <span className="text-gray-500 font-semibold block">Flex Wrap</span>
                    <CustomSelect
                      value={(a.flexWrap as string) || 'wrap'}
                      options={[
                        { value: 'wrap', label: 'Wrap' },
                        { value: 'nowrap', label: 'No Wrap' },
                      ]}
                      onChange={(val) => setAttr('flexWrap', val)}
                    />
                  </div>
                </div>
              </Section>
            )}

            <Section title="Spacing & Gap">
              <div className="space-y-3 text-xs">
                <RangeSliderControl
                  label="Gap / Spacing"
                  min={0}
                  max={64}
                  step={4}
                  unit="px"
                  value={typeof a.gap === 'number' ? a.gap : (a.gap ? parseInt(String(a.gap), 10) : 16)}
                  onChange={(val) => setAttr('gap', val)}
                />
              </div>
            </Section>
          </>
        )}

        {block && block.type === 'code' && (
          <>
            <Section title="General">
              <div className="space-y-3">
                <div className="space-y-1 p-2 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
                  <span className="text-[11px] text-gray-500 font-medium block">Detected Language</span>
                  <span className="text-xs font-bold text-primary-600 dark:text-primary-400 block uppercase tracking-wider">
                    {(a.language as string) || 'Plain Text'}
                  </span>
                </div>

                <div className="space-y-2 pt-1">
                  <ToggleControl
                    label="Show Copy Button"
                    checked={a.showCopyButton !== false}
                    onChange={(checked) => setAttr('showCopyButton', checked)}
                  />

                  <ToggleControl
                    label="Show Header Bar"
                    checked={a.showHeader !== false}
                    onChange={(checked) => setAttr('showHeader', checked)}
                  />

                  <ToggleControl
                    label="Read Only Mode"
                    checked={Boolean(a.readOnly)}
                    onChange={(checked) => setAttr('readOnly', checked)}
                  />
                </div>
              </div>
            </Section>

            <Section title="Code Settings">
              <div className="space-y-3">
                <ToggleControl
                  label="Wrap Lines"
                  checked={Boolean(a.wrapLines)}
                  onChange={(checked) => setAttr('wrapLines', checked)}
                />

                <ToggleControl
                  label="Show Line Numbers"
                  checked={a.showLineNumbers !== false}
                  onChange={(checked) => setAttr('showLineNumbers', checked)}
                />

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">Tab Size</span>
                  <CustomSelect
                    value={Number(a.tabSize ?? 2)}
                    options={[
                      { value: 2, label: '2 Spaces' },
                      { value: 4, label: '4 Spaces' },
                      { value: 8, label: '8 Spaces' },
                    ]}
                    onChange={(val) => setAttr('tabSize', Number(val))}
                  />
                </div>
              </div>
            </Section>
          </>
        )}

        {block && block.type === 'image' && (
          <>
            <Section title="Crop & Tools">
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setAttr('isCropping', true)}
                  className="w-full py-2 px-3 rounded-xl bg-primary-50 hover:bg-primary-100 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300 font-semibold text-xs border border-primary-200 dark:border-primary-800 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Crop size={14} /> Open Visual Cropper
                </button>

                {Boolean(a.originalUrl && a.originalUrl !== a.url) && (
                  <button
                    type="button"
                    onClick={() => setAttr('url', a.originalUrl)}
                    className="w-full py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300 font-semibold text-xs border border-red-200 dark:border-red-800 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <RotateCcw size={14} /> Reset Original Image
                  </button>
                )}
              </div>
            </Section>

            <Section title="Alignment">
              <AlignControl value={(a.align as TextAlign) || 'center'} onChange={(v) => setAttr('align', v)} />
            </Section>

            <Section title="Dimensions">
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">Width</span>
                  <CustomSelect
                    value={(a.width as string) || '100%'}
                    options={[
                      { value: '100%', label: '100% Full Width' },
                      { value: '75%', label: '75% Width' },
                      { value: '50%', label: '50% Width' },
                      { value: '25%', label: '25% Width' },
                      { value: 'auto', label: 'Auto Width' },
                    ]}
                    onChange={(val) => setAttr('width', val)}
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">Height</span>
                  <CustomSelect
                    value={(a.height as string) || 'auto'}
                    options={[
                      { value: 'auto', label: 'Auto Height' },
                      { value: '200px', label: '200px' },
                      { value: '300px', label: '300px' },
                      { value: '400px', label: '400px' },
                      { value: '500px', label: '500px' },
                    ]}
                    onChange={(val) => setAttr('height', val)}
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">Aspect Ratio</span>
                  <CustomSelect
                    value={(a.aspectRatio as string) || 'auto'}
                    options={[
                      { value: 'auto', label: 'Auto / Original' },
                      { value: '1:1', label: '1:1 Square' },
                      { value: '16:9', label: '16:9 Widescreen' },
                      { value: '4:3', label: '4:3 Standard' },
                      { value: '3:2', label: '3:2 Photo' },
                    ]}
                    onChange={(val) => setAttr('aspectRatio', val)}
                  />
                </div>
              </div>
            </Section>

            <Section title="Image Styling & Opacity">
              <div className="space-y-3">
                <RangeSliderControl
                  label="Border Radius"
                  min={0}
                  max={50}
                  unit="px"
                  value={(a.borderRadius as number) ?? 0}
                  onChange={(val) => setAttr('borderRadius', val)}
                />

                <RangeSliderControl
                  label="Opacity"
                  min={0}
                  max={100}
                  unit="%"
                  value={(a.opacity as number) ?? 100}
                  onChange={(val) => setAttr('opacity', val)}
                />

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">Shadow</span>
                  <CustomSelect
                    value={(a.shadow as string) || 'none'}
                    options={[
                      { value: 'none', label: 'None' },
                      { value: 'sm', label: 'Small Shadow' },
                      { value: 'md', label: 'Medium Shadow' },
                      { value: 'lg', label: 'Large Shadow' },
                      { value: 'xl', label: 'Extra Large Shadow' },
                      { value: '2xl', label: '2XL Deep Shadow' },
                    ]}
                    onChange={(val) => setAttr('shadow', val)}
                  />
                </div>
              </div>
            </Section>

            <Section title="Link & Accessibility">
              <div className="space-y-3">
                <label className="space-y-1 block text-sm">
                  <span className="text-gray-500">Alt text</span>
                  <input
                    type="text"
                    value={(a.alt as string) || ''}
                    onChange={(e) => setAttr('alt', e.target.value)}
                    placeholder="Describe image for screen readers"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-primary-500"
                  />
                </label>

                <label className="space-y-1 block text-sm">
                  <span className="text-gray-500">Destination URL</span>
                  <input
                    type="text"
                    value={(a.link as string) || ''}
                    onChange={(e) => setAttr('link', e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-primary-500"
                  />
                </label>

                <ToggleControl
                  label="Open link in new tab"
                  checked={a.linkTarget !== '_self'}
                  onChange={(checked) => setAttr('linkTarget', checked ? '_blank' : '_self')}
                />

                <ToggleControl
                  label="Lazy load image"
                  checked={Boolean(a.lazyLoad)}
                  onChange={(checked) => setAttr('lazyLoad', checked)}
                />
              </div>
            </Section>

            {/* Image Caption & Typography */}
            <Section title="Caption & Typography">
              <div className="space-y-3 text-xs">
                <ToggleControl
                  label="Enable Image Caption"
                  checked={a.showCaption !== false}
                  onChange={(checked) => setAttr('showCaption', checked)}
                />

                {a.showCaption !== false && (
                  <>
                    <div className="space-y-1">
                      <span className="text-gray-500 font-semibold block">Caption Text</span>
                      <input
                        type="text"
                        value={Array.isArray(a.caption) && a.caption[0]?.text ? a.caption[0].text : (typeof a.caption === 'string' ? a.caption : '')}
                        onChange={(e) => setAttr('caption', [{ text: e.target.value }])}
                        placeholder="Enter image caption…"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 outline-none text-xs focus:border-primary-500"
                      />
                    </div>
                    <ColorPickerControl
                      label="Caption Text Color"
                      value={(a.captionStyle as any)?.textColor}
                      onChange={(val) => {
                        const curr = (a.captionStyle as Record<string, any>) || {};
                        setAttr('captionStyle', { ...curr, textColor: val });
                      }}
                      defaultColor="#6b7280"
                      onClear={() => {
                        const curr = (a.captionStyle as Record<string, any>) || {};
                        const { textColor: _textColor, ...rest } = curr;
                        setAttr('captionStyle', rest);
                      }}
                    />

                    <ColorPickerControl
                      label="Caption Background Color"
                      value={(a.captionStyle as any)?.backgroundColor}
                      onChange={(val) => {
                        const curr = (a.captionStyle as Record<string, any>) || {};
                        setAttr('captionStyle', { ...curr, backgroundColor: val });
                      }}
                      defaultColor="#ffffff"
                      onClear={() => {
                        const curr = (a.captionStyle as Record<string, any>) || {};
                        const { backgroundColor: _backgroundColor, ...rest } = curr;
                        setAttr('captionStyle', rest);
                      }}
                    />

                    <RangeSliderControl
                      label="Font Size"
                      min={10}
                      max={32}
                      unit="px"
                      value={(a.captionStyle as any)?.fontSize ?? 14}
                      onChange={(val) => {
                        const curr = (a.captionStyle as Record<string, any>) || {};
                        setAttr('captionStyle', { ...curr, fontSize: val });
                      }}
                    />

                    <div className="space-y-1">
                      <span className="text-gray-500 font-semibold block">Caption Formatting</span>
                      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                        <button
                          type="button"
                          onClick={() => {
                            const curr = (a.captionStyle as Record<string, any>) || {};
                            setAttr('captionStyle', { ...curr, bold: !curr.bold });
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${(a.captionStyle as any)?.bold
                            ? 'bg-primary-600 text-white shadow-xs'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                        >
                          B
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const curr = (a.captionStyle as Record<string, any>) || {};
                            setAttr('captionStyle', { ...curr, italic: !curr.italic });
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-serif italic font-semibold transition-all cursor-pointer ${(a.captionStyle as any)?.italic
                            ? 'bg-primary-600 text-white shadow-xs'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                        >
                          I
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const curr = (a.captionStyle as Record<string, any>) || {};
                            setAttr('captionStyle', { ...curr, underline: !curr.underline });
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-xs underline font-semibold transition-all cursor-pointer ${(a.captionStyle as any)?.underline
                            ? 'bg-primary-600 text-white shadow-xs'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                        >
                          U
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-gray-500 font-semibold block">Font Weight</span>
                      <CustomSelect
                        value={String((a.captionStyle as any)?.fontWeight ?? 400)}
                        options={TEXT_FONT_WEIGHTS.map((fw) => ({ value: String(fw.value), label: fw.label }))}
                        onChange={(val) => {
                          const curr = (a.captionStyle as Record<string, any>) || {};
                          setAttr('captionStyle', { ...curr, fontWeight: Number(val) });
                        }}
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-gray-500 font-semibold block">Font Family</span>
                      <CustomSelect
                        value={(a.captionStyle as any)?.fontFamily || 'system'}
                        options={TEXT_FONT_FAMILIES.map((f) => ({ value: f.value, label: f.label }))}
                        onChange={(val) => {
                          const curr = (a.captionStyle as Record<string, any>) || {};
                          setAttr('captionStyle', { ...curr, fontFamily: String(val) });
                        }}
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-gray-500 font-semibold block">Caption Alignment</span>
                      <AlignControl
                        value={(a.captionStyle as any)?.align || 'center'}
                        onChange={(val) => {
                          const curr = (a.captionStyle as Record<string, any>) || {};
                          setAttr('captionStyle', { ...curr, align: val });
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            </Section>
          </>
        )}

        {block && block.type === 'slider' && (
          <>
            <Section title="Slider Layout & Controls">
              <div className="space-y-3 text-xs">
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-200 block mb-1">Layout Preset</span>
                  <select
                    value={(a.layoutStyle as string) || 'news-caption'}
                    onChange={(e) => setAttr('layoutStyle', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 font-semibold outline-none text-xs"
                  >
                    <option value="news-caption">News & Caption (Below Slide)</option>
                    <option value="hero-overlay">Hero Overlay (On Image/Video)</option>
                  </select>
                </div>

                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-200 block mb-1">Navigation Arrows Position</span>
                  <select
                    value={(a.navPosition as string) || ((a.layoutStyle as string) === 'news-caption' ? 'bottom-right' : 'sides-overlay')}
                    onChange={(e) => setAttr('navPosition', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none text-xs"
                  >
                    <option value="bottom-right">Bottom Right (Below Slide)</option>
                    <option value="sides-overlay">Sides Overlay (Left / Right)</option>
                  </select>
                </div>

                <ToggleControl
                  label="Show Counter (1/4)"
                  checked={a.showCounter !== false}
                  onChange={(checked) => setAttr('showCounter', checked)}
                />
              </div>
            </Section>

            <Section title="Slides">
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    updateBlock(block.id, (b) => {
                      const current = (b.attributes.slides as any[]) ?? [];
                      const newSlide = {
                        id: `slide-${Date.now()}`,
                        mediaType: 'image',
                        heading: [{ text: `Slide ${current.length + 1}` }],
                        paragraph: [{ text: 'Add slide description...' }],
                        buttonText: 'Explore',
                        buttonUrl: '#',
                        bgColor: '#1e293b',
                        align: 'left',
                      };
                      return { ...b, attributes: { ...b.attributes, slides: [...current, newSlide] } };
                    });
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-primary-50 hover:bg-primary-100 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300 font-semibold text-xs border border-primary-200 dark:border-primary-800 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus size={14} /> Add New Slide
                </button>

                {((a.slides as any[]) ?? []).map((slide, sIdx) => (
                  <div key={slide.id || sIdx} className="p-3 bg-gray-50/80 dark:bg-gray-800/40 rounded-xl border border-gray-200/80 dark:border-gray-700/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1">
                        {slide.mediaType === 'video' || slide.videoUrl ? <Video size={13} className="text-blue-500" /> : <ImageIcon size={13} className="text-emerald-500" />}
                        Slide {sIdx + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (sIdx === 0) return;
                            updateBlock(block.id, (b) => {
                              const list = [...((b.attributes.slides as any[]) ?? [])];
                              const [moved] = list.splice(sIdx, 1);
                              list.splice(sIdx - 1, 0, moved);
                              return { ...b, attributes: { ...b.attributes, slides: list } };
                            });
                          }}
                          disabled={sIdx === 0}
                          className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 cursor-pointer"
                          title="Move Up"
                        >
                          <ChevronUp size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const list = (a.slides as any[]) ?? [];
                            if (sIdx === list.length - 1) return;
                            updateBlock(block.id, (b) => {
                              const next = [...((b.attributes.slides as any[]) ?? [])];
                              const [moved] = next.splice(sIdx, 1);
                              next.splice(sIdx + 1, 0, moved);
                              return { ...b, attributes: { ...b.attributes, slides: next } };
                            });
                          }}
                          disabled={sIdx === ((a.slides as any[]) ?? []).length - 1}
                          className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 cursor-pointer"
                          title="Move Down"
                        >
                          <ChevronDown size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            updateBlock(block.id, (b) => {
                              const list = [...((b.attributes.slides as any[]) ?? [])];
                              const copy = { ...list[sIdx], id: `slide-${Date.now()}` };
                              list.splice(sIdx + 1, 0, copy);
                              return { ...b, attributes: { ...b.attributes, slides: list } };
                            });
                          }}
                          className="p-1 rounded text-gray-400 hover:text-blue-600 cursor-pointer"
                          title="Duplicate Slide"
                        >
                          <Sparkles size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (((a.slides as any[]) ?? []).length <= 1) return;
                            updateBlock(block.id, (b) => {
                              const list = [...((b.attributes.slides as any[]) ?? [])];
                              list.splice(sIdx, 1);
                              return { ...b, attributes: { ...b.attributes, slides: list } };
                            });
                          }}
                          disabled={((a.slides as any[]) ?? []).length <= 1}
                          className="p-1 rounded text-gray-400 hover:text-red-600 disabled:opacity-20 cursor-pointer"
                          title="Delete Slide"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Media Type Switcher: Image vs Video */}
                    <div className="space-y-2 text-xs p-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/80">
                      <div className="flex gap-1 p-0.5 bg-gray-100 dark:bg-gray-900 rounded-lg">
                        <button
                          type="button"
                          onClick={() => {
                            updateBlock(block.id, (b) => {
                              const list = [...((b.attributes.slides as any[]) ?? [])];
                              list[sIdx] = { ...list[sIdx], mediaType: 'image' };
                              return { ...b, attributes: { ...b.attributes, slides: list } };
                            });
                          }}
                          className={`flex-1 py-1 text-[11px] font-bold rounded-md flex items-center justify-center gap-1 transition-all ${(slide.mediaType || 'image') === 'image'
                            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-2xs'
                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-100'
                            }`}
                        >
                          <ImageIcon size={12} /> Image
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            updateBlock(block.id, (b) => {
                              const list = [...((b.attributes.slides as any[]) ?? [])];
                              list[sIdx] = { ...list[sIdx], mediaType: 'video' };
                              return { ...b, attributes: { ...b.attributes, slides: list } };
                            });
                          }}
                          className={`flex-1 py-1 text-[11px] font-bold rounded-md flex items-center justify-center gap-1 transition-all ${slide.mediaType === 'video'
                            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-2xs'
                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-100'
                            }`}
                        >
                          <Video size={12} /> Video
                        </button>
                      </div>

                      {/* Image Control */}
                      {slide.mediaType !== 'video' && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">Slide Image</span>
                            <label className="py-1 px-2 bg-primary-50 hover:bg-primary-100 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300 font-semibold rounded-lg border border-primary-200 dark:border-primary-800 flex items-center gap-1 cursor-pointer transition-colors text-[11px]">
                              <Upload size={12} /> Upload
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const dataUrl = await fileToDataUrl(file);
                                    updateBlock(block.id, (b) => {
                                      const list = [...((b.attributes.slides as any[]) ?? [])];
                                      list[sIdx] = { ...list[sIdx], imageUrl: dataUrl, mediaType: 'image' };
                                      return { ...b, attributes: { ...b.attributes, slides: list } };
                                    });
                                  }
                                }}
                              />
                            </label>
                          </div>
                          <input
                            type="text"
                            value={slide.imageUrl || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateBlock(block.id, (b) => {
                                const list = [...((b.attributes.slides as any[]) ?? [])];
                                list[sIdx] = { ...list[sIdx], imageUrl: val, mediaType: 'image' };
                                return { ...b, attributes: { ...b.attributes, slides: list } };
                              });
                            }}
                            placeholder="Image URL or upload..."
                            className="w-full px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none text-[11px]"
                          />
                        </div>
                      )}

                      {/* Video Control */}
                      {slide.mediaType === 'video' && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">Video File / URL</span>
                            <label className="py-1 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 font-semibold rounded-lg border border-blue-200 dark:border-blue-800 flex items-center gap-1 cursor-pointer transition-colors text-[11px]">
                              <Upload size={12} /> Upload MP4
                              <input
                                type="file"
                                accept="video/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const dataUrl = await fileToDataUrl(file);
                                    updateBlock(block.id, (b) => {
                                      const list = [...((b.attributes.slides as any[]) ?? [])];
                                      list[sIdx] = { ...list[sIdx], videoUrl: dataUrl, mediaType: 'video' };
                                      return { ...b, attributes: { ...b.attributes, slides: list } };
                                    });
                                  }
                                }}
                              />
                            </label>
                          </div>
                          <input
                            type="text"
                            value={slide.videoUrl || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateBlock(block.id, (b) => {
                                const list = [...((b.attributes.slides as any[]) ?? [])];
                                list[sIdx] = { ...list[sIdx], videoUrl: val, mediaType: 'video' };
                                return { ...b, attributes: { ...b.attributes, slides: list } };
                              });
                            }}
                            placeholder="Video URL (MP4, YouTube, Vimeo)..."
                            className="w-full px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none text-[11px]"
                          />

                          <div>
                            <span className="text-gray-500 font-medium block mb-1">Video Duration Badge (e.g. 0:50)</span>
                            <input
                              type="text"
                              value={slide.videoDuration || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateBlock(block.id, (b) => {
                                  const list = [...((b.attributes.slides as any[]) ?? [])];
                                  list[sIdx] = { ...list[sIdx], videoDuration: val };
                                  return { ...b, attributes: { ...b.attributes, slides: list } };
                                });
                              }}
                              placeholder="0:50"
                              className="w-full px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none text-[11px]"
                            />
                          </div>
                        </div>
                      )}

                      {/* Image Credit Input */}
                      <div>
                        <span className="text-gray-500 font-medium block mb-1">Image/Video Credit (Optional)</span>
                        <input
                          type="text"
                          value={slide.imageCredit || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateBlock(block.id, (b) => {
                              const list = [...((b.attributes.slides as any[]) ?? [])];
                              list[sIdx] = { ...list[sIdx], imageCredit: val };
                              return { ...b, attributes: { ...b.attributes, slides: list } };
                            });
                          }}
                          placeholder="e.g. Manjiri Joshi"
                          className="w-full px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none text-[11px]"
                        />
                      </div>

                      <div className="space-y-2 pt-2 border-t border-gray-200/60 dark:border-gray-700/60">
                        <ColorPickerControl
                          label="Bg Color"
                          value={slide.bgColor}
                          onChange={(val) => {
                            updateBlock(block.id, (b) => {
                              const list = [...((b.attributes.slides as any[]) ?? [])];
                              list[sIdx] = { ...list[sIdx], bgColor: val };
                              return { ...b, attributes: { ...b.attributes, slides: list } };
                            });
                          }}
                          defaultColor="#1e293b"
                        />

                        <ColorPickerControl
                          label="Overlay Color"
                          value={slide.overlayColor}
                          onChange={(val) => {
                            updateBlock(block.id, (b) => {
                              const list = [...((b.attributes.slides as any[]) ?? [])];
                              list[sIdx] = { ...list[sIdx], overlayColor: val };
                              return { ...b, attributes: { ...b.attributes, slides: list } };
                            });
                          }}
                          defaultColor="#000000"
                        />
                      </div>

                      <RangeSliderControl
                        label="Overlay Opacity"
                        min={0}
                        max={100}
                        unit="%"
                        value={slide.overlayOpacity ?? 40}
                        onChange={(val) => {
                          updateBlock(block.id, (b) => {
                            const list = [...((b.attributes.slides as any[]) ?? [])];
                            list[sIdx] = { ...list[sIdx], overlayOpacity: val };
                            return { ...b, attributes: { ...b.attributes, slides: list } };
                          });
                        }}
                      />

                      {!slide.hideButton && (
                        <>
                          <div>
                            <span className="text-gray-500 font-medium block mb-1">Button Text</span>
                            <input
                              type="text"
                              value={slide.buttonText ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateBlock(block.id, (b) => {
                                  const list = [...((b.attributes.slides as any[]) ?? [])];
                                  list[sIdx] = { ...list[sIdx], buttonText: val };
                                  return { ...b, attributes: { ...b.attributes, slides: list } };
                                });
                              }}
                              placeholder="Button Text (leave empty to hide)"
                              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none"
                            />
                          </div>

                          <div>
                            <span className="text-gray-500 font-medium block mb-1">Button URL</span>
                            <input
                              type="text"
                              value={slide.buttonUrl ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateBlock(block.id, (b) => {
                                  const list = [...((b.attributes.slides as any[]) ?? [])];
                                  list[sIdx] = { ...list[sIdx], buttonUrl: val };
                                  return { ...b, attributes: { ...b.attributes, slides: list } };
                                });
                              }}
                              placeholder="https://example.com"
                              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none"
                            />
                          </div>
                        </>
                      )}

                      <div>
                        <span className="text-gray-500 font-medium block mb-1">Alignment</span>
                        <AlignControl
                          value={(slide.align as TextAlign) || 'center'}
                          onChange={(val) => {
                            updateBlock(block.id, (b) => {
                              const list = [...((b.attributes.slides as any[]) ?? [])];
                              list[sIdx] = { ...list[sIdx], align: val };
                              return { ...b, attributes: { ...b.attributes, slides: list } };
                            });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Navigation">
              <div className="space-y-3">
                <ToggleControl
                  label="Show Navigation Arrows"
                  checked={a.showArrows !== false}
                  onChange={(checked) => setAttr('showArrows', checked)}
                />

                {a.showArrows !== false && (
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">Arrow Style</span>
                    <CustomSelect
                      value={(a.arrowStyle as string) || 'glass'}
                      options={[
                        { value: 'glass', label: 'Glassmorphism' },
                        { value: 'rounded', label: 'Solid Rounded' },
                        { value: 'default', label: 'Minimal' },
                      ]}
                      onChange={(val) => setAttr('arrowStyle', val)}
                    />
                  </div>
                )}

                <ToggleControl
                  label="Show Pagination Dots"
                  checked={a.showDots !== false}
                  onChange={(checked) => setAttr('showDots', checked)}
                />

                {a.showDots !== false && (
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">Dots Style</span>
                    <CustomSelect
                      value={(a.dotsStyle as string) || 'bullets'}
                      options={[
                        { value: 'bullets', label: 'Bullets' },
                        { value: 'bars', label: 'Bars' },
                        { value: 'numbers', label: 'Numbers' },
                      ]}
                      onChange={(val) => setAttr('dotsStyle', val)}
                    />
                  </div>
                )}
              </div>
            </Section>

            <Section title="Autoplay">
              <div className="space-y-3">
                <ToggleControl
                  label="Enable Autoplay"
                  checked={Boolean(a.autoplay)}
                  onChange={(checked) => setAttr('autoplay', checked)}
                />

                {Boolean(a.autoplay) && (
                  <>
                    <RangeSliderControl
                      label="Autoplay Delay"
                      value={(a.autoplayDelay as number) || 4000}
                      min={1000}
                      max={10000}
                      step={500}
                      unit="ms"
                      onChange={(val) => setAttr('autoplayDelay', val)}
                    />

                    <ToggleControl
                      label="Pause on Hover"
                      checked={a.pauseOnHover !== false}
                      onChange={(checked) => setAttr('pauseOnHover', checked)}
                    />

                    <ToggleControl
                      label="Infinite Loop"
                      checked={a.loop !== false}
                      onChange={(checked) => setAttr('loop', checked)}
                    />
                  </>
                )}
              </div>
            </Section>

            <Section title="Layout">
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">Layout Width</span>
                  <CustomSelect
                    value={(a.layoutWidth as string) || 'boxed'}
                    options={[
                      { value: 'boxed', label: 'Boxed Width' },
                      { value: 'full', label: 'Full Width' },
                    ]}
                    onChange={(val) => setAttr('layoutWidth', val)}
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">Height</span>
                  <CustomSelect
                    value={(a.height as string) || '450px'}
                    options={[
                      { value: '350px', label: '350px' },
                      { value: '400px', label: '400px' },
                      { value: '450px', label: '450px' },
                      { value: '500px', label: '500px' },
                      { value: '600px', label: '600px' },
                      { value: '70vh', label: '70% Viewport Height' },
                      { value: '100vh', label: 'Full Viewport Height' },
                    ]}
                    onChange={(val) => setAttr('height', val)}
                  />
                </div>

                <RangeSliderControl
                  label="Border Radius"
                  min={0}
                  max={40}
                  unit="px"
                  value={(a.borderRadius as number) ?? 16}
                  onChange={(val) => setAttr('borderRadius', val)}
                />
              </div>
            </Section>

            <Section title="Advanced">
              <div className="space-y-1 block text-sm">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">Custom CSS Class</span>
                <input
                  type="text"
                  value={(a.customCssClass as string) || ''}
                  onChange={(e) => setAttr('customCssClass', e.target.value)}
                  placeholder="my-hero-slider"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none text-sm focus:border-primary-500 font-mono"
                />
              </div>
            </Section>
          </>
        )}

        {block && (block.type === 'embed' || block.type === 'youtube' || block.type === 'vimeo') && (
          <Section title="Alignment">
            <AlignControl value={(a.align as TextAlign) || 'center'} onChange={(v) => setAttr('align', v)} />
          </Section>
        )}

        {block && block.type === 'table' && (
          <>
            <Section title="Alignment">
              <AlignControl value={a.align as TextAlign} onChange={(v) => setAttr('align', v)} />
            </Section>

            <Section title="Table Layout & Spacing">
              <div className="space-y-3.5 text-xs">
                <ToggleControl
                  label="Header Row"
                  checked={Boolean(a.hasHeader)}
                  onChange={(checked) => setAttr('hasHeader', checked)}
                />
                <ToggleControl
                  label="Footer Row"
                  checked={Boolean(a.hasFooter)}
                  onChange={(checked) => setAttr('hasFooter', checked)}
                />

                {/* Table Width */}
                <div className="space-y-1 block">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">Table Width</span>
                  <CustomSelect
                    value={(a.tableWidth as string) || '100%'}
                    options={[
                      { value: '100%', label: '100% Full Container' },
                      { value: '75%', label: '75% Width' },
                      { value: '50%', label: '50% Width' },
                      { value: 'auto', label: 'Auto Content Width' },
                    ]}
                    onChange={(val) => setAttr('tableWidth', val)}
                  />
                </div>

                {/* Border Collapse */}
                <div className="space-y-1 block">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">Border Mode</span>
                  <CustomSelect
                    value={(a.borderCollapse as string) || 'collapse'}
                    options={[
                      { value: 'collapse', label: 'Collapse (Single Border)' },
                      { value: 'separate', label: 'Separate (Spaced Borders)' },
                    ]}
                    onChange={(val) => setAttr('borderCollapse', val)}
                  />
                </div>

                {/* Cell Padding Slider */}
                <RangeSliderControl
                  label="Cell Padding"
                  min={2}
                  max={24}
                  unit="px"
                  value={(a.cellPadding as number) ?? 8}
                  onChange={(val) => setAttr('cellPadding', val)}
                />
              </div>
            </Section>

            <Section title="Borders & Corners">
              <div className="space-y-3.5 text-xs">
                {/* Border Width Slider */}
                <RangeSliderControl
                  label="Border Width"
                  min={0}
                  max={8}
                  step={1}
                  unit="px"
                  value={(a.borderWidth as number) ?? 1}
                  onChange={(val) => setAttr('borderWidth', val)}
                />

                {/* Border Color */}
                <ColorPickerControl
                  label="Border Color"
                  value={a.borderColor as string}
                  onChange={(v) => setAttr('borderColor', v)}
                  defaultColor="#d1d5db"
                />

                {/* Table Corner Radius Slider */}
                <RangeSliderControl
                  label="Table Corner Radius"
                  min={0}
                  max={30}
                  unit="px"
                  value={(a.tableBorderRadius as number) ?? 0}
                  onChange={(val) => setAttr('tableBorderRadius', val)}
                />
              </div>
            </Section>

            <Section title="Table Colors">
              <div className="space-y-2">
                <ColorPickerControl
                  label="Text color"
                  value={a.textColor as string}
                  onChange={(v) => setAttr('textColor', v)}
                  defaultColor="#111827"
                />
                <ColorPickerControl
                  label="Background"
                  value={a.backgroundColor as string}
                  onChange={(v) => setAttr('backgroundColor', v)}
                  defaultColor="#ffffff"
                  onClear={() => setAttr('backgroundColor', '')}
                />
              </div>
            </Section>

            <Section title="Row Styles">
              {tableRows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!block) return;
                        updateBlock(block.id, (b) => ({
                          ...b,
                          attributes: { ...b.attributes, rowStyles: applyZebraStriping(b.attributes) },
                        }));
                      }}
                      className="flex-1 py-1.5 px-2.5 text-xs font-semibold rounded-xl bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Sparkles size={13} className="text-amber-500" /> Zebra Stripes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!block) return;
                        updateBlock(block.id, (b) => ({
                          ...b,
                          attributes: { ...b.attributes, rowStyles: clearAllRowStyles(b.attributes) },
                        }));
                      }}
                      className="py-1.5 px-2.5 text-xs font-semibold rounded-xl bg-white dark:bg-gray-800 text-gray-500 hover:text-red-500 border border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all shadow-2xs cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="space-y-2">
                    {tableRows.map((_, index) => {
                      const role = getTableRowRole(index, tableRows.length, Boolean(a.hasHeader), Boolean(a.hasFooter));
                      const label = role === 'header' ? 'Header' : role === 'footer' ? 'Footer' : `Row ${index + 1}`;
                      const rBg = tableRowStyles[index]?.backgroundColor || '';
                      const rText = tableRowStyles[index]?.textColor || '';

                      return (
                        <div key={index} className="p-3 bg-gray-50/80 dark:bg-gray-800/40 rounded-xl border border-gray-200/60 dark:border-gray-800 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600 shadow-2xs">
                              {label}
                            </span>
                            {(rBg || rText) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setTableRowAttr(index, 'backgroundColor', '');
                                  setTableRowAttr(index, 'textColor', '');
                                }}
                                className="text-[11px] text-gray-400 hover:text-red-500 font-medium transition-colors cursor-pointer"
                              >
                                Reset Row
                              </button>
                            )}
                          </div>

                          <div className="space-y-2 text-xs">
                            {/* Background Color Swatches */}
                            <div className="space-y-1">
                              <span className="text-gray-500 dark:text-gray-400 font-medium text-[11px] block">Background</span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {['#ffffff', '#f3f4f6', '#e0f2fe', '#ffe4e6', '#fef3c7', '#1f2937'].map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => setTableRowAttr(index, 'backgroundColor', c)}
                                    className={`w-5 h-5 rounded-md border transition-transform cursor-pointer ${rBg === c ? 'ring-2 ring-primary-500 border-primary-500 scale-110' : 'border-gray-300 dark:border-gray-600 hover:scale-105'}`}
                                    style={{ backgroundColor: c }}
                                    title={`Set BG ${c}`}
                                  />
                                ))}
                                <label className="relative w-5 h-5 rounded-md border border-gray-300 dark:border-gray-600 cursor-pointer overflow-hidden shrink-0 ml-auto" title={`Custom ${label} Background`}>
                                  <input
                                    type="color"
                                    value={rBg || '#ffffff'}
                                    onChange={(e) => setTableRowAttr(index, 'backgroundColor', e.target.value)}
                                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                  />
                                  <div className="w-full h-full rounded-md" style={{ backgroundColor: rBg || '#ffffff' }} />
                                </label>
                              </div>
                            </div>

                            {/* Text Color Swatches */}
                            <div className="space-y-1 pt-1">
                              <span className="text-gray-500 dark:text-gray-400 font-medium text-[11px] block">Text Color</span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {['#111827', '#4b5563', '#2563eb', '#dc2626', '#059669', '#ffffff'].map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => setTableRowAttr(index, 'textColor', c)}
                                    className={`w-5 h-5 rounded-md border transition-transform cursor-pointer ${rText === c ? 'ring-2 ring-primary-500 border-primary-500 scale-110' : 'border-gray-300 dark:border-gray-600 hover:scale-105'}`}
                                    style={{ backgroundColor: c }}
                                    title={`Set Text ${c}`}
                                  />
                                ))}
                                <label className="relative w-5 h-5 rounded-md border border-gray-300 dark:border-gray-600 cursor-pointer overflow-hidden shrink-0 ml-auto" title={`Custom ${label} Text Color`}>
                                  <input
                                    type="color"
                                    value={rText || '#111827'}
                                    onChange={(e) => setTableRowAttr(index, 'textColor', e.target.value)}
                                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                  />
                                  <div className="w-full h-full rounded-md" style={{ backgroundColor: rText || '#111827' }} />
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Section>

            <Section title="Column Styles">
              {tableRows[0]?.length > 0 && (
                <div className="space-y-3">
                  {/* Quick Preset: Election Poll Theme */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!block) return;
                      const rows = (a.rows as string[][]) || [];
                      const colCount = rows[0]?.length || 4;
                      const nextCols = ensureTableColumnStyles(a, colCount);

                      // Col 0: Left aligned, default dark text
                      nextCols[0] = { ...nextCols[0], align: 'left', backgroundColor: '', textColor: '#111827' };

                      // Col 1 (NDA - Orange): Center aligned, #ea580c (Orange)
                      if (colCount > 1) {
                        nextCols[1] = { ...nextCols[1], align: 'center', backgroundColor: '#ea580c', textColor: '#ea580c' };
                      }

                      // Col 2 (MBG - Green): Center aligned, #15803d (Green)
                      if (colCount > 2) {
                        nextCols[2] = { ...nextCols[2], align: 'center', backgroundColor: '#15803d', textColor: '#15803d' };
                      }

                      // Col 3 (OTH - Gray): Center aligned, #6b7280 (Gray)
                      if (colCount > 3) {
                        nextCols[3] = { ...nextCols[3], align: 'center', backgroundColor: '#6b7280', textColor: '#4b5563' };
                      }

                      // Remaining columns: Center aligned
                      for (let i = 4; i < colCount; i++) {
                        nextCols[i] = { ...nextCols[i], align: 'center' };
                      }

                      const nextRows = ensureTableRowStyles(a, rows.length);
                      // Last row (Poll of Polls footer style)
                      if (rows.length > 1) {
                        nextRows[rows.length - 1] = {
                          ...nextRows[rows.length - 1],
                          backgroundColor: '#374151',
                          textColor: '#ffffff',
                          fontWeight: 700,
                        };
                      }

                      updateBlock(block.id, (b) => ({
                        ...b,
                        attributes: {
                          ...b.attributes,
                          hasHeader: true,
                          hasFooter: true,
                          tableBorderRadius: 12,
                          columnStyles: nextCols,
                          rowStyles: nextRows,
                        },
                      }));
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-orange-500 via-emerald-600 to-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-transform hover:scale-[1.01]"
                  >
                    <Sparkles size={14} /> Apply Election Poll Theme (Multi-Color Columns)
                  </button>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (!block) return;
                        updateBlock(block.id, (b) => ({
                          ...b,
                          attributes: { ...b.attributes, columnStyles: clearAllColumnStyles(b.attributes) },
                        }));
                      }}
                      className="py-1.5 px-2.5 text-xs font-semibold rounded-xl bg-white dark:bg-gray-800 text-gray-500 hover:text-red-500 border border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all shadow-2xs cursor-pointer"
                    >
                      Clear All Column Styles
                    </button>
                  </div>

                  <div className="space-y-2">
                    {Array.from({ length: tableRows[0].length }, (_, index) => {
                      const label = `Col ${index + 1}`;
                      const cBg = tableColumnStyles[index]?.backgroundColor || '';
                      const cText = tableColumnStyles[index]?.textColor || '';

                      return (
                        <div key={index} className="p-3 bg-gray-50/80 dark:bg-gray-800/40 rounded-xl border border-gray-200/60 dark:border-gray-800 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600 shadow-2xs">
                              {label}
                            </span>
                            {(cBg || cText || tableColumnStyles[index]?.align) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setTableColumnAttr(index, 'backgroundColor', '');
                                  setTableColumnAttr(index, 'textColor', '');
                                  setTableColumnAttr(index, 'align', undefined);
                                }}
                                className="text-[11px] text-gray-400 hover:text-red-500 font-medium transition-colors cursor-pointer"
                              >
                                Reset Col
                              </button>
                            )}
                          </div>

                          <div className="space-y-2 text-xs">
                            {/* Column Alignment */}
                            <div className="space-y-1">
                              <span className="text-gray-500 dark:text-gray-400 font-medium text-[11px] block">Column Alignment</span>
                              <AlignControl
                                value={tableColumnStyles[index]?.align || (index === 0 ? 'left' : 'center')}
                                onChange={(val) => setTableColumnAttr(index, 'align', val)}
                              />
                            </div>

                            {/* Background Color */}
                            <div className="space-y-1 pt-1">
                              <span className="text-gray-500 dark:text-gray-400 font-medium text-[11px] block">Background</span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {['#ea580c', '#15803d', '#6b7280', '#2563eb', '#7c3aed', '#f3f4f6', '#ffffff'].map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => setTableColumnAttr(index, 'backgroundColor', c)}
                                    className={`w-5 h-5 rounded-md border transition-transform cursor-pointer ${cBg === c ? 'ring-2 ring-primary-500 border-primary-500 scale-110' : 'border-gray-300 dark:border-gray-600 hover:scale-105'}`}
                                    style={{ backgroundColor: c }}
                                    title={`Set BG ${c}`}
                                  />
                                ))}
                                <label className="relative w-5 h-5 rounded-md border border-gray-300 dark:border-gray-600 cursor-pointer overflow-hidden shrink-0 ml-auto" title={`Custom ${label} Background`}>
                                  <input
                                    type="color"
                                    value={cBg || '#ffffff'}
                                    onChange={(e) => setTableColumnAttr(index, 'backgroundColor', e.target.value)}
                                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                  />
                                  <div className="w-full h-full rounded-md" style={{ backgroundColor: cBg || '#ffffff' }} />
                                </label>
                              </div>
                            </div>

                            {/* Text Color */}
                            <div className="space-y-1 pt-1">
                              <span className="text-gray-500 dark:text-gray-400 font-medium text-[11px] block">Text Color</span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {['#111827', '#ea580c', '#15803d', '#4b5563', '#2563eb', '#dc2626', '#ffffff'].map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => setTableColumnAttr(index, 'textColor', c)}
                                    className={`w-5 h-5 rounded-md border transition-transform cursor-pointer ${cText === c ? 'ring-2 ring-primary-500 border-primary-500 scale-110' : 'border-gray-300 dark:border-gray-600 hover:scale-105'}`}
                                    style={{ backgroundColor: c }}
                                    title={`Set Text ${c}`}
                                  />
                                ))}
                                <label className="relative w-5 h-5 rounded-md border border-gray-300 dark:border-gray-600 cursor-pointer overflow-hidden shrink-0 ml-auto" title={`Custom ${label} Text Color`}>
                                  <input
                                    type="color"
                                    value={cText || '#111827'}
                                    onChange={(e) => setTableColumnAttr(index, 'textColor', e.target.value)}
                                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                  />
                                  <div className="w-full h-full rounded-md" style={{ backgroundColor: cText || '#111827' }} />
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Section>
          </>
        )}
        </div>
  );

  return (
    <>
      {/* Mobile-only Bottom Sheet (< 576px) */}
      <div className="xs:hidden">
        <ResponsivePanelShell
          open={open}
          side="right"
          onClose={() => setOpen(false)}
          className="bg-white dark:bg-gray-900 border-l border-gray-200/80 dark:border-gray-800/80 p-3.5 shadow-2xl xl:shadow-none flex flex-col"
          widthClassName="w-full"
        >
          {renderContent()}
        </ResponsivePanelShell>
      </div>

      {/* Desktop / Tablet Animated Sidebar (>= 576px) — Smoothly expands/collapses width */}
      <aside
        className={`hidden xs:flex h-full min-h-0 flex-col overflow-hidden shrink-0 bg-white dark:bg-gray-900 border-l border-gray-200/80 dark:border-gray-800 transition-[width,min-width,max-width] duration-300 ease-in-out select-none relative z-30 ${
          open
            ? 'w-72 min-w-[18rem] max-w-[18rem]'
            : 'w-16 min-w-[4rem] max-w-[4rem]'
        }`}
      >
        {!open ? (
          renderRail()
        ) : (
          <div className="w-72 h-full flex flex-col p-3.5 animate-in fade-in duration-200 shrink-0">
            {renderContent()}
          </div>
        )}
      </aside>
    </>
  );
}

