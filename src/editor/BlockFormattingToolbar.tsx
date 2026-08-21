import { useState, useRef, useEffect } from 'react';
import {
  Undo2, Redo2, Printer, Paintbrush, ZoomIn, ZoomOut,
  Bold, Italic, Underline, Strikethrough, Subscript, Superscript,
  Highlighter, Link as LinkIcon, Image as ImageIcon, MessageSquare,
  MoreVertical, MoreHorizontal, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, CheckSquare, Indent, Outdent, Eraser,
  ChevronDown, ChevronUp, Minus, Plus, ArrowUp, ArrowDown,
  CopyPlus, Code2, Trash2, Pin, Sliders, Smile, Check, ExternalLink,
  Maximize2, Crop, Subtitles, Tag as TagIcon, Columns as ColumnsIcon,
  Layers, Video, Upload, X, Type, ArrowUpDown, Table as TableIcon,
} from 'lucide-react';
import { useEditorStore, findBlock } from './store';
import { createBlock, getBlockLabel } from './blocks/registry';
import { fileToDataUrl } from './media';
import CustomSelect, { type SelectOption } from './CustomSelect';
import type { RichTextValue, ListStyle, TextAlign, BlockInstance } from './types';
import { blockToHtmlCode, createId } from './utils';

// ==========================================
// TOOLTIP HELPER
// ==========================================
function Tooltip({
  text,
  children,
  align = 'center',
}: {
  text: string;
  children: React.ReactNode;
  align?: 'center' | 'left' | 'right';
}) {
  const alignClasses =
    align === 'left'
      ? 'left-0 translate-x-0'
      : align === 'right'
        ? 'right-0 translate-x-0'
        : 'left-1/2 -translate-x-1/2';

  const arrowAlignClasses =
    align === 'left'
      ? 'left-3'
      : align === 'right'
        ? 'right-3'
        : 'left-1/2 -translate-x-1/2';

  return (
    <div className="relative group inline-flex items-center shrink-0">
      {children}
      <div className={`absolute top-full mt-2 ${alignClasses} hidden group-hover:flex flex-col items-center pointer-events-none z-[99999]`}>
        <div className={`w-2 h-2 bg-slate-900 dark:bg-slate-800 rotate-45 -mb-1 shadow-xs border-t border-l border-slate-700/60 ${arrowAlignClasses}`} />
        <span className="px-2.5 py-1 text-[11px] font-semibold text-white bg-slate-900 dark:bg-slate-800 rounded-lg shadow-2xl border border-slate-700/60 whitespace-nowrap block">
          {text}
        </span>
      </div>
    </div>
  );
}

// ==========================================
// GOOGLE DOCS CONSTANTS & PALETTES
// ==========================================

const GOOGLE_DOCS_STYLES: SelectOption[] = [
  { value: 'paragraph', label: 'Normal text', subLabel: '¶' },
  { value: 'title', label: 'Title', subLabel: 'H₁' },
  { value: 'subtitle', label: 'Subtitle', subLabel: 'H₂' },
  { value: 'h1', label: 'Heading 1', subLabel: 'H₁' },
  { value: 'h2', label: 'Heading 2', subLabel: 'H₂' },
  { value: 'h3', label: 'Heading 3', subLabel: 'H₃' },
  { value: 'h4', label: 'Heading 4', subLabel: 'H₄' },
  { value: 'h5', label: 'Heading 5', subLabel: 'H₅' },
  { value: 'h6', label: 'Heading 6', subLabel: 'H₆' },
  { value: 'quote', label: 'Quote', subLabel: '❝' },
  { value: 'code', label: 'Code', subLabel: '</>' },
  { value: 'preformatted', label: 'Preformatted', subLabel: '⁋' },
];

const GOOGLE_DOCS_FONTS: SelectOption[] = [
  { value: 'arial', label: 'Arial' },
  { value: 'roboto', label: 'Roboto' },
  { value: 'inter', label: 'Inter' },
  { value: 'georgia', label: 'Georgia' },
  { value: 'times', label: 'Times New Roman' },
  { value: 'garamond', label: 'Garamond' },
  { value: 'verdana', label: 'Verdana' },
  { value: 'trebuchet', label: 'Trebuchet MS' },
  { value: 'courier', label: 'Courier New' },
  { value: 'firacode', label: 'Fira Code' },
  { value: 'comicsans', label: 'Comic Sans MS' },
  { value: 'impact', label: 'Impact' },
  { value: 'system', label: 'System Default' },
];

const FONT_SIZE_PRESETS = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72, 96];

const GOOGLE_DOCS_TEXT_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
  '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd',
  '#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0',
  '#a61c1c', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3c78d8', '#3d85c6', '#674ea7', '#a64d79',
  '#5b0f00', '#660000', '#783f04', '#7f6000', '#274e13', '#0c343d', '#1155cc', '#0b5394', '#351c75', '#741b47',
];

const GOOGLE_DOCS_HIGHLIGHT_COLORS = [
  { label: 'None', color: 'transparent' },
  { label: 'Yellow', color: '#ffff00' },
  { label: 'Green', color: '#00ff00' },
  { label: 'Cyan', color: '#00ffff' },
  { label: 'Magenta', color: '#ff00ff' },
  { label: 'Blue', color: '#0000ff' },
  { label: 'Red', color: '#ff0000' },
  { label: 'Light Yellow', color: '#fef08a' },
  { label: 'Light Green', color: '#bbf7d0' },
  { label: 'Light Cyan', color: '#a5f3fc' },
  { label: 'Light Pink', color: '#fbcfe8' },
  { label: 'Light Purple', color: '#e9d5ff' },
];

interface CommonToolbarProps {
  block: BlockInstance;
  execCmd: (cmd: string, value?: string) => void;
  saveSelection: () => void;
  showNotification: (msg: string) => void;
}

// ==========================================
// BLOCK SPECIFIC TOOLBAR IMPLEMENTATIONS
// ==========================================

function DefaultBlockToolbar({ block }: CommonToolbarProps) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs font-semibold px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
        {getBlockLabel(block.type)}
      </span>
    </div>
  );
}

function ImageToolbar({ block, showNotification }: CommonToolbarProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCropMenu, setShowCropMenu] = useState(false);
  const [showAltPopover, setShowAltPopover] = useState(false);
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [altInput, setAltInput] = useState((block.attributes.alt as string) || '');
  const [linkInput, setLinkInput] = useState((block.attributes.link as string) || '');

  const handleImageReplace = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, url } }));
    showNotification('Image replaced');
  };

  const applyCropRatio = (ratio: string) => {
    updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, aspectRatio: ratio } }));
    setShowCropMenu(false);
    showNotification(`Aspect ratio set to ${ratio}`);
  };

  const applyAltText = () => {
    updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, alt: altInput.trim() } }));
    setShowAltPopover(false);
    showNotification('Alt text saved');
  };

  const applyLink = () => {
    let formatted = linkInput.trim();
    if (formatted && !/^https?:\/\//i.test(formatted) && !/^mailto:/i.test(formatted) && !/^#/i.test(formatted)) {
      formatted = 'https://' + formatted;
    }
    updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, link: formatted } }));
    setShowLinkPopover(false);
    showNotification(formatted ? 'Image link updated' : 'Image link removed');
  };

  const currentWidth = (block.attributes.width as string) || '100%';

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 rounded-md border border-blue-200/60 dark:border-blue-800/60">
        <ImageIcon size={14} /> Image
      </span>

      <span className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-0.5 shrink-0" />

      {/* Width Dropdown */}
      <Tooltip text="Image Width">
        <div className="w-24">
          <CustomSelect
            value={currentWidth}
            options={[
              { value: 'auto', label: 'Auto' },
              { value: '25%', label: '25%' },
              { value: '50%', label: '50%' },
              { value: '75%', label: '75%' },
              { value: '100%', label: '100%' },
            ]}
            onChange={(val) => {
              updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, width: val } }));
              showNotification(`Image width set to ${val}`);
            }}
            size="sm"
          />
        </div>
      </Tooltip>

      {/* Replace Image */}
      <Tooltip text="Replace Image">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer flex items-center gap-1"
        >
          <Upload size={13} /> Replace
        </button>
      </Tooltip>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageReplace} className="hidden" />

      {/* Aspect Ratio Menu */}
      <div className="relative inline-flex items-center">
        <Tooltip text="Crop / Aspect Ratio">
          <button
            onClick={() => setShowCropMenu(!showCropMenu)}
            className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer flex items-center gap-1"
          >
            <Crop size={13} /> Crop
          </button>
        </Tooltip>
        {showCropMenu && (
          <div className="absolute top-full left-0 mt-2 p-1.5 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-1 z-[100] w-36 max-w-[calc(100vw-2rem)]">
            {['auto', '16:9', '4:3', '1:1', '9:16', '3:2', '2:1'].map((ratio) => (
              <button
                key={ratio}
                onClick={() => applyCropRatio(ratio)}
                className={`px-2.5 py-1 text-xs font-medium text-left rounded-lg transition-colors cursor-pointer capitalize ${(block.attributes.aspectRatio || 'auto') === ratio ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300 font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                {ratio === 'auto' ? 'Original / Auto' : ratio}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Image Destination Link */}
      <div className="relative inline-flex items-center">
        <Tooltip text="Image Link">
          <button
            onClick={() => setShowLinkPopover(!showLinkPopover)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1 ${block.attributes.link ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold' : 'bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-200'}`}
          >
            <LinkIcon size={13} /> Link
          </button>
        </Tooltip>
        {showLinkPopover && (
          <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2 z-[100] w-64 max-w-[calc(100vw-2rem)]">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Image Destination Link</span>
            <input
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              placeholder="https://example.com"
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && applyLink()}
              autoFocus
            />
            <div className="flex justify-end gap-1.5 mt-1">
              <button onClick={() => setShowLinkPopover(false)} className="px-2.5 py-1 text-xs text-slate-500 cursor-pointer">
                Cancel
              </button>
              <button onClick={applyLink} className="px-3 py-1 text-xs font-semibold rounded-lg bg-blue-600 text-white cursor-pointer shadow-2xs hover:bg-blue-700 transition-colors">
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Alt Text */}
      <div className="relative inline-flex items-center">
        <Tooltip text="Image Alt Text (SEO / Accessibility)">
          <button
            onClick={() => setShowAltPopover(!showAltPopover)}
            className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer flex items-center gap-1"
          >
            <Subtitles size={13} /> Alt Text
          </button>
        </Tooltip>
        {showAltPopover && (
          <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2 z-[100] w-64 max-w-[calc(100vw-2rem)]">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Alt Text (Accessibility)</span>
            <input
              value={altInput}
              onChange={(e) => setAltInput(e.target.value)}
              placeholder="Describe this image..."
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && applyAltText()}
              autoFocus
            />
            <div className="flex justify-end gap-1.5 mt-1">
              <button onClick={() => setShowAltPopover(false)} className="px-2.5 py-1 text-xs text-slate-500 cursor-pointer">
                Cancel
              </button>
              <button onClick={applyAltText} className="px-3 py-1 text-xs font-semibold rounded-lg bg-blue-600 text-white cursor-pointer">
                Save Alt
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GalleryToolbar({ block, showNotification }: CommonToolbarProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const cols = (block.attributes.columns as number) || 3;

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 rounded-md border border-amber-200/60 dark:border-amber-800/60">
        <ImageIcon size={14} /> Gallery
      </span>
      <span className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-0.5 shrink-0" />
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
        {[2, 3, 4, 5].map((count) => (
          <button
            key={count}
            onClick={() => {
              updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, columns: count } }));
              showNotification(`Gallery set to ${count} columns`);
            }}
            className={`px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${cols === count ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
          >
            {count} Cols
          </button>
        ))}
      </div>
    </div>
  );
}

function CoverToolbar({ block, showNotification }: CommonToolbarProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const opacity = (block.attributes.dimRatio as number) ?? 50;

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 rounded-md border border-purple-200/60 dark:border-purple-800/60">
        <ImageIcon size={14} /> Cover
      </span>
      <span className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-0.5 shrink-0" />
      <div className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
        <span>Overlay:</span>
        {[20, 50, 80].map((val) => (
          <button
            key={val}
            onClick={() => {
              updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, dimRatio: val } }));
              showNotification(`Overlay set to ${val}%`);
            }}
            className={`px-2 py-0.5 rounded-md text-xs cursor-pointer ${opacity === val ? 'bg-purple-600 text-white font-bold' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200'}`}
          >
            {val}%
          </button>
        ))}
      </div>
    </div>
  );
}

function MediaTextToolbar({ block, showNotification }: CommonToolbarProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const isRight = block.attributes.mediaPosition === 'right';

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 rounded-md border border-cyan-200/60 dark:border-cyan-800/60">
        <ColumnsIcon size={14} /> Media & Text
      </span>
      <span className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-0.5 shrink-0" />
      <button
        onClick={() => {
          updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, mediaPosition: isRight ? 'left' : 'right' } }));
          showNotification(isRight ? 'Media placed left' : 'Media placed right');
        }}
        className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors cursor-pointer"
      >
        Flip Position ({isRight ? 'Right' : 'Left'})
      </button>
    </div>
  );
}

function MediaEmbedToolbar({ block, showNotification }: CommonToolbarProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [url, setUrl] = useState((block.attributes.url as string) || '');

  const applyUrl = () => {
    updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, url: url.trim() } }));
    setShowUrlInput(false);
    showNotification('Media URL updated');
  };

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 rounded-md border border-rose-200/60 dark:border-rose-800/60">
        <Video size={14} /> {getBlockLabel(block.type)}
      </span>
      <span className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-0.5 shrink-0" />
      <div className="relative inline-flex items-center">
        <button
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors cursor-pointer flex items-center gap-1"
        >
          <ExternalLink size={13} /> Change URL
        </button>
        {showUrlInput && (
          <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2 z-[100] w-64 max-w-[calc(100vw-2rem)]">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Embed URL</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && applyUrl()}
              autoFocus
            />
            <div className="flex justify-end gap-1.5 mt-1">
              <button onClick={() => setShowUrlInput(false)} className="px-2.5 py-1 text-xs text-slate-500 cursor-pointer">
                Cancel
              </button>
              <button onClick={applyUrl} className="px-3 py-1 text-xs font-semibold rounded-lg bg-blue-600 text-white cursor-pointer">
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ColumnsToolbar({ block, showNotification }: CommonToolbarProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const cols = (block.attributes.columns as number) || 2;

  const setColumnCount = (count: number) => {
    updateBlock(block.id, (curr) => {
      const currentInner = curr.innerBlocks || [];
      const nextInner = [...currentInner];
      while (nextInner.length < count) {
        nextInner.push({
          id: createId(),
          type: 'paragraph',
          attributes: { content: [{ text: '' }] },
          innerBlocks: [],
        });
      }
      while (nextInner.length > count) {
        nextInner.pop();
      }
      return {
        ...curr,
        attributes: { ...curr.attributes, columns: count },
        innerBlocks: nextInner,
      };
    });
    showNotification(`Columns set to ${count}`);
  };

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 rounded-md border border-indigo-200/60 dark:border-indigo-800/60">
        <ColumnsIcon size={14} /> Columns
      </span>
      <span className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-0.5 shrink-0" />
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
        {[2, 3, 4, 6].map((count) => (
          <button
            key={count}
            onClick={() => setColumnCount(count)}
            className={`px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${cols === count ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
          >
            {count} Cols
          </button>
        ))}
      </div>
    </div>
  );
}

function SliderToolbar({ block, showNotification }: CommonToolbarProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const autoplay = Boolean(block.attributes.autoplay);

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
        <Layers size={14} /> Slider
      </span>
      <span className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-0.5 shrink-0" />
      <button
        onClick={() => {
          updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, autoplay: !autoplay } }));
          showNotification(autoplay ? 'Autoplay disabled' : 'Autoplay enabled');
        }}
        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${autoplay ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200'}`}
      >
        Autoplay: {autoplay ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}

function TableToolbar({ block, showNotification }: CommonToolbarProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);

  const addRow = () => {
    updateBlock(block.id, (b) => {
      const rows = (b.attributes.rows as any[]) || [];
      const colCount = rows[0]?.cells?.length || 2;
      const newRow = { id: createId(), cells: Array(colCount).fill({ content: [{ text: '' }] }) };
      return { ...b, attributes: { ...b.attributes, rows: [...rows, newRow] } };
    });
    showNotification('Row added');
  };

  const addCol = () => {
    updateBlock(block.id, (b) => {
      const rows = (b.attributes.rows as any[]) || [];
      const newRows = rows.map((r: any) => ({
        ...r,
        cells: [...(r.cells || []), { content: [{ text: '' }] }],
      }));
      return { ...b, attributes: { ...b.attributes, rows: newRows } };
    });
    showNotification('Column added');
  };

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 rounded-md border border-teal-200/60 dark:border-teal-800/60">
        <TableIcon size={14} /> Table
      </span>
      <span className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-0.5 shrink-0" />
      <button
        onClick={addRow}
        className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors cursor-pointer"
      >
        + Row
      </button>
      <button
        onClick={addCol}
        className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors cursor-pointer"
      >
        + Col
      </button>
    </div>
  );
}

function ButtonToolbar({ block, showNotification }: CommonToolbarProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const [showUrlPopover, setShowUrlPopover] = useState(false);
  const [urlInput, setUrlInput] = useState((block.attributes.url as string) || '');

  const applyUrl = () => {
    let formatted = urlInput.trim();
    if (formatted && !/^https?:\/\//i.test(formatted) && !/^#/i.test(formatted)) formatted = 'https://' + formatted;
    updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, url: formatted } }));
    setShowUrlPopover(false);
    showNotification('Button URL updated');
  };

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
        <LinkIcon size={14} /> Button
      </span>

      <span className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-0.5 shrink-0" />

      <div className="relative inline-flex items-center">
        <Tooltip text="Edit Button Link URL">
          <button
            onClick={() => setShowUrlPopover(!showUrlPopover)}
            className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <ExternalLink size={13} /> URL
          </button>
        </Tooltip>
        {showUrlPopover && (
          <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2 z-[100] w-64 max-w-[calc(100vw-2rem)]">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Button Destination</span>
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com"
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && applyUrl()}
              autoFocus
            />
            <div className="flex justify-end gap-1.5 mt-1">
              <button onClick={() => setShowUrlPopover(false)} className="px-2.5 py-1 text-xs text-slate-500 cursor-pointer">
                Cancel
              </button>
              <button onClick={applyUrl} className="px-3 py-1 text-xs font-semibold rounded-lg bg-blue-600 text-white cursor-pointer">
                Apply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Map specialized toolbars
const BLOCK_TOOLBAR_REGISTRY: Record<string, React.ComponentType<CommonToolbarProps>> = {
  image: ImageToolbar,
  gallery: GalleryToolbar,
  cover: CoverToolbar,
  'media-text': MediaTextToolbar,
  video: MediaEmbedToolbar,
  audio: MediaEmbedToolbar,
  youtube: MediaEmbedToolbar,
  vimeo: MediaEmbedToolbar,
  embed: MediaEmbedToolbar,
  columns: ColumnsToolbar,
  group: () => null,
  row: () => null,
  stack: DefaultBlockToolbar,
  slider: SliderToolbar,
  table: TableToolbar,
  button: ButtonToolbar,
};

function MultiSelectToolbar({ selectedIds, showNotification }: { selectedIds: string[]; showNotification: (msg: string) => void }) {
  const duplicateSelectedBlocks = useEditorStore((s) => s.duplicateSelectedBlocks);
  const deleteSelectedBlocks = useEditorStore((s) => s.deleteSelectedBlocks);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-md">
        {selectedIds.length} blocks selected
      </span>
      <button
        onClick={() => {
          duplicateSelectedBlocks();
          showNotification('Blocks duplicated');
        }}
        className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors cursor-pointer flex items-center gap-1"
      >
        <CopyPlus size={13} /> Duplicate
      </button>
      <button
        onClick={() => {
          deleteSelectedBlocks();
          showNotification('Blocks deleted');
        }}
        className="px-2.5 py-1 text-xs font-medium rounded-md bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 hover:bg-red-100 transition-colors cursor-pointer flex items-center gap-1"
      >
        <Trash2 size={13} /> Delete
      </button>
    </div>
  );
}

// ==========================================
// MAIN GOOGLE DOCS FORMATTING TOOLBAR
// ==========================================

export default function BlockFormattingToolbar() {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const blocks = useEditorStore((s) => s.blocks);
  const htmlModeBlockIds = useEditorStore((s) => s.htmlModeBlockIds);
  const toggleHtmlMode = useEditorStore((s) => s.toggleHtmlMode);
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const insertBlock = useEditorStore((s) => s.insertBlock);
  const moveBlock = useEditorStore((s) => s.moveBlock);
  const duplicateBlock = useEditorStore((s) => s.duplicateBlock);
  const removeBlock = useEditorStore((s) => s.removeBlock);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const past = useEditorStore((s) => s.past);
  const future = useEditorStore((s) => s.future);
  const zoomLevel = useEditorStore((s) => s.zoomLevel);
  const setZoomLevel = useEditorStore((s) => s.setZoomLevel);

  // Popover States
  const [showLink, setShowLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showTextColor, setShowTextColor] = useState(false);
  const [showHighlightColor, setShowHighlightColor] = useState(false);
  const [showAlignMenu, setShowAlignMenu] = useState(false);
  const [showSpacingMenu, setShowSpacingMenu] = useState(false);
  const [showFontSizeDropdown, setShowFontSizeDropdown] = useState(false);
  const [formatPainterActive, setFormatPainterActive] = useState(false);
  const [copiedFormat, setCopiedFormat] = useState<Record<string, unknown> | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const blockId = selectedIds[0];
  const block = blockId ? findBlock(blocks, blockId) : null;
  const blockType = block?.type || 'paragraph';
  const a = block?.attributes || {};

  const showNotification = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // Close popovers on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    if (savedRangeRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      }
    }
  };

  const execCmd = (cmd: string, value?: string) => {
    restoreSelection();
    try {
      document.execCommand('styleWithCSS', false, 'false');
    } catch {
      // ignore
    }

    if (cmd === 'hiliteColor') {
      if (value === 'transparent') {
        document.execCommand('hiliteColor', false, 'transparent');
        document.execCommand('backColor', false, 'transparent');
        if (block) updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, backgroundColor: '' } }));
        showNotification('Highlight removed');
      } else {
        document.execCommand('hiliteColor', false, value || '#ffff00');
        if (block) updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, backgroundColor: value } }));
        showNotification('Highlight applied');
      }
    } else if (cmd === 'foreColor') {
      document.execCommand('foreColor', false, value || '#000000');
      if (block) updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, textColor: value } }));
      showNotification('Text color applied');
    } else {
      document.execCommand(cmd, false, value);
    }

    if (block) {
      const activeEditable = (savedRangeRef.current?.commonAncestorContainer?.nodeType === 1
        ? (savedRangeRef.current.commonAncestorContainer as HTMLElement)
        : savedRangeRef.current?.commonAncestorContainer?.parentElement)?.closest('[contenteditable]') as HTMLElement | null
        || document.querySelector(`[data-block-id="${block.id}"] [contenteditable]`) as HTMLElement | null;
      if (activeEditable) {
        activeEditable.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  };

  // Format Painter
  const handleFormatPainter = () => {
    if (!formatPainterActive) {
      // Copy format
      const currentFormat = {
        fontWeight: a.fontWeight,
        fontStyle: a.fontStyle,
        textDecoration: a.textDecoration,
        textColor: a.textColor,
        backgroundColor: a.backgroundColor,
        fontSize: a.fontSize,
        fontFamily: a.fontFamily,
      };
      setCopiedFormat(currentFormat);
      setFormatPainterActive(true);
      showNotification('Formatting copied. Click text/block to apply.');
    } else {
      setFormatPainterActive(false);
      setCopiedFormat(null);
    }
  };

  // Block Style / Normal text changes
  const changeBlockStyle = (styleVal: string) => {
    if (!block) {
      insertBlock(styleVal === 'title' || styleVal === 'subtitle' ? 'heading' : styleVal);
      return;
    }

    if (styleVal === 'title') {
      updateBlock(block.id, (b) => ({ ...b, type: 'heading', attributes: { ...b.attributes, level: 1, fontSize: 32, fontWeight: 700 } }));
      showNotification('Applied Title style');
    } else if (styleVal === 'subtitle') {
      updateBlock(block.id, (b) => ({ ...b, type: 'heading', attributes: { ...b.attributes, level: 2, fontSize: 24, fontWeight: 500 } }));
      showNotification('Applied Subtitle style');
    } else if (styleVal.startsWith('h')) {
      const lvl = parseInt(styleVal.replace('h', ''), 10);
      updateBlock(block.id, (b) => ({ ...b, type: 'heading', attributes: { ...b.attributes, level: lvl } }));
      showNotification(`Applied Heading ${lvl}`);
    } else {
      updateBlock(block.id, (b) => ({ ...b, type: styleVal }));
      showNotification(`Applied ${styleVal} style`);
    }
  };

  // Font Family change
  const changeFontFamily = (fontKey: string) => {
    if (block) {
      updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, fontFamily: fontKey } }));
      execCmd('fontName', fontKey);
      showNotification(`Font set to ${fontKey}`);
    }
  };

  // Font Size Stepper
  const currentFontSize = (a.fontSize as number) || (blockType === 'heading' ? (a.level === 1 ? 32 : 24) : 16);

  const changeFontSize = (newSize: number) => {
    const clamped = Math.max(6, Math.min(120, newSize));
    if (block) {
      updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, fontSize: clamped } }));
      showNotification(`Font size: ${clamped}px`);
    }
    setShowFontSizeDropdown(false);
  };

  // Inline Toggles
  const isBold = (a.fontWeight as number) === 700 || a.fontWeight === 'bold';
  const isItalic = a.fontStyle === 'italic';
  const isUnderline = a.textDecoration === 'underline';
  const currentAlign = (a.align as TextAlign) || 'left';

  const toggleBold = () => {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.toString().length > 0) {
      execCmd('bold');
    } else if (block) {
      updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, fontWeight: isBold ? 400 : 700 } }));
    } else {
      execCmd('bold');
    }
  };

  const toggleItalic = () => {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.toString().length > 0) {
      execCmd('italic');
    } else if (block) {
      updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, fontStyle: isItalic ? 'normal' : 'italic' } }));
    } else {
      execCmd('italic');
    }
  };

  const toggleUnderline = () => {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.toString().length > 0) {
      execCmd('underline');
    } else if (block) {
      updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, textDecoration: isUnderline ? 'none' : 'underline' } }));
    } else {
      execCmd('underline');
    }
  };

  const setAlign = (align: TextAlign) => {
    if (block) {
      updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, align } }));
      showNotification(`Aligned ${align}`);
    }
    setShowAlignMenu(false);
  };

  const setLineSpacing = (spacing: string) => {
    if (!block) return;
    if (spacing === 'add-space-before') {
      updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, marginTop: '16px' } }));
      showNotification('Added space before paragraph');
    } else if (spacing === 'add-space-after') {
      updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, marginBottom: '16px' } }));
      showNotification('Added space after paragraph');
    } else {
      const num = parseFloat(spacing) || 1.5;
      updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, lineHeight: num } }));
      showNotification(`Line spacing: ${spacing}`);
    }
    setShowSpacingMenu(false);
  };

  // Convert to List
  const toggleList = (style: ListStyle) => {
    if (!block) return;
    if (block.type === 'list' && (block.attributes.style || 'bullet') === style) {
      // Toggle OFF back to paragraph
      updateBlock(block.id, (b) => ({ ...b, type: 'paragraph' }));
      showNotification('Converted to paragraph');
    } else {
      updateBlock(block.id, (b) => ({ ...b, type: 'list', attributes: { ...b.attributes, style } }));
      showNotification(`Applied ${style} list`);
    }
  };

  // Indent / Outdent
  const handleIndent = (dir: 'in' | 'out') => {
    if (dir === 'in') {
      execCmd('indent');
      showNotification('Indented');
    } else {
      execCmd('outdent');
      showNotification('Decreased indent');
    }
  };

  // Link Popover Handler
  const openLinkPopover = () => {
    saveSelection();
    const sel = window.getSelection();
    let existingHref = '';
    let existingText = '';

    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      let node: Node | null = range.commonAncestorContainer;
      if (node.nodeType === 3) node = node.parentNode;
      const anchor = (node as HTMLElement)?.closest('a');
      if (anchor) {
        existingHref = anchor.getAttribute('href') || '';
        existingText = anchor.textContent || '';
      } else if (!sel.isCollapsed) {
        existingText = sel.toString().trim();
      }
    }

    setLinkUrl(existingHref);
    setLinkText(existingText);
    setShowLink((prev) => !prev);
  };

  const applyLink = () => {
    if (!linkUrl.trim()) {
      setShowLink(false);
      return;
    }
    let formatted = linkUrl.trim();
    if (!/^https?:\/\//i.test(formatted) && !/^mailto:/i.test(formatted) && !/^#/i.test(formatted)) {
      formatted = 'https://' + formatted;
    }
    restoreSelection();
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
      document.execCommand('createLink', false, formatted);
    } else {
      const textToDisplay = linkText.trim() || formatted;
      document.execCommand('insertHTML', false, `<a href="${formatted}" target="_blank" rel="noopener noreferrer">${textToDisplay}</a>&nbsp;`);
    }
    setLinkUrl('');
    setLinkText('');
    setShowLink(false);
    showNotification('Link applied');
  };

  // Current Style Value
  const currentStyleValue =
    block?.type === 'heading'
      ? block.attributes.level === 1
        ? 'h1'
        : block.attributes.level === 2
          ? 'h2'
          : `h${block.attributes.level || 2}`
      : block?.type || 'paragraph';

  // Active specialized component (e.g. ImageToolbar, TableToolbar, etc.)
  const SpecializedToolbar = block && BLOCK_TOOLBAR_REGISTRY[block.type];

  const btnBaseClass =
    'h-7 sm:h-8 px-1.5 sm:px-2 rounded-md flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 transition-colors cursor-pointer text-xs font-semibold shrink-0 select-none';

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200/90 dark:border-slate-800 px-2 sm:px-4 py-1.5 flex items-center justify-between gap-1 sm:gap-1.5 shrink-0 transition-all select-none w-full overflow-visible backdrop-blur-md"
    >
      {/* Toast Notification */}
      {toast && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl z-[110] animate-bounce">
          {toast}
        </div>
      )}

      {/* Main Google Docs Pill Bar */}
      <div className="flex items-center gap-0.5 sm:gap-1 bg-[#edf2fa] dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-full px-2 sm:px-3 py-1 w-full max-w-full overflow-visible shadow-2xs">
        {/* Multi-select indicator if multiple blocks selected */}
        {selectedIds.length > 1 ? (
          <MultiSelectToolbar selectedIds={selectedIds} showNotification={showNotification} />
        ) : (
          <>
            {/* 1. Undo & Redo */}
            <Tooltip text="Undo (Ctrl+Z)">
              <button
                type="button"
                onClick={undo}
                disabled={past.length === 0}
                className={`${btnBaseClass} disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                <Undo2 size={15} />
              </button>
            </Tooltip>

            <Tooltip text="Redo (Ctrl+Y)">
              <button
                type="button"
                onClick={redo}
                disabled={future.length === 0}
                className={`${btnBaseClass} disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                <Redo2 size={15} />
              </button>
            </Tooltip>

            {/* 2. Print */}
            <Tooltip text="Print (Ctrl+P)">
              <button
                type="button"
                onClick={() => window.print()}
                className={btnBaseClass}
              >
                <Printer size={15} />
              </button>
            </Tooltip>

            {/* 3. Format Painter */}
            <Tooltip text="Paint format">
              <button
                type="button"
                onClick={handleFormatPainter}
                className={`${btnBaseClass} ${formatPainterActive ? 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300 font-bold' : ''}`}
              >
                <Paintbrush size={14} />
              </button>
            </Tooltip>

            {/* 4. Zoom Dropdown */}
            <Tooltip text="Zoom">
              <div className="w-18 sm:w-20">
                <CustomSelect
                  value={`${zoomLevel}%`}
                  options={[
                    { value: '50%', label: '50%' },
                    { value: '75%', label: '75%' },
                    { value: '90%', label: '90%' },
                    { value: '100%', label: '100%' },
                    { value: '125%', label: '125%' },
                    { value: '150%', label: '150%' },
                  ]}
                  onChange={(val) => {
                    const num = parseInt(String(val).replace('%', ''), 10) || 100;
                    setZoomLevel(num);
                  }}
                  size="sm"
                  buttonClassName="border-transparent bg-transparent hover:bg-slate-200/80 dark:hover:bg-slate-700/80 px-2 py-1 text-xs"
                />
              </div>
            </Tooltip>

            <div className="w-px h-4.5 bg-slate-300 dark:bg-slate-700 mx-0.5 sm:mx-1 shrink-0" />

            {/* 5. Styles Dropdown (Normal text ▾) */}
            <Tooltip text="Styles">
              <div className="w-28 sm:w-32">
                <CustomSelect
                  value={currentStyleValue}
                  options={GOOGLE_DOCS_STYLES}
                  onChange={(val) => changeBlockStyle(String(val))}
                  size="sm"
                  buttonClassName="border-transparent bg-transparent hover:bg-slate-200/80 dark:hover:bg-slate-700/80 px-2 py-1 text-xs font-medium truncate"
                />
              </div>
            </Tooltip>

            <div className="w-px h-4.5 bg-slate-300 dark:bg-slate-700 mx-0.5 sm:mx-1 shrink-0" />

            {/* 6. Font Family Dropdown (Arial ▾) */}
            <Tooltip text="Font">
              <div className="w-26 sm:w-30">
                <CustomSelect
                  value={(a.fontFamily as string) || 'arial'}
                  options={GOOGLE_DOCS_FONTS}
                  onChange={(val) => changeFontFamily(String(val))}
                  size="sm"
                  buttonClassName="border-transparent bg-transparent hover:bg-slate-200/80 dark:hover:bg-slate-700/80 px-2 py-1 text-xs font-medium truncate"
                />
              </div>
            </Tooltip>

            <div className="w-px h-4.5 bg-slate-300 dark:bg-slate-700 mx-0.5 sm:mx-1 shrink-0" />

            {/* 7. Font Size Stepper (- 11 +) */}
            <div className="flex items-center gap-0.5 shrink-0">
              <Tooltip text="Decrease font size (Ctrl+Shift+,)">
                <button
                  type="button"
                  onClick={() => changeFontSize(currentFontSize - 1)}
                  className="w-6 h-7 rounded-md flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 cursor-pointer"
                >
                  <Minus size={13} />
                </button>
              </Tooltip>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowFontSizeDropdown(!showFontSizeDropdown)}
                  className="w-8 h-7 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center cursor-pointer shadow-2xs hover:border-blue-500"
                >
                  {currentFontSize}
                </button>
                {showFontSizeDropdown && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-16 max-h-48 overflow-y-auto be-scroll bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-[150] p-1">
                    {FONT_SIZE_PRESETS.map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => changeFontSize(sz)}
                        className={`w-full py-1 text-xs text-center rounded-md cursor-pointer ${currentFontSize === sz ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Tooltip text="Increase font size (Ctrl+Shift+.)">
                <button
                  type="button"
                  onClick={() => changeFontSize(currentFontSize + 1)}
                  className="w-6 h-7 rounded-md flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 cursor-pointer"
                >
                  <Plus size={13} />
                </button>
              </Tooltip>
            </div>

            <div className="w-px h-4.5 bg-slate-300 dark:bg-slate-700 mx-0.5 sm:mx-1 shrink-0" />

            {/* 8. Bold, Italic, Underline */}
            <Tooltip text="Bold (Ctrl+B)">
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
                onClick={toggleBold}
                className={`${btnBaseClass} ${isBold ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-bold shadow-2xs' : ''}`}
              >
                <Bold size={15} />
              </button>
            </Tooltip>

            <Tooltip text="Italic (Ctrl+I)">
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
                onClick={toggleItalic}
                className={`${btnBaseClass} ${isItalic ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-bold shadow-2xs' : ''}`}
              >
                <Italic size={15} />
              </button>
            </Tooltip>

            <Tooltip text="Underline (Ctrl+U)">
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
                onClick={toggleUnderline}
                className={`${btnBaseClass} ${isUnderline ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-bold shadow-2xs' : ''}`}
              >
                <Underline size={15} />
              </button>
            </Tooltip>

            {/* 9. Text Color (A_) */}
            <div className="relative inline-flex items-center">
              <Tooltip text="Text color">
                <button
                  type="button"
                  onClick={() => setShowTextColor(!showTextColor)}
                  className="h-7 sm:h-8 px-1.5 rounded-md flex flex-col items-center justify-center hover:bg-slate-200/80 dark:hover:bg-slate-700/80 cursor-pointer"
                >
                  <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 leading-none">A</span>
                  <span
                    className="w-4 h-1 rounded-full mt-0.5 shadow-xs"
                    style={{ backgroundColor: (a.textColor as string) || '#111827' }}
                  />
                </button>
              </Tooltip>
              {showTextColor && (
                <div className="absolute top-full left-0 mt-2 p-2.5 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-[160] w-64 max-w-[calc(100vw-2rem)]">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Text Color</span>
                  <div className="grid grid-cols-10 gap-1.5 mb-2">
                    {GOOGLE_DOCS_TEXT_COLORS.map((clr, idx) => (
                      <button
                        key={`${clr}-${idx}`}
                        type="button"
                        onClick={() => {
                          execCmd('foreColor', clr);
                          setShowTextColor(false);
                        }}
                        className="w-4.5 h-4.5 rounded-full border border-slate-300/80 dark:border-slate-600 hover:scale-125 transition-transform cursor-pointer shadow-2xs"
                        style={{ backgroundColor: clr }}
                        title={clr}
                      />
                    ))}
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Custom:</span>
                    <input
                      type="color"
                      value={(a.textColor as string) || '#111827'}
                      onChange={(e) => execCmd('foreColor', e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 10. Highlight Color (Highlighter) */}
            <div className="relative inline-flex items-center">
              <Tooltip text="Highlight color">
                <button
                  type="button"
                  onClick={() => setShowHighlightColor(!showHighlightColor)}
                  className="h-7 sm:h-8 px-1.5 rounded-md flex flex-col items-center justify-center hover:bg-slate-200/80 dark:hover:bg-slate-700/80 cursor-pointer text-slate-700 dark:text-slate-200"
                >
                  <Highlighter size={14} />
                  <span
                    className="w-4 h-1 rounded-full mt-0.5 shadow-xs"
                    style={{ backgroundColor: (a.backgroundColor as string) || '#ffff00' }}
                  />
                </button>
              </Tooltip>
              {showHighlightColor && (
                <div className="absolute top-full left-0 mt-2 p-2.5 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-[160] w-56 max-w-[calc(100vw-2rem)]">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Highlight Color</span>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {GOOGLE_DOCS_HIGHLIGHT_COLORS.map((hc) => (
                      <button
                        key={hc.color}
                        type="button"
                        onClick={() => {
                          execCmd('hiliteColor', hc.color);
                          setShowHighlightColor(false);
                        }}
                        className={`h-7 rounded-lg text-xs font-semibold flex items-center justify-center border cursor-pointer ${hc.color === 'transparent' ? 'border-slate-300 dark:border-slate-700 text-slate-500' : 'border-transparent shadow-2xs'}`}
                        style={{ backgroundColor: hc.color }}
                      >
                        {hc.label === 'None' ? 'None' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="w-px h-4.5 bg-slate-300 dark:bg-slate-700 mx-0.5 sm:mx-1 shrink-0" />

            {/* 11. Insert Link */}
            <div className="relative inline-flex items-center">
              <Tooltip text="Insert link (Ctrl+K)">
                <button
                  type="button"
                  onClick={openLinkPopover}
                  className={btnBaseClass}
                >
                  <LinkIcon size={15} />
                </button>
              </Tooltip>
              {showLink && (
                <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2 z-[160] w-64 max-w-[calc(100vw-2rem)]">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    {linkUrl ? 'Edit Link' : 'Insert Link'}
                  </span>
                  <input
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
                    onKeyDown={(e) => e.key === 'Enter' && applyLink()}
                    autoFocus
                  />
                  <input
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="Link text (optional)"
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
                    onKeyDown={(e) => e.key === 'Enter' && applyLink()}
                  />
                  <div className="flex justify-end gap-1.5 mt-1">
                    <button onClick={() => setShowLink(false)} className="px-2.5 py-1 text-xs text-slate-500 cursor-pointer">
                      Cancel
                    </button>
                    <button
                      onClick={applyLink}
                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-blue-600 text-white cursor-pointer shadow-2xs hover:bg-blue-700 transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 12. Add Comment / Note */}
            <Tooltip text="Add comment">
              <button
                type="button"
                onClick={() => showNotification('Comment thread opened')}
                className={btnBaseClass}
              >
                <MessageSquare size={15} />
              </button>
            </Tooltip>

            {/* 13. Insert Image */}
            <Tooltip text="Insert image">
              <button
                type="button"
                onClick={() => {
                  insertBlock('image');
                  showNotification('Image block inserted');
                }}
                className={btnBaseClass}
              >
                <ImageIcon size={15} />
              </button>
            </Tooltip>

            {/* If specialized block (Image, Table, Columns, Button) is active, show its quick controls */}
            {SpecializedToolbar && (
              <>
                <div className="w-px h-4.5 bg-slate-300 dark:bg-slate-700 mx-0.5 sm:mx-1 shrink-0" />
                <SpecializedToolbar
                  block={block}
                  execCmd={execCmd}
                  saveSelection={saveSelection}
                  showNotification={showNotification}
                />
              </>
            )}

            <div className="w-px h-4.5 bg-slate-300 dark:bg-slate-700 mx-0.5 sm:mx-1 shrink-0" />

            {/* 14. Google Docs 3-DOTS MORE BUTTON (⋮) */}
            <div ref={moreMenuRef} className="relative inline-flex items-center ml-auto">
              <Tooltip text="More">
                <button
                  type="button"
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className={`h-7 sm:h-8 px-2 rounded-md flex items-center justify-center transition-all cursor-pointer ${showMoreMenu
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold shadow-2xs ring-1 ring-blue-400'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700/80'
                    }`}
                >
                  <MoreVertical size={16} />
                </button>
              </Tooltip>

              {/* 3-DOTS FLOATING OVERFLOW POPUP (Exact Google Docs Layout) */}
              {showMoreMenu && (
                <div className="absolute top-full right-0 mt-2 p-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-1 z-[200] animate-in fade-in zoom-in-95 duration-100 max-w-[calc(100vw-1.5rem)] overflow-x-auto be-scroll">
                  {/* A. Align Dropdown (≡ ▾) */}
                  <div className="relative inline-flex items-center">
                    <Tooltip text="Align">
                      <button
                        type="button"
                        onClick={() => setShowAlignMenu(!showAlignMenu)}
                        className="h-8 px-2 rounded-lg flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-slate-700 dark:text-slate-200 text-xs font-semibold"
                      >
                        {currentAlign === 'center' ? (
                          <AlignCenter size={16} />
                        ) : currentAlign === 'right' ? (
                          <AlignRight size={16} />
                        ) : currentAlign === 'justify' ? (
                          <AlignJustify size={16} />
                        ) : (
                          <AlignLeft size={16} />
                        )}
                        <ChevronDown size={12} className="text-slate-400" />
                      </button>
                    </Tooltip>
                    {showAlignMenu && (
                      <div className="absolute top-full left-0 mt-1 p-1 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-1 z-[210]">
                        <button
                          onClick={() => setAlign('left')}
                          className={`p-1.5 rounded-lg cursor-pointer ${currentAlign === 'left' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100'}`}
                          title="Left align"
                        >
                          <AlignLeft size={15} />
                        </button>
                        <button
                          onClick={() => setAlign('center')}
                          className={`p-1.5 rounded-lg cursor-pointer ${currentAlign === 'center' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100'}`}
                          title="Center align"
                        >
                          <AlignCenter size={15} />
                        </button>
                        <button
                          onClick={() => setAlign('right')}
                          className={`p-1.5 rounded-lg cursor-pointer ${currentAlign === 'right' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100'}`}
                          title="Right align"
                        >
                          <AlignRight size={15} />
                        </button>
                        <button
                          onClick={() => setAlign('justify')}
                          className={`p-1.5 rounded-lg cursor-pointer ${currentAlign === 'justify' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100'}`}
                          title="Justify"
                        >
                          <AlignJustify size={15} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* B. Line & Paragraph Spacing (↕≡) */}
                  <div className="relative inline-flex items-center">
                    <Tooltip text="Line & paragraph spacing">
                      <button
                        type="button"
                        onClick={() => setShowSpacingMenu(!showSpacingMenu)}
                        className="h-8 px-2 rounded-lg flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-slate-700 dark:text-slate-200"
                      >
                        <ArrowUpDown size={15} />
                        <ChevronDown size={12} className="text-slate-400" />
                      </button>
                    </Tooltip>
                    {showSpacingMenu && (
                      <div className="absolute top-full left-0 mt-1 p-1 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-0.5 z-[210] w-48">
                        <button onClick={() => setLineSpacing('1')} className="px-3 py-1.5 text-xs text-left rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                          Single (1.0)
                        </button>
                        <button onClick={() => setLineSpacing('1.15')} className="px-3 py-1.5 text-xs text-left rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                          1.15
                        </button>
                        <button onClick={() => setLineSpacing('1.5')} className="px-3 py-1.5 text-xs text-left rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                          1.5
                        </button>
                        <button onClick={() => setLineSpacing('2')} className="px-3 py-1.5 text-xs text-left rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                          Double (2.0)
                        </button>
                        <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                        <button onClick={() => setLineSpacing('add-space-before')} className="px-3 py-1.5 text-xs text-left rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                          Add space before paragraph
                        </button>
                        <button onClick={() => setLineSpacing('add-space-after')} className="px-3 py-1.5 text-xs text-left rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                          Add space after paragraph
                        </button>
                      </div>
                    )}
                  </div>

                  {/* C. Checklist (☑≡) */}
                  <Tooltip text="Checklist menu">
                    <button
                      type="button"
                      onClick={() => toggleList('checklist')}
                      className={`h-8 px-2 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ${block?.type === 'list' && block.attributes.style === 'checklist' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 font-bold' : 'text-slate-700 dark:text-slate-200'}`}
                    >
                      <CheckSquare size={16} />
                    </button>
                  </Tooltip>

                  {/* D. Bulleted List (•≡) */}
                  <Tooltip text="Bulleted list (Ctrl+Shift+8)">
                    <button
                      type="button"
                      onClick={() => toggleList('bullet')}
                      className={`h-8 px-2 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ${block?.type === 'list' && (block.attributes.style === 'bullet' || !block.attributes.style) ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 font-bold' : 'text-slate-700 dark:text-slate-200'}`}
                    >
                      <List size={16} />
                    </button>
                  </Tooltip>

                  {/* E. Numbered List (1≡) */}
                  <Tooltip text="Numbered list (Ctrl+Shift+7)">
                    <button
                      type="button"
                      onClick={() => toggleList('number')}
                      className={`h-8 px-2 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ${block?.type === 'list' && block.attributes.style === 'number' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 font-bold' : 'text-slate-700 dark:text-slate-200'}`}
                    >
                      <ListOrdered size={16} />
                    </button>
                  </Tooltip>

                  {/* F. Decrease Indent (⇤) */}
                  <Tooltip text="Decrease indent (Ctrl+[)">
                    <button
                      type="button"
                      onClick={() => handleIndent('out')}
                      className="h-8 px-2 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-slate-700 dark:text-slate-200"
                    >
                      <Outdent size={16} />
                    </button>
                  </Tooltip>

                  {/* G. Increase Indent (⇥) */}
                  <Tooltip text="Increase indent (Ctrl+])">
                    <button
                      type="button"
                      onClick={() => handleIndent('in')}
                      className="h-8 px-2 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-slate-700 dark:text-slate-200"
                    >
                      <Indent size={16} />
                    </button>
                  </Tooltip>

                  {/* H. Clear Formatting (T̸) */}
                  <Tooltip text="Clear formatting (Ctrl+\)">
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
                      onClick={() => {
                        execCmd('removeFormat');
                        showNotification('Formatting cleared');
                      }}
                      className="h-8 px-2 rounded-lg flex items-center justify-center hover:bg-red-50 text-slate-700 hover:text-red-600 dark:text-slate-200 dark:hover:text-red-400 cursor-pointer"
                    >
                      <Eraser size={16} />
                    </button>
                  </Tooltip>

                  <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1 shrink-0" />

                  {/* I. Block Specific Operations */}
                  {block && (
                    <div className="flex items-center gap-0.5">
                      <Tooltip text="Move Up">
                        <button
                          type="button"
                          onClick={() => {
                            moveBlock(block.id, 'up');
                            showNotification('Moved up');
                          }}
                          className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-slate-700 dark:text-slate-200"
                        >
                          <ArrowUp size={15} />
                        </button>
                      </Tooltip>

                      <Tooltip text="Move Down">
                        <button
                          type="button"
                          onClick={() => {
                            moveBlock(block.id, 'down');
                            showNotification('Moved down');
                          }}
                          className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-slate-700 dark:text-slate-200"
                        >
                          <ArrowDown size={15} />
                        </button>
                      </Tooltip>

                      <Tooltip text="Duplicate Block">
                        <button
                          type="button"
                          onClick={() => {
                            duplicateBlock(block.id);
                            showNotification('Duplicated block');
                          }}
                          className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-blue-50 text-slate-700 hover:text-blue-600 dark:text-slate-200 cursor-pointer"
                        >
                          <CopyPlus size={15} />
                        </button>
                      </Tooltip>

                      <Tooltip text="Edit HTML">
                        <button
                          type="button"
                          onClick={() => toggleHtmlMode(block.id)}
                          className={`h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer ${htmlModeBlockIds.includes(block.id) ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        >
                          <Code2 size={15} />
                        </button>
                      </Tooltip>

                      <Tooltip text={block.attributes?.pinned ? 'Unpin' : 'Pin'}>
                        <button
                          type="button"
                          onClick={() => {
                            const isPinned = Boolean(block.attributes?.pinned);
                            updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, pinned: !isPinned } }));
                            showNotification(!isPinned ? 'Block pinned' : 'Block unpinned');
                          }}
                          className={`h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer ${block.attributes?.pinned ? 'bg-amber-500 text-white font-bold' : 'text-slate-700 dark:text-slate-200 hover:bg-amber-50'}`}
                        >
                          <Pin size={15} className={block.attributes?.pinned ? 'rotate-45' : ''} />
                        </button>
                      </Tooltip>

                      <Tooltip text="Delete Block">
                        <button
                          type="button"
                          onClick={() => {
                            removeBlock(block.id);
                            showNotification('Block deleted');
                          }}
                          className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-red-50 text-red-600 dark:hover:bg-red-950/40 cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </Tooltip>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
