import { useState, useRef, useEffect } from 'react';
import {
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  CheckSquare, Image as ImageIcon, Smile, Columns3, Rows3, Table as TableIcon, Link as LinkIcon,
  Undo2, Redo2, Pin, Code2, Eraser, Indent, Outdent, Crop, ExternalLink,
  Trash2, Video, Highlighter, Upload, Subtitles, Tag as TagIcon,
  Columns as ColumnsIcon, Layers, Plus, Copy as CopyIcon, CopyPlus,
  ArrowUp, ArrowDown, ChevronDown, Sliders, MoreVertical, MoreHorizontal, ChevronRight, X,
  Bold, Italic, Underline, Maximize2, Square, Settings, PenTool,
} from 'lucide-react';
import { useEditorStore, findBlock } from './store';
import { createBlock, getBlockLabel, getBlockIcon } from './blocks/registry';
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
      <div className={`absolute top-full mt-2.5 ${alignClasses} hidden group-hover:flex flex-col items-center pointer-events-none z-[99999]`}>
        <div className={`w-2 h-2 bg-slate-900 dark:bg-slate-800 rotate-45 -mb-1 shadow-xs border-t border-l border-slate-700/60 ${arrowAlignClasses}`} />
        <span className="px-2.5 py-1 text-[11px] font-semibold text-white bg-slate-900 dark:bg-slate-800 rounded-lg shadow-2xl border border-slate-700/60 whitespace-nowrap block">
          {text}
        </span>
      </div>
    </div>
  );
}

// ==========================================
// REUSABLE TOOLBAR COMPONENTS
// ==========================================

const blockTypeOptions: SelectOption[] = [
  { value: 'paragraph', label: 'Paragraph', subLabel: '¶' },
  { value: 'h1', label: 'Heading 1', subLabel: 'H₁' },
  { value: 'h2', label: 'Heading 2', subLabel: 'H₂' },
  { value: 'h3', label: 'Heading 3', subLabel: 'H₃' },
  { value: 'h4', label: 'Heading 4', subLabel: 'H₄' },
  { value: 'h5', label: 'Heading 5', subLabel: 'H₅' },
  { value: 'h6', label: 'Heading 6', subLabel: 'H₆' },
  { value: 'list-bullet', label: 'Bullet List', subLabel: '•' },
  { value: 'list-number', label: 'Numbered List', subLabel: '1.' },
  { value: 'list-checklist', label: 'Checklist', subLabel: '☑' },
  { value: 'quote', label: 'Quote', subLabel: '❝' },
  { value: 'code', label: 'Code', subLabel: '</>' },
  { value: 'preformatted', label: 'Preformatted', subLabel: '⁋' },
  { value: 'pullquote', label: 'Pullquote', subLabel: '“' },
];

interface CommonToolbarProps {
  block: BlockInstance;
  execCmd: (cmd: string, value?: string) => void;
  saveSelection: () => void;
  showNotification: (msg: string) => void;
}

function BlockTypeSelector({ block }: { block: BlockInstance }) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const insertBlock = useEditorStore((s) => s.insertBlock);

  const toRichText = (value: unknown): RichTextValue => {
    if (Array.isArray(value)) return value as RichTextValue;
    return value ? [{ text: String(value) }] : [];
  };

  const changeBlockTypeAndLevel = (type: string, level?: number, listStyle?: ListStyle) => {
    if (!block) {
      const newBlock = createBlock(type);
      if (newBlock && type === 'list' && listStyle) newBlock.attributes.style = listStyle;
      insertBlock(type);
      return;
    }

    const next = createBlock(type);
    if (!next) return;

    const currentContent = block.type === 'list'
      ? (block.attributes.items as { content: RichTextValue }[] | undefined)?.[0]?.content
      : block.attributes.content;

    updateBlock(block.id, (current) => {
      const attributes: Record<string, unknown> = {
        ...next.attributes,
        ...current.attributes,
        align: current.attributes.align ?? next.attributes.align,
      };

      if (type !== current.type || (type === 'heading' && level && level !== current.attributes.level)) {
        delete attributes.fontSize;
        delete attributes.fontWeight;
      }

      if (type === 'heading') {
        attributes.level = level ?? (current.type === 'heading' ? (current.attributes.level as number) : 1);
      } else if (level) {
        attributes.level = level;
      }

      if (type === 'code' || type === 'preformatted') {
        attributes.content = blockToHtmlCode(current);
      } else if (type === 'list') {
        if (listStyle) attributes.style = listStyle;
        attributes.items = (current.type === 'list' && current.attributes.items)
          ? current.attributes.items
          : [{ id: `${current.id}-item`, content: toRichText(currentContent) }];
      } else {
        attributes.content = toRichText(currentContent);
      }

      return { ...current, type, attributes };
    });
  };

  return (
    <Tooltip text="Block type">
      <div className="w-36 min-w-[135px] max-w-[155px]">
        <CustomSelect
          value={
            block.type === 'heading'
              ? `h${block.attributes.level || 2}`
              : block.type === 'list'
                ? `list-${block.attributes.style || 'bullet'}`
                : block.type || 'paragraph'
          }
          options={blockTypeOptions}
          onChange={(val) => {
            const strVal = String(val);
            if (strVal.startsWith('h')) {
              const lvl = parseInt(strVal.replace('h', ''), 10);
              changeBlockTypeAndLevel('heading', lvl);
            } else if (strVal === 'list-bullet') {
              changeBlockTypeAndLevel('list', undefined, 'bullet');
            } else if (strVal === 'list-number') {
              changeBlockTypeAndLevel('list', undefined, 'number');
            } else if (strVal === 'list-checklist') {
              changeBlockTypeAndLevel('list', undefined, 'checklist');
            } else {
              changeBlockTypeAndLevel(strVal);
            }
          }}
          size="sm"
        />
      </div>
    </Tooltip>
  );
}

function InlineFormattingControls({
  block,
  execCmd,
  saveSelection,
}: {
  block?: BlockInstance;
  execCmd: (cmd: string, value?: string) => void;
  saveSelection: () => void;
}) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const a = block?.attributes || {};

  const isBold = (a.fontWeight as number) === 700 || a.fontWeight === 'bold';
  const isItalic = a.fontStyle === 'italic';
  const isUnderline = a.textDecoration === 'underline';
  const isStrikethrough = a.textDecoration === 'line-through';

  const handleToggle = (format: 'bold' | 'italic' | 'underline' | 'strikethrough') => {
    const sel = window.getSelection();
    const hasTextSelection = sel && !sel.isCollapsed && sel.toString().length > 0;
    if (hasTextSelection) {
      execCmd(format === 'strikethrough' ? 'strikeThrough' : format);
    } else if (block) {
      if (format === 'bold') {
        const next = isBold ? 400 : 700;
        updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, fontWeight: next } }));
      } else if (format === 'italic') {
        const next = isItalic ? 'normal' : 'italic';
        updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, fontStyle: next } }));
      } else if (format === 'underline') {
        const next = isUnderline ? 'none' : 'underline';
        updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, textDecoration: next } }));
      } else if (format === 'strikethrough') {
        const next = isStrikethrough ? 'none' : 'line-through';
        updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, textDecoration: next } }));
      }
    } else {
      execCmd(format === 'strikethrough' ? 'strikeThrough' : format);
    }
  };

  const getBtnClass = (active: boolean) =>
    `w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-xs transition-all cursor-pointer shrink-0 ${active
      ? 'bg-primary-500 text-white shadow-2xs font-bold'
      : 'text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40'
    }`;

  return (
    <div className="flex items-center gap-0.5 flex-wrap">
      <Tooltip text="Bold (Ctrl+B)">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
          onClick={() => handleToggle('bold')}
          className={getBtnClass(isBold)}
        >
          B
        </button>
      </Tooltip>

      <Tooltip text="Italic (Ctrl+I)">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
          onClick={() => handleToggle('italic')}
          className={`${getBtnClass(isItalic)} italic`}
        >
          I
        </button>
      </Tooltip>

      <Tooltip text="Underline (Ctrl+U)">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
          onClick={() => handleToggle('underline')}
          className={`${getBtnClass(isUnderline)} underline`}
        >
          U
        </button>
      </Tooltip>

      <Tooltip text="Strikethrough">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
          onClick={() => handleToggle('strikethrough')}
          className={`${getBtnClass(isStrikethrough)} line-through`}
        >
          S
        </button>
      </Tooltip>

      <Tooltip text="Subscript (X₂)">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
          onClick={() => execCmd('subscript')}
          className="w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-xs text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-colors cursor-pointer shrink-0"
        >
          X<sub>2</sub>
        </button>
      </Tooltip>

      <Tooltip text="Superscript (X²)">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
          onClick={() => execCmd('superscript')}
          className="w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-xs text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-colors cursor-pointer shrink-0"
        >
          X<sup>2</sup>
        </button>
      </Tooltip>
    </div>
  );
}

function AlignmentPicker({ block, showNotification }: { block: BlockInstance; showNotification: (msg: string) => void }) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const currentAlign = (block.attributes.align as TextAlign) || 'left';

  const setAlign = (align: TextAlign) => {
    updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, align } }));
    showNotification(`Aligned ${align}`);
  };

  return (
    <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700">
      <Tooltip text="Align Left">
        <button
          onClick={() => setAlign('left')}
          className={`w-7 h-7 rounded flex items-center justify-center transition-colors cursor-pointer ${currentAlign === 'left' ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-2xs' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
        >
          <AlignLeft size={14} />
        </button>
      </Tooltip>
      <Tooltip text="Align Center">
        <button
          onClick={() => setAlign('center')}
          className={`w-7 h-7 rounded flex items-center justify-center transition-colors cursor-pointer ${currentAlign === 'center' ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-2xs' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
        >
          <AlignCenter size={14} />
        </button>
      </Tooltip>
      <Tooltip text="Align Right">
        <button
          onClick={() => setAlign('right')}
          className={`w-7 h-7 rounded flex items-center justify-center transition-colors cursor-pointer ${currentAlign === 'right' ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-2xs' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
        >
          <AlignRight size={14} />
        </button>
      </Tooltip>
      <Tooltip text="Justify">
        <button
          onClick={() => setAlign('justify')}
          className={`w-7 h-7 rounded flex items-center justify-center transition-colors cursor-pointer ${currentAlign === 'justify' ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-2xs' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
        >
          <AlignJustify size={14} />
        </button>
      </Tooltip>
    </div>
  );
}

function ListControls({ block }: { block: BlockInstance }) {
  const updateBlock = useEditorStore((s) => s.updateBlock);

  const convertToList = (listStyle: ListStyle) => {
    const currentBlocks = useEditorStore.getState().blocks;
    const blockIdx = currentBlocks.findIndex((b) => b.id === block.id);

    if (block.type === 'list') {
      const items = (block.attributes.items as { id: string; content: RichTextValue }[]) || [];
      const currentStyle = block.attributes.style || 'bullet';

      if (currentStyle === listStyle) {
        // Toggle OFF: Convert list block back to paragraph block(s)
        const firstItemContent = items[0]?.content || [];
        updateBlock(block.id, (current) => ({
          ...current,
          type: 'paragraph',
          attributes: {
            content: firstItemContent,
          },
        }));

        if (items.length > 1 && blockIdx !== -1) {
          const extraParagraphs: BlockInstance[] = items.slice(1).map((it) => ({
            id: createId(),
            type: 'paragraph',
            attributes: { content: it.content || [] },
          }));

          useEditorStore.setState((state) => {
            const newBlocks = [...state.blocks];
            newBlocks.splice(blockIdx + 1, 0, ...extraParagraphs);
            return { blocks: newBlocks };
          });
        }
        return;
      }

      // Switch list style (e.g. bullet -> number)
      updateBlock(block.id, (current) => ({
        ...current,
        attributes: { ...current.attributes, style: listStyle },
      }));
      return;
    }

    // Convert non-list block (e.g. paragraph/heading) to list block
    const next = createBlock('list');
    if (!next) return;

    const toRichText = (val: unknown): RichTextValue => {
      if (Array.isArray(val)) return val as RichTextValue;
      return val ? [{ text: String(val) }] : [];
    };

    updateBlock(block.id, (current) => ({
      ...current,
      type: 'list',
      attributes: {
        ...next.attributes,
        ...current.attributes,
        style: listStyle,
        items: [{ id: createId(), content: toRichText(current.attributes.content), level: 0 }],
      },
    }));
  };

  const isBullet = block.type === 'list' && (block.attributes.style === 'bullet' || !block.attributes.style);
  const isNumber = block.type === 'list' && block.attributes.style === 'number';

  return (
    <>
      <Tooltip text="Bullet List">
        <button
          onClick={() => convertToList('bullet')}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0 ${isBullet
            ? 'bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 font-semibold'
            : 'text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40'
            }`}
        >
          <List size={16} />
        </button>
      </Tooltip>
      <Tooltip text="Numbered List">
        <button
          onClick={() => convertToList('number')}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0 ${isNumber
            ? 'bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 font-semibold'
            : 'text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40'
            }`}
        >
          <ListOrdered size={16} />
        </button>
      </Tooltip>
    </>
  );
}

// ==========================================
// DESKTOP BLOCK MORE MENU COMPONENT (⋯)
// ==========================================

function BlockMoreMenu({ block }: { block: BlockInstance }) {
  const [open, setOpen] = useState(false);
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const duplicateBlock = useEditorStore((s) => s.duplicateBlock);
  const removeBlock = useEditorStore((s) => s.removeBlock);
  const moveBlock = useEditorStore((s) => s.moveBlock);
  const toggleHtmlMode = useEditorStore((s) => s.toggleHtmlMode);
  const htmlModeBlockIds = useEditorStore((s) => s.htmlModeBlockIds);
  const isHtml = htmlModeBlockIds.includes(block.id);
  const isPinned = Boolean(block.attributes?.pinned);

  return (
    <div className="relative inline-flex items-center shrink-0">
      <Tooltip text="More options">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
            open
              ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white'
              : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50/70 dark:hover:bg-blue-950/40'
          }`}
        >
          <MoreHorizontal size={16} />
        </button>
      </Tooltip>

      {open && (
        <>
          <div className="fixed inset-0 z-[120]" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/90 dark:border-slate-800 p-1.5 flex flex-col gap-0.5 z-[130] animate-in fade-in zoom-in-95 duration-150 select-none">
            <button
              type="button"
              onClick={() => { moveBlock(block.id, 'up'); setOpen(false); }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer w-full text-left"
            >
              <ArrowUp size={14} className="text-slate-400" />
              <span>Move Up</span>
            </button>
            <button
              type="button"
              onClick={() => { moveBlock(block.id, 'down'); setOpen(false); }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer w-full text-left"
            >
              <ArrowDown size={14} className="text-slate-400" />
              <span>Move Down</span>
            </button>
            <button
              type="button"
              onClick={() => { duplicateBlock(block.id); setOpen(false); }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer w-full text-left"
            >
              <CopyPlus size={14} className="text-slate-400" />
              <span>Duplicate</span>
            </button>
            <button
              type="button"
              onClick={() => {
                updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, pinned: !isPinned } }));
                setOpen(false);
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer w-full text-left"
            >
              <Pin size={14} className={isPinned ? 'text-amber-500' : 'text-slate-400'} />
              <span>{isPinned ? 'Unpin Block' : 'Pin to Top'}</span>
            </button>
            <button
              type="button"
              onClick={() => { toggleHtmlMode(block.id); setOpen(false); }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer w-full text-left"
            >
              <Code2 size={14} className="text-slate-400" />
              <span>{isHtml ? 'Visual Editor' : 'Edit HTML'}</span>
            </button>
            <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
            <button
              type="button"
              onClick={() => { removeBlock(block.id); setOpen(false); }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer w-full text-left"
            >
              <Trash2 size={14} />
              <span>Delete Block</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ==========================================
// BLOCK SPECIFIC TOOLBAR IMPLEMENTATIONS
// ==========================================

function ParagraphToolbar({ block, execCmd, saveSelection }: CommonToolbarProps) {
  const [showLink, setShowLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [savedRange, setSavedRange] = useState<Range | null>(null);

  const openLinkPopover = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      setSavedRange(sel.getRangeAt(0).cloneRange());
      let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
      while (node && node !== document.body) {
        if (node.nodeType === 1 && (node as HTMLElement).tagName === 'A') {
          setLinkUrl((node as HTMLAnchorElement).getAttribute('href') || '');
          setLinkText((node as HTMLElement).innerText || '');
          setShowLink(true);
          return;
        }
        node = node.parentNode;
      }
      setLinkUrl('');
      setLinkText(sel.toString() || '');
      setShowLink(true);
    } else {
      setShowLink(true);
    }
  };

  const applyLink = () => {
    if (savedRange) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedRange);
    }
    let formatted = linkUrl.trim();
    if (formatted && !/^https?:\/\//i.test(formatted) && !/^mailto:/i.test(formatted) && !/^#/i.test(formatted)) {
      formatted = 'https://' + formatted;
    }
    if (formatted) {
      document.execCommand('createLink', false, formatted);
    }
    setShowLink(false);
  };

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
      <BlockTypeSelector block={block} />
      <span className="text-slate-300 dark:text-slate-700 font-bold px-1 select-none">⋮</span>
      <InlineFormattingControls block={block} execCmd={execCmd} saveSelection={saveSelection} />

      {/* Link Popover */}
      <div className="relative inline-flex items-center shrink-0">
        <Tooltip text="Link (Ctrl+K)">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={openLinkPopover}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-blue-50/70 dark:hover:bg-blue-950/40 transition-colors cursor-pointer shrink-0"
          >
            <LinkIcon size={15} />
          </button>
        </Tooltip>
        {showLink && (
          <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2 z-[130] w-64">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {linkUrl ? 'Edit Link' : 'Insert Link'}
            </span>
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && applyLink()}
            />
            <div className="flex justify-end gap-1.5 mt-1">
              <button type="button" onClick={() => setShowLink(false)} className="px-2.5 py-1 text-xs text-slate-500 cursor-pointer">
                Cancel
              </button>
              <button type="button" onClick={applyLink} className="px-3 py-1 text-xs font-semibold rounded-xl bg-blue-600 text-white cursor-pointer hover:bg-blue-700">
                {linkUrl ? 'Update' : 'Apply'}
              </button>
            </div>
          </div>
        )}
      </div>

      <BlockMoreMenu block={block} />
    </div>
  );
}

function HeadingToolbar({ block, execCmd, saveSelection, showNotification }: CommonToolbarProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const currentLvl = block.attributes.level || 2;
  const isBold = (block.attributes?.fontWeight === 700 || block.attributes?.fontWeight === 'bold') || true;
  const [showLink, setShowLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const toggleBold = () => {
    const next = block.attributes?.fontWeight === 400 ? 700 : 400;
    updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, fontWeight: next } }));
  };

  const applyLink = () => {
    let formatted = linkUrl.trim();
    if (formatted && !/^https?:\/\//i.test(formatted) && !/^#/i.test(formatted)) {
      formatted = 'https://' + formatted;
    }
    if (formatted) {
      document.execCommand('createLink', false, formatted);
    }
    setShowLink(false);
  };

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
      {/* Heading Level Dropdown with active blue tint */}
      <div className="w-18 shrink-0">
        <CustomSelect
          value={String(currentLvl)}
          options={[
            { value: '1', label: 'H1' },
            { value: '2', label: 'H2' },
            { value: '3', label: 'H3' },
            { value: '4', label: 'H4' },
            { value: '5', label: 'H5' },
            { value: '6', label: 'H6' },
          ]}
          onChange={(val) => {
            updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, level: Number(val) } }));
            showNotification(`Heading Level ${val}`);
          }}
          size="xs"
          buttonClassName="!h-8 !py-0 !px-2.5 !rounded-xl !bg-blue-50 dark:!bg-blue-950/70 !text-blue-600 dark:!text-blue-400 !border-blue-200/50 dark:!border-blue-800/50 font-bold text-xs"
        />
      </div>

      <span className="text-slate-300 dark:text-slate-700 font-bold px-1 select-none">⋮</span>

      {/* Bold */}
      <Tooltip text="Bold">
        <button
          type="button"
          onClick={toggleBold}
          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all cursor-pointer ${
            block.attributes?.fontWeight === 400
              ? 'text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800'
              : 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 font-bold border border-blue-200/50 dark:border-blue-800/50'
          }`}
        >
          B
        </button>
      </Tooltip>

      {/* Alignment */}
      <AlignmentPicker block={block} showNotification={showNotification} />

      {/* Link */}
      <div className="relative inline-flex items-center shrink-0">
        <Tooltip text="Link">
          <button
            type="button"
            onClick={() => setShowLink(!showLink)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-blue-50/70 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
          >
            <LinkIcon size={15} />
          </button>
        </Tooltip>
        {showLink && (
          <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2 z-[130] w-64">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Heading Link</span>
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && applyLink()}
            />
            <div className="flex justify-end gap-1.5 mt-1">
              <button type="button" onClick={() => setShowLink(false)} className="px-2.5 py-1 text-xs text-slate-500 cursor-pointer">
                Cancel
              </button>
              <button type="button" onClick={applyLink} className="px-3 py-1 text-xs font-semibold rounded-xl bg-blue-600 text-white cursor-pointer hover:bg-blue-700">
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      <BlockMoreMenu block={block} />
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

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
      <span className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center border border-slate-200/60 dark:border-slate-700/60 shrink-0">
        <ImageIcon size={15} />
      </span>

      <span className="text-slate-300 dark:text-slate-700 font-bold px-1 select-none">⋮</span>

      {/* Image Alignment */}
      <AlignmentPicker block={block} showNotification={showNotification} />

      {/* Aspect Ratio / Crop */}
      <div className="relative inline-flex items-center">
        <Tooltip text="Crop / Aspect Ratio">
          <button
            type="button"
            onClick={() => setShowCropMenu(!showCropMenu)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Crop size={15} />
          </button>
        </Tooltip>
        {showCropMenu && (
          <div className="absolute top-full left-0 mt-2 p-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-1 z-[130] w-36">
            {['auto', '16:9', '4:3', '1:1', '9:16', '3:2', '2:1'].map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => applyCropRatio(ratio)}
                className={`px-2.5 py-1 text-xs font-semibold text-left rounded-xl transition-colors cursor-pointer capitalize ${(block.attributes.aspectRatio || 'auto') === ratio ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                {ratio === 'auto' ? 'Original / Auto' : ratio}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Image Link */}
      <div className="relative inline-flex items-center">
        <Tooltip text="Image Link">
          <button
            type="button"
            onClick={() => setShowLinkPopover(!showLinkPopover)}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${block.attributes.link ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <LinkIcon size={15} />
          </button>
        </Tooltip>
        {showLinkPopover && (
          <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2 z-[130] w-64">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Image Link</span>
            <input
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              placeholder="https://example.com"
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && applyLink()}
              autoFocus
            />
            <div className="flex justify-end gap-1.5 mt-1">
              <button type="button" onClick={() => setShowLinkPopover(false)} className="px-2.5 py-1 text-xs text-slate-500 cursor-pointer">
                Cancel
              </button>
              <button type="button" onClick={applyLink} className="px-3 py-1 text-xs font-semibold rounded-xl bg-blue-600 text-white cursor-pointer hover:bg-blue-700">
                Save Link
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Alt Text */}
      <div className="relative inline-flex items-center">
        <Tooltip text="Alt Text">
          <button
            type="button"
            onClick={() => setShowAltPopover(!showAltPopover)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <TagIcon size={15} />
          </button>
        </Tooltip>
        {showAltPopover && (
          <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2 z-[130] w-64">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Alt Text (Accessibility)</span>
            <input
              value={altInput}
              onChange={(e) => setAltInput(e.target.value)}
              placeholder="Describe this image..."
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && applyAltText()}
              autoFocus
            />
            <div className="flex justify-end gap-1.5 mt-1">
              <button type="button" onClick={() => setShowAltPopover(false)} className="px-2.5 py-1 text-xs text-slate-500 cursor-pointer">
                Cancel
              </button>
              <button type="button" onClick={applyAltText} className="px-3 py-1 text-xs font-semibold rounded-xl bg-blue-600 text-white cursor-pointer hover:bg-blue-700">
                Save Alt
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Replace Image Button Pill */}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageReplace} className="hidden" />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="px-3 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
      >
        <span>Replace</span>
      </button>

      <BlockMoreMenu block={block} />
    </div>
  );
}

function ButtonToolbar({ block, showNotification }: CommonToolbarProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const [showUrlPopover, setShowUrlPopover] = useState(false);
  const [urlInput, setUrlInput] = useState((block.attributes.url as string) || '');
  const setSettingsSidebarOpen = useEditorStore((s) => s.setSettingsSidebarOpen);

  const applyUrl = () => {
    let formatted = urlInput.trim();
    if (formatted && !/^https?:\/\//i.test(formatted) && !/^#/i.test(formatted)) formatted = 'https://' + formatted;
    updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, url: formatted } }));
    setShowUrlPopover(false);
    showNotification('Button URL updated');
  };

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
      <span className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center border border-slate-200/60 dark:border-slate-700/60 shrink-0">
        <Square size={15} />
      </span>

      <span className="text-slate-300 dark:text-slate-700 font-bold px-1 select-none">⋮</span>

      <AlignmentPicker block={block} showNotification={showNotification} />

      {/* Destination URL */}
      <div className="relative inline-flex items-center">
        <Tooltip text="Button Link">
          <button
            type="button"
            onClick={() => setShowUrlPopover(!showUrlPopover)}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${block.attributes.url ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <LinkIcon size={15} />
          </button>
        </Tooltip>
        {showUrlPopover && (
          <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2 z-[130] w-64">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Button Destination</span>
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com"
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && applyUrl()}
              autoFocus
            />
            <div className="flex justify-end gap-1.5 mt-1">
              <button type="button" onClick={() => setShowUrlPopover(false)} className="px-2.5 py-1 text-xs text-slate-500 cursor-pointer">
                Cancel
              </button>
              <button type="button" onClick={applyUrl} className="px-3 py-1 text-xs font-semibold rounded-xl bg-blue-600 text-white cursor-pointer hover:bg-blue-700">
                Save
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Pill Button */}
      <button
        type="button"
        onClick={() => setSettingsSidebarOpen(true)}
        className="px-3 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
      >
        <span>Edit</span>
      </button>

      <BlockMoreMenu block={block} />
    </div>
  );
}

function ColumnsToolbar({ block, showNotification }: CommonToolbarProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const [showPicker, setShowPicker] = useState(false);
  const cols = (block.attributes.columns as number) || 2;

  const setColumnCount = (count: number) => {
    updateBlock(block.id, (b) => {
      const existing = b.innerBlocks ?? [];
      let nextInner = [...existing];
      if (existing.length < count) {
        for (let i = existing.length; i < count; i++) {
          nextInner.push({ id: `col-${Date.now()}-${i}`, type: 'column', attributes: {}, innerBlocks: [] });
        }
      } else if (existing.length > count) {
        nextInner = nextInner.slice(0, count);
      }
      return {
        ...b,
        attributes: { ...b.attributes, columns: count },
        innerBlocks: nextInner,
      };
    });
    setShowPicker(false);
    showNotification(`Columns set to ${count}`);
  };

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
      <span className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center border border-slate-200/60 dark:border-slate-700/60 shrink-0">
        <Columns3 size={15} />
      </span>

      <span className="text-slate-300 dark:text-slate-700 font-bold px-1 select-none">⋮</span>

      {/* Edit Layout Popover */}
      <div className="relative inline-flex items-center">
        <Tooltip text="Change Columns Layout">
          <button
            type="button"
            onClick={() => setShowPicker(!showPicker)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <PenTool size={15} />
          </button>
        </Tooltip>
        {showPicker && (
          <div className="absolute top-full left-0 mt-2 p-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex items-center gap-1 z-[130]">
            {[2, 3, 4].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setColumnCount(count)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${cols === count ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300 font-bold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                {count} Cols
              </button>
            ))}
          </div>
        )}
      </div>

      <BlockMoreMenu block={block} />
    </div>
  );
}

function TableToolbar({ block, showNotification }: CommonToolbarProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const a = block.attributes;

  const addRow = () => {
    updateBlock(block.id, (b) => {
      const existingRows = (b.attributes.rows as string[][]) ?? [[]];
      const cols = existingRows[0]?.length || 3;
      const hasFooter = Boolean(b.attributes.hasFooter);
      const newRow = Array(cols).fill('');

      let targetIdx = existingRows.length;
      if (hasFooter && existingRows.length > 1) {
        targetIdx = existingRows.length - 1;
      }

      const nextRows = [...existingRows];
      nextRows.splice(targetIdx, 0, newRow);

      return {
        ...b,
        attributes: {
          ...b.attributes,
          rows: nextRows,
        },
      };
    });
    showNotification('Row added');
  };

  const addColumn = () => {
    updateBlock(block.id, (b) => {
      const existingRows = (b.attributes.rows as string[][]) ?? [[]];
      const nextRows = existingRows.map((r) => [...r, '']);
      return {
        ...b,
        attributes: {
          ...b.attributes,
          rows: nextRows,
        },
      };
    });
    showNotification('Column added');
  };

  const deleteRow = () => {
    updateBlock(block.id, (b) => {
      const rows = (b.attributes.rows as string[][]) ?? [];
      if (rows.length <= 1) return b;
      return { ...b, attributes: { ...b.attributes, rows: rows.slice(0, -1) } };
    });
    showNotification('Row deleted');
  };

  const deleteColumn = () => {
    updateBlock(block.id, (b) => {
      const rows = (b.attributes.rows as string[][]) ?? [];
      if ((rows[0]?.length ?? 0) <= 1) return b;
      return { ...b, attributes: { ...b.attributes, rows: rows.map((r) => r.slice(0, -1)) } };
    });
    showNotification('Column deleted');
  };

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
      <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 rounded-lg border border-primary-200/60 dark:border-primary-800/60">
        <TableIcon size={14} /> Table
      </span>

      <span className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-0.5 shrink-0" />

      <Tooltip text="Add Row">
        <button
          onClick={addRow}
          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/40 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer flex items-center gap-1"
        >
          <Rows3 size={14} /> Add Row
        </button>
      </Tooltip>

      <Tooltip text="Add Column">
        <button
          onClick={addColumn}
          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/40 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer flex items-center gap-1"
        >
          <Columns3 size={14} /> Add Column
        </button>
      </Tooltip>

      <Tooltip text="Delete Row">
        <button
          onClick={deleteRow}
          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-colors cursor-pointer flex items-center gap-1"
        >
          <Trash2 size={14} /> Row
        </button>
      </Tooltip>

      <Tooltip text="Delete Column">
        <button
          onClick={deleteColumn}
          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-colors cursor-pointer flex items-center gap-1"
        >
          <Trash2 size={14} /> Col
        </button>
      </Tooltip>

      <span className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-0.5 shrink-0" />

      <Tooltip text="Header Row">
        <button
          onClick={() => {
            updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, hasHeader: !b.attributes.hasHeader } }));
            showNotification('Header row toggled');
          }}
          className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${a.hasHeader ? 'bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 font-semibold' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'}`}
        >
          Header
        </button>
      </Tooltip>

      <Tooltip text="Footer Row">
        <button
          onClick={() => {
            updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, hasFooter: !b.attributes.hasFooter } }));
            showNotification('Footer row toggled');
          }}
          className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${a.hasFooter ? 'bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 font-semibold' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'}`}
        >
          Footer
        </button>
      </Tooltip>

      <span className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-0.5 shrink-0" />
      <AlignmentPicker block={block} showNotification={showNotification} />
    </div>
  );
}

function ListToolbar({ block, saveSelection, showNotification }: CommonToolbarProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const currentStyle = (block.attributes.style as ListStyle) || 'bullet';

  const toggleStyle = (targetStyle: ListStyle) => {
    updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, style: targetStyle } }));
    showNotification(`List style set to ${targetStyle}`);
  };

  const indentList = () => {
    const items = (block.attributes.items as { id: string; content: RichTextValue; level?: number }[]) ?? [];
    if (items.length > 0) {
      updateBlock(block.id, (b) => {
        const curItems = (b.attributes.items as { id: string; content: RichTextValue; level?: number }[]) ?? [];
        return {
          ...b,
          attributes: {
            ...b.attributes,
            items: curItems.map((it) => ({ ...it, level: Math.min((it.level || 0) + 1, 4) })),
          },
        };
      });
      showNotification('Indented');
    }
  };

  const outdentList = () => {
    const items = (block.attributes.items as { id: string; content: RichTextValue; level?: number }[]) ?? [];
    if (items.length > 0) {
      updateBlock(block.id, (b) => {
        const curItems = (b.attributes.items as { id: string; content: RichTextValue; level?: number }[]) ?? [];
        return {
          ...b,
          attributes: {
            ...b.attributes,
            items: curItems.map((it) => ({ ...it, level: Math.max((it.level || 0) - 1, 0) })),
          },
        };
      });
      showNotification('Outdented');
    }
  };

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
      <BlockTypeSelector block={block} />
      <span className="text-slate-300 dark:text-slate-700 font-bold px-1 select-none">⋮</span>

      {/* Bullet Toggle */}
      <Tooltip text="Bullet list">
        <button
          type="button"
          onClick={() => toggleStyle('bullet')}
          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
            currentStyle === 'bullet'
              ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 font-bold border border-blue-200/50 dark:border-blue-800/50'
              : 'text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <List size={15} />
        </button>
      </Tooltip>

      {/* Numbered Toggle */}
      <Tooltip text="Numbered list">
        <button
          type="button"
          onClick={() => toggleStyle('number')}
          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
            currentStyle === 'number'
              ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 font-bold border border-blue-200/50 dark:border-blue-800/50'
              : 'text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ListOrdered size={15} />
        </button>
      </Tooltip>

      {/* Outdent */}
      <Tooltip text="Outdent (Shift+Tab)">
        <button
          type="button"
          onClick={outdentList}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Outdent size={15} />
        </button>
      </Tooltip>

      {/* Indent */}
      <Tooltip text="Indent (Tab)">
        <button
          type="button"
          onClick={indentList}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Indent size={15} />
        </button>
      </Tooltip>

      <BlockMoreMenu block={block} />
    </div>
  );
}

function MediaEmbedToolbar({ block, showNotification }: CommonToolbarProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUrlPopover, setShowUrlPopover] = useState(false);
  const [urlInput, setUrlInput] = useState((block.attributes.url as string) || '');
  const [showSettings, setShowSettings] = useState(false);

  const applyUrl = () => {
    let formatted = urlInput.trim();
    if (formatted && !/^https?:\/\//i.test(formatted) && !/^mailto:/i.test(formatted)) {
      formatted = 'https://' + formatted;
    }
    updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, url: formatted } }));
    setShowUrlPopover(false);
    showNotification('Video URL updated');
  };

  const handleVideoReplace = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, url } }));
    showNotification('Video replaced');
  };

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
      <span className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center border border-slate-200/60 dark:border-slate-700/60 shrink-0">
        <Video size={15} />
      </span>

      <span className="text-slate-300 dark:text-slate-700 font-bold px-1 select-none">⋮</span>

      <AlignmentPicker block={block} showNotification={showNotification} />

      {/* Settings / Aspect Ratio */}
      <div className="relative inline-flex items-center">
        <Tooltip text="Settings / Aspect Ratio">
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Settings size={15} />
          </button>
        </Tooltip>
        {showSettings && (
          <div className="absolute top-full left-0 mt-2 p-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-1 z-[130] w-36">
            {['16:9', '4:3', '1:1', '9:16', '21:9'].map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => {
                  updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, aspectRatio: ratio } }));
                  setShowSettings(false);
                  showNotification(`Aspect ratio: ${ratio}`);
                }}
                className={`px-2.5 py-1 text-xs font-semibold text-left rounded-xl transition-colors cursor-pointer ${(block.attributes.aspectRatio || '16:9') === ratio ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                {ratio}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Link URL */}
      <div className="relative inline-flex items-center">
        <Tooltip text="Video URL">
          <button
            type="button"
            onClick={() => setShowUrlPopover(!showUrlPopover)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <LinkIcon size={15} />
          </button>
        </Tooltip>
        {showUrlPopover && (
          <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2 z-[130] w-64">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Video Source URL</span>
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://youtube.com/..."
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && applyUrl()}
              autoFocus
            />
            <div className="flex justify-end gap-1.5 mt-1">
              <button type="button" onClick={() => setShowUrlPopover(false)} className="px-2.5 py-1 text-xs text-slate-500 cursor-pointer">
                Cancel
              </button>
              <button type="button" onClick={applyUrl} className="px-3 py-1 text-xs font-semibold rounded-xl bg-blue-600 text-white cursor-pointer hover:bg-blue-700">
                Save
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Replace Video */}
      <input ref={fileInputRef} type="file" accept="video/*" onChange={handleVideoReplace} className="hidden" />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="px-3 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
      >
        <span>Replace</span>
      </button>

      <BlockMoreMenu block={block} />
    </div>
  );
}

function QuoteToolbar({ block, showNotification }: CommonToolbarProps) {
  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
      <span className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center border border-slate-200/60 dark:border-slate-700/60 font-serif font-bold text-sm shrink-0">
        ”
      </span>

      <span className="text-slate-300 dark:text-slate-700 font-bold px-1 select-none">⋮</span>

      <AlignmentPicker block={block} showNotification={showNotification} />

      <BlockMoreMenu block={block} />
    </div>
  );
}

function SliderToolbar({ block, showNotification }: CommonToolbarProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const a = block.attributes;
  const slides = (a.slides as any[]) ?? [];

  const addSlide = () => {
    updateBlock(block.id, (b) => {
      const current = (b.attributes.slides as any[]) ?? [];
      const newSlide = {
        id: `slide-${Date.now()}`,
        heading: [{ text: `Slide ${current.length + 1}` }],
        paragraph: [{ text: 'Add your custom description here.' }],
        buttonText: 'Click Here',
        buttonUrl: '#',
        bgColor: '#0f172a',
        align: 'center',
      };
      return { ...b, attributes: { ...b.attributes, slides: [...current, newSlide] } };
    });
    showNotification('New slide added');
  };

  const setAnimation = (anim: string) => {
    updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, animation: anim } }));
    showNotification(`Transition set to ${anim}`);
  };

  const toggleAutoplay = () => {
    const next = !a.autoplay;
    updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, autoplay: next } }));
    showNotification(`Autoplay ${next ? 'enabled' : 'disabled'}`);
  };

  const toggleLayoutWidth = () => {
    const next = a.layoutWidth === 'full' ? 'boxed' : 'full';
    updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, layoutWidth: next } }));
    showNotification(`Layout set to ${next}`);
  };

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
      <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 rounded-lg border border-violet-200/60 dark:border-violet-800/60">
        <Layers size={14} /> Slider ({slides.length} slides)
      </span>

      <span className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-0.5 shrink-0" />

      <Tooltip text="Add Slide">
        <button
          onClick={addSlide}
          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/40 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <Plus size={14} /> Add Slide
        </button>
      </Tooltip>

      <span className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-0.5 shrink-0" />

      <div className="w-28">
        <CustomSelect
          value={(a.animation as string) || 'slide'}
          options={[
            { value: 'slide', label: 'Slide' },
            { value: 'fade', label: 'Fade' },
          ]}
          onChange={(val) => setAnimation(String(val))}
          size="sm"
        />
      </div>

      <Tooltip text="Toggle Autoplay">
        <button
          onClick={toggleAutoplay}
          className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${a.autoplay ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'}`}
        >
          Autoplay: {a.autoplay ? 'On' : 'Off'}
        </button>
      </Tooltip>

      <Tooltip text="Toggle Width Mode">
        <button
          onClick={toggleLayoutWidth}
          className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${a.layoutWidth === 'full' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'}`}
        >
          {a.layoutWidth === 'full' ? 'Full Width' : 'Boxed Width'}
        </button>
      </Tooltip>
    </div>
  );
}

function CodeToolbar({ block, showNotification }: CommonToolbarProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const duplicateBlock = useEditorStore((s) => s.duplicateBlock);
  const removeBlock = useEditorStore((s) => s.removeBlock);
  const a = block.attributes;
  const language = (a.language as string) || 'javascript';
  const showLineNumbers = a.showLineNumbers !== false;
  const wrapLines = Boolean(a.wrapLines);

  const copyCode = () => {
    navigator.clipboard.writeText((a.content as string) || '');
    showNotification('Code copied to clipboard');
  };

  const toggleWrap = () => {
    updateBlock(block.id, (b) => ({
      ...b,
      attributes: { ...b.attributes, wrapLines: !b.attributes.wrapLines },
    }));
    showNotification(!wrapLines ? 'Line wrapping enabled' : 'Line wrapping disabled');
  };

  const toggleLineNumbers = () => {
    updateBlock(block.id, (b) => ({
      ...b,
      attributes: { ...b.attributes, showLineNumbers: b.attributes.showLineNumbers === false },
    }));
    showNotification(!showLineNumbers ? 'Line numbers enabled' : 'Line numbers disabled');
  };

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
      {/* Auto-Detected Language Badge (Read-Only) */}
      <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 border border-primary-200 dark:border-primary-800 select-none pointer-events-none flex items-center gap-1">
        <Code2 size={13} /> {language}
      </span>

      <span className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-0.5 shrink-0" />

      {/* Copy Code */}
      <Tooltip text="Copy Code">
        <button
          onClick={copyCode}
          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/40 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <CopyIcon size={14} /> Copy
        </button>
      </Tooltip>

      {/* Wrap Lines Toggle */}
      <Tooltip text="Wrap Lines">
        <button
          onClick={toggleWrap}
          className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${wrapLines ? 'bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 font-semibold' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'}`}
        >
          Wrap: {wrapLines ? 'On' : 'Off'}
        </button>
      </Tooltip>

      {/* Line Numbers Toggle */}
      <Tooltip text="Line Numbers">
        <button
          onClick={toggleLineNumbers}
          className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${showLineNumbers ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'}`}
        >
          Lines: {showLineNumbers ? 'On' : 'Off'}
        </button>
      </Tooltip>

      <span className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-0.5 shrink-0" />

      {/* Duplicate */}
      <Tooltip text="Duplicate Block">
        <button
          onClick={() => duplicateBlock(block.id)}
          className="px-2 py-1 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
        >
          <CopyPlus size={14} />
        </button>
      </Tooltip>

      {/* Delete */}
      <Tooltip text="Delete Block">
        <button
          onClick={() => removeBlock(block.id)}
          className="px-2 py-1 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-colors cursor-pointer"
        >
          <Trash2 size={14} />
        </button>
      </Tooltip>
    </div>
  );
}

function GalleryToolbar({ block, showNotification }: CommonToolbarProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const duplicateBlock = useEditorStore((s) => s.duplicateBlock);
  const removeBlock = useEditorStore((s) => s.removeBlock);
  const a = block.attributes;
  const images = (a.images as any[]) ?? [];
  const selectedIdx = typeof a.selectedImageIndex === 'number' && a.selectedImageIndex >= 0 && a.selectedImageIndex < images.length ? a.selectedImageIndex : null;
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceFileRef = useRef<HTMLInputElement>(null);

  const addImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const urls = await Promise.all(Array.from(files).map(fileToDataUrl));
    const newItems = urls.map((u) => ({ url: u, alt: '' }));
    updateBlock(block.id, (b) => ({
      ...b,
      attributes: { ...b.attributes, images: [...((b.attributes.images as any[]) ?? []), ...newItems] },
    }));
    showNotification(`${urls.length} images added to gallery`);
  };

  const replaceAllImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const urls = await Promise.all(Array.from(files).map(fileToDataUrl));
    const newItems = urls.map((u) => ({ url: u, alt: '' }));
    updateBlock(block.id, (b) => ({
      ...b,
      attributes: { ...b.attributes, images: newItems, selectedImageIndex: null },
    }));
    showNotification(`Gallery replaced with ${urls.length} new images`);
  };

  const replaceSingleImage = async (files: FileList | null) => {
    if (selectedIdx === null || !files || files.length === 0) return;
    const url = await fileToDataUrl(files[0]);
    updateBlock(block.id, (b) => {
      const list = [...((b.attributes.images as any[]) ?? [])];
      if (list[selectedIdx]) {
        list[selectedIdx] = { ...list[selectedIdx], url };
      }
      return { ...b, attributes: { ...b.attributes, images: list } };
    });
    showNotification('Gallery image replaced');
  };

  const deleteSingleImage = () => {
    if (selectedIdx === null) return;
    updateBlock(block.id, (b) => {
      const list = [...((b.attributes.images as any[]) ?? [])];
      list.splice(selectedIdx, 1);
      return {
        ...b,
        attributes: {
          ...b.attributes,
          images: list,
          selectedImageIndex: null,
        },
      };
    });
    showNotification('Image deleted from gallery');
  };

  const duplicateSingleImage = () => {
    if (selectedIdx === null) return;
    updateBlock(block.id, (b) => {
      const list = [...((b.attributes.images as any[]) ?? [])];
      if (list[selectedIdx]) {
        const copy = { ...list[selectedIdx] };
        list.splice(selectedIdx + 1, 0, copy);
      }
      return {
        ...b,
        attributes: {
          ...b.attributes,
          images: list,
          selectedImageIndex: selectedIdx + 1,
        },
      };
    });
    showNotification('Image duplicated in gallery');
  };

  // IF AN INDIVIDUAL IMAGE IS SELECTED INSIDE THE GALLERY
  if (selectedIdx !== null) {
    return (
      <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
        {/* Return to Gallery Container Controls */}
        <button
          onClick={() => updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, selectedImageIndex: null } }))}
          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-950/70 dark:text-primary-300 hover:bg-primary-200 transition-colors cursor-pointer flex items-center gap-1 border border-primary-200 dark:border-primary-800"
          title="Return to Gallery Settings"
        >
          ← Gallery Settings
        </button>

        <span className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-0.5 shrink-0" />

        <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200/60 dark:border-gray-700/60">
          <ImageIcon size={14} /> Image #{selectedIdx + 1}
        </span>

        <span className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-0.5 shrink-0" />

        {/* Replace Image */}
        <Tooltip text="Replace Image">
          <label className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/40 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer flex items-center gap-1.5">
            <Upload size={14} /> Replace
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => replaceSingleImage(e.target.files)}
            />
          </label>
        </Tooltip>

        {/* Crop */}
        <Tooltip text="Crop Image">
          <button
            onClick={() => {
              updateBlock(block.id, (b) => ({
                ...b,
                attributes: { ...b.attributes, isCropping: true },
              }));
              showNotification('Opening Image Cropper');
            }}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/40 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Crop size={14} /> Crop
          </button>
        </Tooltip>

        {/* Duplicate Image */}
        <Tooltip text="Duplicate Image">
          <button
            onClick={duplicateSingleImage}
            className="px-2 py-1 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
          >
            <CopyPlus size={14} />
          </button>
        </Tooltip>

        {/* Delete Image */}
        <Tooltip text="Delete Image">
          <button
            onClick={deleteSingleImage}
            className="px-2 py-1 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-colors cursor-pointer"
          >
            <Trash2 size={14} />
          </button>
        </Tooltip>
      </div>
    );
  }

  // IF GALLERY CONTAINER IS SELECTED
  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
      <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60">
        <ImageIcon size={14} /> Gallery ({images.length} images)
      </span>

      <span className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-0.5 shrink-0" />

      {/* Add Images */}
      <Tooltip text="Add Images">
        <label className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/40 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer flex items-center gap-1.5">
          <Plus size={14} /> Add Images
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => addImages(e.target.files)}
          />
        </label>
      </Tooltip>

      {/* Replace Images */}
      <Tooltip text="Replace All Images">
        <label className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/40 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer flex items-center gap-1.5">
          <Upload size={14} /> Replace Images
          <input
            ref={replaceFileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => replaceAllImages(e.target.files)}
          />
        </label>
      </Tooltip>

      <span className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-0.5 shrink-0" />

      {/* Gallery Alignment */}
      <AlignmentPicker block={block} showNotification={showNotification} />

      <span className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-0.5 shrink-0" />

      {/* Duplicate Gallery */}
      <Tooltip text="Duplicate Gallery">
        <button
          onClick={() => duplicateBlock(block.id)}
          className="px-2 py-1 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
        >
          <CopyPlus size={14} />
        </button>
      </Tooltip>

      {/* Delete Gallery */}
      <Tooltip text="Delete Gallery">
        <button
          onClick={() => removeBlock(block.id)}
          className="px-2 py-1 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-colors cursor-pointer"
        >
          <Trash2 size={14} />
        </button>
      </Tooltip>
    </div>
  );
}

function DefaultBlockToolbar({ block, showNotification }: CommonToolbarProps) {
  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
      <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200/60 dark:border-gray-700/60">
        {getBlockLabel(block.type)}
      </span>
      <span className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-0.5 shrink-0" />
      <AlignmentPicker block={block} showNotification={showNotification} />
    </div>
  );
}

function CoverToolbar({ block, showNotification }: CommonToolbarProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const duplicateBlock = useEditorStore((s) => s.duplicateBlock);
  const removeBlock = useEditorStore((s) => s.removeBlock);
  const a = block.attributes;
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const url = await fileToDataUrl(files[0]);
    updateBlock(block.id, (b) => ({
      ...b,
      attributes: { ...b.attributes, url },
    }));
    showNotification('Cover background image replaced');
  };

  const handleRemove = () => {
    updateBlock(block.id, (b) => ({
      ...b,
      attributes: { ...b.attributes, url: '' },
    }));
    showNotification('Cover background image removed');
  };

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
      <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 rounded-lg border border-purple-200/60 dark:border-purple-800/60">
        <ImageIcon size={14} /> Cover Block
      </span>

      <span className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-0.5 shrink-0" />

      {/* Replace Background Image */}
      <Tooltip text="Replace Background Image">
        <label className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/40 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer flex items-center gap-1.5">
          <Upload size={14} /> Replace Background
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
        </label>
      </Tooltip>

      {/* Remove Background Image */}
      {Boolean(a.url) && (
        <Tooltip text="Remove Background Image">
          <button
            type="button"
            onClick={handleRemove}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Trash2 size={14} /> Remove Background
          </button>
        </Tooltip>
      )}

      <span className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-0.5 shrink-0" />

      {/* Duplicate Cover */}
      <Tooltip text="Duplicate Block">
        <button
          onClick={() => duplicateBlock(block.id)}
          className="px-2 py-1 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
        >
          <CopyPlus size={14} />
        </button>
      </Tooltip>

      {/* Delete Cover */}
      <Tooltip text="Delete Block">
        <button
          onClick={() => removeBlock(block.id)}
          className="px-2 py-1 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-colors cursor-pointer"
        >
          <Trash2 size={14} />
        </button>
      </Tooltip>
    </div>
  );
}

function MediaTextToolbar({ block, showNotification }: CommonToolbarProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const a = block.attributes;
  const mediaPosition = (a.mediaPosition as 'left' | 'right') || 'left';
  const verticalAlign = (a.verticalAlign as 'top' | 'center' | 'bottom') || 'center';
  const imageFill = Boolean(a.imageFill);

  const toggleMediaPosition = () => {
    const next = mediaPosition === 'left' ? 'right' : 'left';
    updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, mediaPosition: next } }));
    showNotification(`Media moved to ${next}`);
  };

  const setVAlign = (val: 'top' | 'center' | 'bottom') => {
    updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, verticalAlign: val } }));
    showNotification(`Aligned ${val}`);
  };

  const toggleImageFill = () => {
    updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, imageFill: !imageFill } }));
    showNotification(!imageFill ? 'Crop image to fill column' : 'Natural image size');
  };

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
      <span className="px-2 py-1 text-xs font-bold rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 flex items-center gap-1">
        Media & Text
      </span>

      <span className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-0.5 shrink-0" />

      {/* Media Position Toggle */}
      <Tooltip text={mediaPosition === 'left' ? 'Show media on right' : 'Show media on left'}>
        <button
          onClick={toggleMediaPosition}
          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/40 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer flex items-center gap-1.5"
        >
          {mediaPosition === 'left' ? 'Media on Left' : 'Media on Right'}
        </button>
      </Tooltip>

      {/* Vertical Alignment */}
      <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700">
        <Tooltip text="Align Top">
          <button
            onClick={() => setVAlign('top')}
            className={`w-7 h-7 rounded flex items-center justify-center transition-colors cursor-pointer ${verticalAlign === 'top'
              ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-2xs font-bold'
              : 'text-gray-600 dark:text-gray-400'
              }`}
          >
            ↑
          </button>
        </Tooltip>
        <Tooltip text="Align Center">
          <button
            onClick={() => setVAlign('center')}
            className={`w-7 h-7 rounded flex items-center justify-center transition-colors cursor-pointer ${verticalAlign === 'center'
              ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-2xs font-bold'
              : 'text-gray-600 dark:text-gray-400'
              }`}
          >
            ↕
          </button>
        </Tooltip>
        <Tooltip text="Align Bottom">
          <button
            onClick={() => setVAlign('bottom')}
            className={`w-7 h-7 rounded flex items-center justify-center transition-colors cursor-pointer ${verticalAlign === 'bottom'
              ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-2xs font-bold'
              : 'text-gray-600 dark:text-gray-400'
              }`}
          >
            ↓
          </button>
        </Tooltip>
      </div>

      {/* Crop / Fill container toggle */}
      <Tooltip text="Crop media to fill entire column">
        <button
          onClick={toggleImageFill}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${imageFill
            ? 'bg-primary-500 text-white shadow-2xs'
            : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-200'
            }`}
        >
          {imageFill ? 'Filled Column' : 'Fit Natural'}
        </button>
      </Tooltip>
    </div>
  );
}

// ==========================================
// BLOCK TOOLBAR ARCHITECTURE REGISTRY
// ==========================================

const BLOCK_TOOLBAR_REGISTRY: Record<string, React.ComponentType<CommonToolbarProps>> = {
  paragraph: ParagraphToolbar,
  heading: HeadingToolbar,
  list: ListToolbar,
  quote: QuoteToolbar,
  pullquote: QuoteToolbar,
  code: CodeToolbar,
  preformatted: ParagraphToolbar,
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
  spacer: DefaultBlockToolbar,
  separator: DefaultBlockToolbar,
  table: TableToolbar,
  button: ButtonToolbar,
  file: DefaultBlockToolbar,
  html: DefaultBlockToolbar,
};

function MultiSelectToolbar({ selectedIds, showNotification }: { selectedIds: string[]; showNotification: (msg: string) => void }) {
  const duplicateSelectedBlocks = useEditorStore((s) => s.duplicateSelectedBlocks);
  const deleteSelectedBlocks = useEditorStore((s) => s.deleteSelectedBlocks);

  const convertSelectedToList = (listStyle: ListStyle) => {
    const state = useEditorStore.getState();
    const currentBlocks = state.blocks;

    const selectedBlockObjects = selectedIds
      .map((id) => findBlock(currentBlocks, id))
      .filter((b): b is BlockInstance => b !== null);

    if (selectedBlockObjects.length === 0) return;

    const allAlreadySameList = selectedBlockObjects.every(
      (b) => b.type === 'list' && (b.attributes.style || 'bullet') === listStyle
    );

    if (allAlreadySameList) {
      // Toggle OFF: Convert list items to separate paragraph blocks
      const allParagraphs: BlockInstance[] = [];
      selectedBlockObjects.forEach((listBlock) => {
        const items = (listBlock.attributes.items as { id: string; content: RichTextValue }[]) || [];
        if (items.length === 0) {
          allParagraphs.push({
            id: createId(),
            type: 'paragraph',
            attributes: { content: [] },
          });
        } else {
          items.forEach((it) => {
            allParagraphs.push({
              id: createId(),
              type: 'paragraph',
              attributes: { content: it.content || [] },
            });
          });
        }
      });

      const firstIdx = currentBlocks.findIndex((b) => selectedIds.includes(b.id));

      useEditorStore.setState((st) => {
        const newBlocks = st.blocks.filter((b) => !selectedIds.includes(b.id));
        newBlocks.splice(firstIdx !== -1 ? firstIdx : newBlocks.length, 0, ...allParagraphs);
        return {
          blocks: newBlocks,
          selectedIds: allParagraphs.map((p) => p.id),
        };
      });
      showNotification('Converted blocks to paragraphs');
      return;
    }

    // Convert ALL selected blocks into a SINGLE merged list block
    const listItems: { id: string; content: RichTextValue; level: number }[] = [];

    selectedBlockObjects.forEach((b) => {
      if (b.type === 'list') {
        const items = (b.attributes.items as { id: string; content: RichTextValue; level?: number }[]) || [];
        items.forEach((it) => {
          listItems.push({
            id: createId(),
            content: it.content || [],
            level: it.level || 0,
          });
        });
      } else {
        const content = Array.isArray(b.attributes.content)
          ? (b.attributes.content as RichTextValue)
          : b.attributes.content ? [{ text: String(b.attributes.content) }] : [];
        listItems.push({
          id: createId(),
          content,
          level: 0,
        });
      }
    });

    const newListBlock: BlockInstance = {
      id: createId(),
      type: 'list',
      attributes: {
        style: listStyle,
        items: listItems,
      },
    };

    const firstIdx = currentBlocks.findIndex((b) => selectedIds.includes(b.id));

    useEditorStore.setState((st) => {
      const newBlocks = st.blocks.filter((b) => !selectedIds.includes(b.id));
      newBlocks.splice(firstIdx !== -1 ? firstIdx : newBlocks.length, 0, newListBlock);
      return {
        blocks: newBlocks,
        selectedIds: [newListBlock.id],
      };
    });

    showNotification(`Converted ${selectedBlockObjects.length} blocks to ${listStyle} list`);
  };

  const convertSelectedToParagraphs = () => {
    const state = useEditorStore.getState();
    const currentBlocks = state.blocks;
    const selectedBlockObjects = selectedIds
      .map((id) => findBlock(currentBlocks, id))
      .filter((b): b is BlockInstance => b !== null);

    const allParagraphs: BlockInstance[] = [];
    selectedBlockObjects.forEach((b) => {
      if (b.type === 'list') {
        const items = (b.attributes.items as { id: string; content: RichTextValue }[]) || [];
        items.forEach((it) => {
          allParagraphs.push({
            id: createId(),
            type: 'paragraph',
            attributes: { content: it.content || [] },
          });
        });
      } else {
        allParagraphs.push({
          id: createId(),
          type: 'paragraph',
          attributes: { content: b.attributes.content || [] },
        });
      }
    });

    const firstIdx = currentBlocks.findIndex((b) => selectedIds.includes(b.id));

    useEditorStore.setState((st) => {
      const newBlocks = st.blocks.filter((b) => !selectedIds.includes(b.id));
      newBlocks.splice(firstIdx !== -1 ? firstIdx : newBlocks.length, 0, ...allParagraphs);
      return {
        blocks: newBlocks,
        selectedIds: allParagraphs.map((p) => p.id),
      };
    });
    showNotification('Converted blocks to paragraphs');
  };

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
      <span className="text-xs font-semibold px-2.5 py-1 bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 rounded-lg border border-primary-200/60 dark:border-primary-800/60 select-none">
        {selectedIds.length} blocks selected
      </span>

      <span className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-0.5 shrink-0" />

      <Tooltip text="Convert all selected to Bullet List">
        <button
          onClick={() => convertSelectedToList('bullet')}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-colors cursor-pointer shrink-0"
        >
          <List size={16} />
        </button>
      </Tooltip>

      <Tooltip text="Convert all selected to Numbered List">
        <button
          onClick={() => convertSelectedToList('number')}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-colors cursor-pointer shrink-0"
        >
          <ListOrdered size={16} />
        </button>
      </Tooltip>

      <Tooltip text="Convert all selected to Paragraphs">
        <button
          onClick={convertSelectedToParagraphs}
          className="px-2.5 py-1 text-xs font-semibold rounded-lg text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-colors cursor-pointer shrink-0"
        >
          ¶ Paragraphs
        </button>
      </Tooltip>

      <span className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-0.5 shrink-0" />

      <Tooltip text="Duplicate selected blocks">
        <button
          onClick={duplicateSelectedBlocks}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer shrink-0"
        >
          <CopyPlus size={15} />
        </button>
      </Tooltip>

      <Tooltip text="Delete selected blocks">
        <button
          onClick={deleteSelectedBlocks}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer shrink-0"
        >
          <Trash2 size={15} />
        </button>
      </Tooltip>
    </div>
  );
}

// ==========================================
// MOBILE TWO-ROW TOOLBAR COMPONENT
// ==========================================
function MobileTwoRowToolbar({
  block,
  execCmd,
  saveSelection,
  showNotification,
  openLinkPopover,
}: {
  block: BlockInstance | null;
  execCmd: (cmd: string, value?: string) => void;
  saveSelection: () => void;
  showNotification: (msg: string) => void;
  openLinkPopover: () => void;
}) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const removeBlock = useEditorStore((s) => s.removeBlock);
  const duplicateBlock = useEditorStore((s) => s.duplicateBlock);
  const moveBlock = useEditorStore((s) => s.moveBlock);
  const setSettingsSidebarOpen = useEditorStore((s) => s.setSettingsSidebarOpen);

  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [showWidthDropdown, setShowWidthDropdown] = useState(false);
  const [showRatioDropdown, setShowRatioDropdown] = useState(false);
  const [altDialogOpen, setAltDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [altText, setAltText] = useState((block?.attributes?.alt as string) || '');
  const [linkUrl, setLinkUrl] = useState((block?.attributes?.link as string) || '');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!block) {
    return (
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold text-slate-500">
        <span>Click any block to edit format</span>
      </div>
    );
  }

  const blockType = block.type;
  const BlockIcon = getBlockIcon(blockType);
  const blockLabel = getBlockLabel(blockType);
  const align = (block.attributes?.align as string) || 'left';
  const width = (block.attributes?.width as string) || '100%';

  const handleImageReplace = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    fileToDataUrl(file).then((url) => {
      updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, url } }));
      showNotification('Image updated');
    });
  };

  const handleAlign = (newAlign: TextAlign) => {
    updateBlock(block.id, (b) => ({
      ...b,
      attributes: { ...b.attributes, align: newAlign },
    }));
    showNotification(`Aligned ${newAlign}`);
  };

  const handleWidth = (newWidth: string) => {
    updateBlock(block.id, (b) => ({
      ...b,
      attributes: { ...b.attributes, width: newWidth },
    }));
    showNotification(`Width set to ${newWidth}`);
  };

  return (
    <div className="flex flex-col gap-2 w-full select-none">
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageReplace} className="hidden" />

      {/* 1. PRIMARY ROW (Essential Controls - Balanced 36px Height, 100% Mobile Fit) */}
      <div className="flex items-center justify-between gap-1 w-full bg-slate-100/90 dark:bg-slate-800/90 p-1 border border-slate-200/70 dark:border-slate-700/70 shadow-xs backdrop-blur-md h-[44px] min-h-[44px] max-h-[44px] box-border">
        {/* 1. Block Badge (Paragraph / Heading / Image) */}
        <div className="h-9 min-h-[36px] max-h-[36px] box-border px-2.5 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs shadow-xs border border-black/5 dark:border-white/5 inline-flex items-center gap-1.5 shrink-0 select-none">
          <BlockIcon size={14} className="text-blue-500 shrink-0" />
          <span className="truncate max-w-[70px]">{blockLabel}</span>
        </div>

        {/* 2. Alignment Segmented Control */}
        <div className="h-9 min-h-[36px] max-h-[36px] box-border inline-flex items-center bg-slate-200/90 dark:bg-slate-700/90 p-0.5 rounded-xl gap-0.5 shrink-0 select-none overflow-hidden">
          {(['left', 'center', 'right', 'justify'] as TextAlign[]).map((al) => {
            const Icon = al === 'left' ? AlignLeft : al === 'center' ? AlignCenter : al === 'right' ? AlignRight : AlignJustify;
            const isActive = align === al;
            return (
              <button
                key={al}
                type="button"
                onClick={() => handleAlign(al)}
                className={`w-6.5 min-w-[26px] max-w-[26px] h-8 min-h-[32px] max-h-[32px] rounded-lg box-border p-0 m-0 border-0 outline-none inline-flex items-center justify-center transition-all cursor-pointer ${isActive
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                title={`Align ${al}`}
              >
                <Icon size={13} />
              </button>
            );
          })}
        </div>

        {/* 3. Quick Contextual Property Selector */}
        {blockType === 'image' ? (
          <div className="w-18 shrink-0 h-9 min-h-[36px] max-h-[36px] box-border">
            <CustomSelect
              value={width}
              options={[
                { value: 'auto', label: 'Auto' },
                { value: '25%', label: '25%' },
                { value: '50%', label: '50%' },
                { value: '75%', label: '75%' },
                { value: '100%', label: '100%' },
              ]}
              onChange={handleWidth}
              size="xs"
              buttonClassName="!h-9 !min-h-[36px] !max-h-[36px] !py-0 !px-2 !rounded-xl !border-black/5 dark:!border-white/5 !shadow-xs !bg-white dark:!bg-slate-700 font-bold text-xs !box-border"
            />
          </div>
        ) : blockType === 'heading' ? (
          <div className="w-18 shrink-0 h-9 min-h-[36px] max-h-[36px] box-border">
            <CustomSelect
              value={String(block.attributes?.level || 2)}
              options={[
                { value: '1', label: 'H1' },
                { value: '2', label: 'H2' },
                { value: '3', label: 'H3' },
                { value: '4', label: 'H4' },
                { value: '5', label: 'H5' },
                { value: '6', label: 'H6' },
              ]}
              onChange={(val) => {
                updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, level: Number(val) } }));
                showNotification(`Heading Level ${val}`);
              }}
              size="xs"
              buttonClassName="!h-9 !min-h-[36px] !max-h-[36px] !py-0 !px-2 !rounded-xl !border-black/5 dark:!border-white/5 !shadow-xs !bg-white dark:!bg-slate-700 font-bold text-xs !box-border"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSettingsSidebarOpen(true)}
            className="h-9 min-h-[36px] max-h-[36px] box-border px-2.5 p-0 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs border border-black/5 dark:border-white/5 inline-flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-650 transition-colors cursor-pointer shrink-0"
          >
            <Sliders size={12} className="text-blue-500" />
            <span>Styles</span>
          </button>
        )}

        {/* 4. More Menu (Additional Options) Button */}
        <button
          type="button"
          onClick={() => setMoreMenuOpen(true)}
          className="w-9 h-9 min-w-[36px] max-w-[36px] min-h-[36px] max-h-[36px] box-border p-0 rounded-xl bg-white dark:bg-slate-700 inline-flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-xs border border-black/5 dark:border-white/5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer shrink-0"
          title="More options"
        >
          <MoreVertical size={15} />
        </button>
      </div>

      {/* 2. SECONDARY ROW (Quick Actions Cards) */}
      <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-0.5 w-full shrink-0">
        {blockType === 'image' && (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-1 min-w-[62px] h-[52px] rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <Upload size={16} className="text-blue-500" />
              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 tracking-tight">Replace</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const nextRatio = block.attributes?.aspectRatio === '16/9' ? '4/3' : block.attributes?.aspectRatio === '4/3' ? '1/1' : '16/9';
                updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, aspectRatio: nextRatio } }));
                showNotification(`Aspect ratio: ${nextRatio}`);
              }}
              className="flex flex-col items-center justify-center gap-1 min-w-[62px] h-[52px] rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <Crop size={16} className="text-indigo-500" />
              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 tracking-tight">Crop</span>
            </button>

            <button
              type="button"
              onClick={() => setLinkDialogOpen(true)}
              className="flex flex-col items-center justify-center gap-1 min-w-[62px] h-[52px] rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <LinkIcon size={16} className="text-emerald-500" />
              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 tracking-tight">Link</span>
            </button>

            <button
              type="button"
              onClick={() => setAltDialogOpen(true)}
              className="flex flex-col items-center justify-center gap-1 min-w-[62px] h-[52px] rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <TagIcon size={16} className="text-amber-500" />
              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 tracking-tight">Alt Text</span>
            </button>
          </>
        )}

        {(blockType === 'paragraph' || blockType === 'heading' || blockType === 'quote' || blockType === 'pullquote') && (
          <>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
              onClick={() => execCmd('bold')}
              className="flex flex-col items-center justify-center gap-1 min-w-[58px] h-[52px] rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 hover:border-blue-300 transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <Bold size={15} className="text-blue-500" />
              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 tracking-tight">Bold</span>
            </button>

            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
              onClick={() => execCmd('italic')}
              className="flex flex-col items-center justify-center gap-1 min-w-[58px] h-[52px] rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 hover:border-blue-300 transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <Italic size={15} className="text-indigo-500" />
              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 tracking-tight">Italic</span>
            </button>

            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
              onClick={() => execCmd('underline')}
              className="flex flex-col items-center justify-center gap-1 min-w-[58px] h-[52px] rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 hover:border-blue-300 transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <Underline size={15} className="text-purple-500" />
              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 tracking-tight">Underline</span>
            </button>

            <button
              type="button"
              onClick={openLinkPopover}
              className="flex flex-col items-center justify-center gap-1 min-w-[58px] h-[52px] rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 hover:border-blue-300 transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <LinkIcon size={15} className="text-emerald-500" />
              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 tracking-tight">Link</span>
            </button>

            <button
              type="button"
              onClick={() => setSettingsSidebarOpen(true)}
              className="flex flex-col items-center justify-center gap-1 min-w-[58px] h-[52px] rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 hover:border-blue-300 transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <Highlighter size={15} className="text-amber-500" />
              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 tracking-tight">Color</span>
            </button>
          </>
        )}

        {/* Universal Actions */}
        <button
          type="button"
          onClick={() => {
            duplicateBlock(block.id);
            showNotification('Block duplicated');
          }}
          className="flex flex-col items-center justify-center gap-1 min-w-[58px] h-[52px] rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-blue-50/50 transition-all cursor-pointer shrink-0 active:scale-95"
        >
          <CopyPlus size={15} className="text-sky-500" />
          <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 tracking-tight">Duplicate</span>
        </button>

        <button
          type="button"
          onClick={() => {
            moveBlock(block.id, 'up');
            showNotification('Moved up');
          }}
          className="flex flex-col items-center justify-center gap-1 min-w-[54px] h-[52px] rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-blue-50/50 transition-all cursor-pointer shrink-0 active:scale-95"
        >
          <ArrowUp size={15} className="text-slate-500" />
          <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 tracking-tight">Up</span>
        </button>

        <button
          type="button"
          onClick={() => {
            moveBlock(block.id, 'down');
            showNotification('Moved down');
          }}
          className="flex flex-col items-center justify-center gap-1 min-w-[54px] h-[52px] rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-blue-50/50 transition-all cursor-pointer shrink-0 active:scale-95"
        >
          <ArrowDown size={15} className="text-slate-500" />
          <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 tracking-tight">Down</span>
        </button>

        <button
          type="button"
          onClick={() => {
            removeBlock(block.id);
            showNotification('Block deleted');
          }}
          className="flex flex-col items-center justify-center gap-1 min-w-[54px] h-[52px] rounded-xl bg-red-50/80 dark:bg-red-950/40 border border-red-200/70 dark:border-red-800/70 shadow-xs text-red-600 dark:text-red-400 hover:bg-red-100 transition-all cursor-pointer shrink-0 active:scale-95"
        >
          <Trash2 size={15} className="text-red-500" />
          <span className="text-[10px] font-bold tracking-tight">Delete</span>
        </button>
      </div>

      {/* 3. MORE MENU (Additional Options) Popup Card Dropdown */}
      {moreMenuOpen && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => {
            setMoreMenuOpen(false);
            setShowWidthDropdown(false);
            setShowRatioDropdown(false);
          }}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-[28px] shadow-2xl w-full max-w-[320px] p-4 animate-in zoom-in-95 duration-200 select-none relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle Top Bar */}
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3" />

            {/* Header: Clean title and X close button */}
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {blockType === 'image' ? 'Image Settings' : `${blockLabel} Settings`}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setMoreMenuOpen(false);
                  setShowWidthDropdown(false);
                  setShowRatioDropdown(false);
                }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Inner Bordered Card with Dividers (Exact match to reference photo!) */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
              {blockType === 'image' ? (
                <>
                  {/* Row 1: Width */}
                  <div>
                    <div
                      onClick={() => {
                        setShowWidthDropdown(!showWidthDropdown);
                        setShowRatioDropdown(false);
                      }}
                      className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200"
                    >
                      <div className="flex items-center gap-3">
                        <Maximize2 size={16} className="text-slate-600 dark:text-slate-400" />
                        <span>Width</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-blue-600 font-medium text-xs">
                        <span>{width}</span>
                        <ChevronRight size={14} className="text-slate-400" />
                      </div>
                    </div>
                    {showWidthDropdown && (
                      <div className="bg-slate-50 dark:bg-slate-800/80 px-3 py-2 flex items-center justify-between gap-1 border-t border-slate-100 dark:border-slate-800 animate-in fade-in">
                        {['auto', '25%', '50%', '75%', '100%'].map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => {
                              handleWidth(w);
                              setShowWidthDropdown(false);
                            }}
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${width === w
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-blue-50'
                              }`}
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Row 2: Aspect Ratio */}
                  <div>
                    <div
                      onClick={() => {
                        setShowRatioDropdown(!showRatioDropdown);
                        setShowWidthDropdown(false);
                      }}
                      className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200"
                    >
                      <div className="flex items-center gap-3">
                        <Crop size={16} className="text-slate-600 dark:text-slate-400" />
                        <span>Aspect Ratio</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-blue-600 font-medium text-xs">
                        <span>{(block.attributes?.aspectRatio as string) || 'Auto'}</span>
                        <ChevronRight size={14} className="text-slate-400" />
                      </div>
                    </div>
                    {showRatioDropdown && (
                      <div className="bg-slate-50 dark:bg-slate-800/80 px-3 py-2 flex items-center justify-between gap-1 border-t border-slate-100 dark:border-slate-800 animate-in fade-in">
                        {['Auto', '16/9', '4/3', '1/1'].map((r) => {
                          const val = r === 'Auto' ? 'auto' : r;
                          const currentVal = (block.attributes?.aspectRatio as string) || 'auto';
                          const isAct = currentVal === val;
                          return (
                            <button
                              key={r}
                              type="button"
                              onClick={() => {
                                updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, aspectRatio: val } }));
                                setShowRatioDropdown(false);
                                showNotification(`Aspect Ratio: ${r}`);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${isAct
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-blue-50'
                                }`}
                            >
                              {r}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Row 3: Caption */}
                  <div
                    onClick={() => {
                      setMoreMenuOpen(false);
                      const activeEditable = document.querySelector(`[data-block-id="${block.id}"] figcaption, [data-block-id="${block.id}"] [contenteditable]`) as HTMLElement | null;
                      activeEditable?.focus();
                      showNotification('Edit caption in image');
                    }}
                    className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <Subtitles size={16} className="text-slate-600 dark:text-slate-400" />
                      <span>Caption</span>
                    </div>
                    <ChevronRight size={14} className="text-slate-400" />
                  </div>

                  {/* Row 4: Alt Text */}
                  <div
                    onClick={() => {
                      setMoreMenuOpen(false);
                      setAltDialogOpen(true);
                    }}
                    className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <TagIcon size={16} className="text-slate-600 dark:text-slate-400" />
                      <span>Alt Text</span>
                    </div>
                    <ChevronRight size={14} className="text-slate-400" />
                  </div>
                </>
              ) : (
                <>
                  {/* Non-image blocks */}
                  <div
                    onClick={() => {
                      setMoreMenuOpen(false);
                      setSettingsSidebarOpen(true);
                    }}
                    className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <Sliders size={16} className="text-slate-600 dark:text-slate-400" />
                      <span>Block Properties</span>
                    </div>
                    <ChevronRight size={14} className="text-slate-400" />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Alt Text Dialog */}
      {altDialogOpen && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => setAltDialogOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">Image Alt Text</h4>
            <input
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Describe image for accessibility..."
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAltDialogOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-500 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, alt: altText.trim() } }));
                  setAltDialogOpen(false);
                  showNotification('Alt text saved');
                }}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Link Dialog */}
      {linkDialogOpen && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => setLinkDialogOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">Image Link URL</h4>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLinkDialogOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-500 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  let formatted = linkUrl.trim();
                  if (formatted && !/^https?:\/\//i.test(formatted) && !/^mailto:/i.test(formatted) && !/^#/i.test(formatted)) {
                    formatted = 'https://' + formatted;
                  }
                  updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, link: formatted } }));
                  setLinkDialogOpen(false);
                  showNotification('Image link updated');
                }}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// MAIN FORMATTING TOOLBAR COMPONENT
// ==========================================
export default function BlockFormattingToolbar() {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const blocks = useEditorStore((s) => s.blocks);
  const block = selectedIds.length === 1 ? findBlock(blocks, selectedIds[0]) : null;
  const blockType = block?.type || 'paragraph';
  const isPreviewMode = useEditorStore((s) => s.isPreviewMode);
  const past = useEditorStore((s) => s.past);
  const future = useEditorStore((s) => s.future);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const duplicateBlock = useEditorStore((s) => s.duplicateBlock);
  const removeBlock = useEditorStore((s) => s.removeBlock);
  const moveBlock = useEditorStore((s) => s.moveBlock);
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const htmlModeBlockIds = useEditorStore((s) => s.htmlModeBlockIds);
  const toggleHtmlMode = useEditorStore((s) => s.toggleHtmlMode);

  const [toast, setToast] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState(true);
  const [showLink, setShowLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const savedRangeRef = useRef<Range | null>(null);

  // Auto-expand format tools when a block is clicked/selected
  useEffect(() => {
    if (selectedIds.length > 0) {
      setMobileExpanded(true);
    }
  }, [selectedIds]);

  const showNotification = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

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

  const execCmd = (cmd: string, value: string = '') => {
    restoreSelection();
    document.execCommand(cmd, false, value);
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

  const openLinkPopover = () => {
    saveSelection();
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) {
      setLinkText(sel.toString());
      const parent = sel.getRangeAt(0).commonAncestorContainer;
      const elem = parent.nodeType === 1 ? (parent as HTMLElement) : parent.parentElement;
      const anchor = elem?.closest('a');
      if (anchor) {
        setLinkUrl(anchor.getAttribute('href') || '');
      } else {
        setLinkUrl('');
      }
    } else {
      setLinkText('');
      setLinkUrl('');
    }
    setShowLink(true);
  };

  const removeLink = () => {
    restoreSelection();
    document.execCommand('unlink', false);
    if (block) {
      const activeEditable = (savedRangeRef.current?.commonAncestorContainer?.nodeType === 1
        ? (savedRangeRef.current.commonAncestorContainer as HTMLElement)
        : savedRangeRef.current?.commonAncestorContainer?.parentElement)?.closest('[contenteditable]') as HTMLElement | null
        || document.querySelector(`[data-block-id="${block.id}"] [contenteditable]`) as HTMLElement | null;
      if (activeEditable) {
        activeEditable.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    setShowLink(false);
    showNotification('Link removed');
  };

  const applyLink = () => {
    if (!linkUrl.trim()) {
      removeLink();
      return;
    }

    let formattedUrl = linkUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl) && !/^mailto:/i.test(formattedUrl) && !/^#/i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    restoreSelection();

    const sel = window.getSelection();
    const hasSelection = sel && !sel.isCollapsed && sel.toString().trim().length > 0;

    if (hasSelection) {
      document.execCommand('createLink', false, formattedUrl);
      if (sel && sel.rangeCount > 0) {
        const parent = sel.getRangeAt(0).commonAncestorContainer;
        const elem = parent.nodeType === 1 ? (parent as HTMLElement) : parent.parentElement;
        const anchor = elem?.closest('a') || elem?.querySelector('a');
        if (anchor) {
          anchor.setAttribute('target', '_blank');
          anchor.setAttribute('rel', 'noopener noreferrer');
        }
      }
    } else {
      const textToDisplay = linkText.trim() || formattedUrl;
      const anchorHtml = `<a href="${formattedUrl}" target="_blank" rel="noopener noreferrer">${textToDisplay}</a>&nbsp;`;
      document.execCommand('insertHTML', false, anchorHtml);
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

    setLinkUrl('');
    setLinkText('');
    setShowLink(false);
    showNotification('Link saved');
  };

  // Lookup the exact block toolbar component from the registry
  const ActiveBlockToolbarComponent = (block ? BLOCK_TOOLBAR_REGISTRY[blockType] : ParagraphToolbar) || DefaultBlockToolbar;

  const supportsInlineLink = blockType === 'paragraph' || blockType === 'heading' || blockType === 'list' || blockType === 'quote';

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="sticky top-0 z-40 shadow-xs backdrop-blur-md bg-white/95 dark:bg-slate-900/95 border-b border-slate-200/90 dark:border-slate-800 px-3 sm:px-4 py-1.5 sm:py-2 flex flex-col shrink-0 transition-all select-none w-full overflow-visible"
    >
      {/* Toast Notification */}
      {toast && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg shadow-xl z-[110] animate-bounce">
          {toast}
        </div>
      )}

      {/* 📱 MOBILE VIEW (< 576px / xs:hidden): Two-Row Native Mobile Design */}
      <div className="xs:hidden w-full py-0.5">
        <MobileTwoRowToolbar
          block={block}
          execCmd={execCmd}
          saveSelection={saveSelection}
          showNotification={showNotification}
          openLinkPopover={openLinkPopover}
        />
      </div>

      {/* 💻 TABLET & DESKTOP VIEW (>= 576px / hidden xs:flex) */}
      <div className="hidden xs:flex items-center justify-between gap-3 w-full animate-in fade-in zoom-in-95 duration-150">
        {/* Left / Center: The Exact Block Floating Toolbar */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-50/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl shadow-xs backdrop-blur-md">
          {selectedIds.length > 1 ? (
            <MultiSelectToolbar selectedIds={selectedIds} showNotification={showNotification} />
          ) : block ? (
            <ActiveBlockToolbarComponent
              block={block}
              execCmd={execCmd}
              saveSelection={saveSelection}
              showNotification={showNotification}
            />
          ) : (
            <div className="text-xs text-slate-400 px-3 py-1">Select a block to format</div>
          )}
        </div>

        {/* Right: Quick History Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Tooltip text="Undo (Ctrl+Z)">
            <button
              type="button"
              onClick={undo}
              disabled={past.length === 0}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
            >
              <Undo2 size={15} />
            </button>
          </Tooltip>

          <Tooltip text="Redo (Ctrl+Y)">
            <button
              type="button"
              onClick={redo}
              disabled={future.length === 0}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
            >
              <Redo2 size={15} />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
