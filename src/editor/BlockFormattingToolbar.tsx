import { useState, useRef } from 'react';
import {
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  CheckSquare, Image as ImageIcon, Smile, Columns3, Rows3, Table as TableIcon, Link as LinkIcon,
  Undo2, Redo2, Pin, Code2, Eraser, Indent, Outdent, Crop, ExternalLink,
  Trash2, Video, Highlighter, Upload, Subtitles, Tag as TagIcon,
  Columns as ColumnsIcon, Layers, Plus, Copy as CopyIcon, CopyPlus,
  ArrowUp, ArrowDown,
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
      <div className={`absolute top-full mt-1.5 ${alignClasses} hidden group-hover:flex flex-col items-center pointer-events-none z-[9999]`}>
        <div className={`w-2 h-2 bg-gray-900 dark:bg-gray-800 rotate-45 -mb-1 shadow-xs border-t border-l border-gray-700/50 ${arrowAlignClasses}`} />
        <span className="px-2.5 py-1 text-[11px] font-medium text-white bg-gray-900 dark:bg-gray-800 rounded-lg shadow-xl border border-gray-700/50 whitespace-nowrap block">
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
    `w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-xs transition-all cursor-pointer shrink-0 ${
      active
        ? 'bg-primary-500 text-white shadow-2xs font-bold'
        : 'text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40'
    }`;

  return (
    <div className="flex items-center gap-0.5">
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
// BLOCK SPECIFIC TOOLBAR IMPLEMENTATIONS
// ==========================================

function ParagraphToolbar({ block, execCmd, saveSelection }: CommonToolbarProps) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState<'smileys' | 'gestures' | 'symbols' | 'work'>('smileys');

  const emojiCategories = {
    smileys: { label: '😃 Smileys', items: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😋', '😛', '😜', '🤪', '😎', '🥳', '😭', '🤯', '🤠'] },
    gestures: { label: '👍 Gestures', items: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '👋', '✍️', '🙏', '🤝', '👏', '🙌', '💪'] },
    symbols: { label: '❤️ Symbols', items: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '✨', '⭐', '🌟', '💥', '🔥', '⚡', '🌈', '✅', '☑️', '❌', '⭕'] },
    work: { label: '📝 Work', items: ['📝', '📄', '📑', '📋', '📁', '📊', '📈', '📌', '📎', '✂️', '✏️', '🔍', '🔒', '💻', '📱', '⏰', '💡', '🎯', '🏆', '🚀', '🎉'] },
  };

  const insertEmoji = (emoji: string) => {
    document.execCommand('insertText', false, emoji);
    setShowEmoji(false);
  };

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
      <BlockTypeSelector block={block} />
      <InlineFormattingControls block={block} execCmd={execCmd} saveSelection={saveSelection} />
      <ListControls block={block} />

      <Tooltip text="Edit HTML">
        <button
          onClick={() => {
            const { toggleHtmlMode, selectedIds } = useEditorStore.getState();
            toggleHtmlMode(block?.id || selectedIds[0]);
          }}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-colors cursor-pointer shrink-0"
          title="Edit HTML"
        >
          <Code2 size={15} />
        </button>
      </Tooltip>

      <Tooltip text="Highlight (Ctrl+Shift+H)">
        <button
          onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
          onClick={() => execCmd('hiliteColor', '#fef08a')}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-950/40 transition-colors cursor-pointer shrink-0"
        >
          <Highlighter size={15} />
        </button>
      </Tooltip>

      <div className="relative inline-flex items-center shrink-0">
        <Tooltip text="Insert Emoji">
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-colors cursor-pointer shrink-0"
          >
            <Smile size={15} />
          </button>
        </Tooltip>
        {showEmoji && (
          <div className="absolute top-full left-0 mt-2 p-2 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 z-[100] w-72 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-1.5 px-0.5">
              {(Object.keys(emojiCategories) as (keyof typeof emojiCategories)[]).map((catKey) => (
                <button
                  key={catKey}
                  onClick={() => setEmojiCategory(catKey)}
                  className={`text-xs font-semibold px-2 py-1 rounded-lg transition-colors cursor-pointer ${emojiCategory === catKey ? 'bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
                >
                  {emojiCategories[catKey].label.split(' ')[0]}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-6 gap-1 max-h-52 overflow-y-auto be-scroll p-1">
              {emojiCategories[emojiCategory].items.map((emoji, idx) => (
                <button
                  key={`${emoji}-${idx}`}
                  onClick={() => insertEmoji(emoji)}
                  className="p-1 text-lg hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-center cursor-pointer transition-transform hover:scale-125 flex items-center justify-center"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Tooltip text="Clear Formatting (Ctrl+\\)">
        <button
          onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
          onClick={() => execCmd('removeFormat')}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer shrink-0"
        >
          <Eraser size={15} />
        </button>
      </Tooltip>
    </div>
  );
}

function HeadingToolbar({ block, execCmd, saveSelection, showNotification }: CommonToolbarProps) {
  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
      <BlockTypeSelector block={block} />
      <InlineFormattingControls block={block} execCmd={execCmd} saveSelection={saveSelection} />
      <span className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-1 shrink-0" />
      <AlignmentPicker block={block} showNotification={showNotification} />
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
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 rounded-lg border border-blue-200/60 dark:border-blue-800/60">
        <ImageIcon size={14} /> Image
      </span>

      <span className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-0.5 shrink-0" />

      {/* Image Alignment Picker */}
      <AlignmentPicker block={block} showNotification={showNotification} />

      {/* Width Dropdown (Requirement 4) */}
      <Tooltip text="Image Width">
        <div className="w-28">
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
              showNotification(`Width set to ${val}`);
            }}
            size="sm"
          />
        </div>
      </Tooltip>

      <span className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-0.5 shrink-0" />

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageReplace} className="hidden" />
      <Tooltip text="Replace Image">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/40 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <Upload size={14} /> Replace
        </button>
      </Tooltip>

      <Tooltip text="Crop Image">
        <button
          onClick={() => {
            updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, isCropping: true } }));
            showNotification('Crop tool opened');
          }}
          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/40 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <Crop size={14} /> Crop
        </button>
      </Tooltip>

      <div className="relative inline-flex items-center">
        <Tooltip text="Aspect Ratio">
          <button
            onClick={() => setShowCropMenu(!showCropMenu)}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/40 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            Aspect Ratio
          </button>
        </Tooltip>
        {showCropMenu && (
          <div className="absolute top-full left-0 mt-2 p-1.5 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col gap-1 z-[100] w-36">
            {['auto', '16:9', '4:3', '1:1', '9:16', '3:2', '2:1'].map((ratio) => (
              <button
                key={ratio}
                onClick={() => applyCropRatio(ratio)}
                className={`px-2.5 py-1 text-xs font-medium text-left rounded-lg transition-colors cursor-pointer capitalize ${(block.attributes.aspectRatio || 'auto') === ratio ? 'bg-primary-50 text-primary-600 dark:bg-primary-950/50 dark:text-primary-300 font-semibold' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              >
                {ratio === 'auto' ? 'Original / Auto' : ratio}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative inline-flex items-center">
        <Tooltip text="Image Link">
          <button
            onClick={() => setShowLinkPopover(!showLinkPopover)}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${block.attributes.link ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold' : 'bg-gray-100 dark:bg-gray-800 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/40 text-gray-700 dark:text-gray-200'}`}
          >
            <LinkIcon size={14} /> Link
          </button>
        </Tooltip>
        {showLinkPopover && (
          <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col gap-2 z-[100] w-64">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Image Destination Link</span>
            <input
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              placeholder="https://example.com"
              className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-primary-500"
              onKeyDown={(e) => e.key === 'Enter' && applyLink()}
              autoFocus
            />
            <div className="flex justify-end gap-1.5 mt-1">
              <button onClick={() => setShowLinkPopover(false)} className="px-2.5 py-1 text-xs text-gray-500 cursor-pointer">
                Cancel
              </button>
              <button onClick={applyLink} className="px-3 py-1 text-xs font-semibold rounded-lg bg-primary-600 text-white cursor-pointer">
                Save Link
              </button>
            </div>
          </div>
        )}
      </div>

      <Tooltip text="Toggle Caption">
        <button
          onClick={() => {
            updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, showCaption: b.attributes.showCaption === false ? true : false } }));
            showNotification('Caption toggled');
          }}
          className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${block.attributes.showCaption !== false ? 'bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'}`}
        >
          <Subtitles size={14} /> Caption
        </button>
      </Tooltip>

      <div className="relative inline-flex items-center">
        <Tooltip text="Edit Alt Text">
          <button
            onClick={() => setShowAltPopover(!showAltPopover)}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/40 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <TagIcon size={14} /> Alt Text
          </button>
        </Tooltip>
        {showAltPopover && (
          <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col gap-2 z-[100] w-64">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Alt Text (Accessibility)</span>
            <input
              value={altInput}
              onChange={(e) => setAltInput(e.target.value)}
              placeholder="Describe this image..."
              className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-primary-500"
              onKeyDown={(e) => e.key === 'Enter' && applyAltText()}
              autoFocus
            />
            <div className="flex justify-end gap-1.5 mt-1">
              <button onClick={() => setShowAltPopover(false)} className="px-2.5 py-1 text-xs text-gray-500 cursor-pointer">
                Cancel
              </button>
              <button onClick={applyAltText} className="px-3 py-1 text-xs font-semibold rounded-lg bg-primary-600 text-white cursor-pointer">
                Save Alt
              </button>
            </div>
          </div>
        )}
      </div>
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
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60">
        <LinkIcon size={14} /> Button
      </span>

      <span className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-0.5 shrink-0" />

      <div className="relative inline-flex items-center">
        <Tooltip text="Edit Button Link URL">
          <button
            onClick={() => setShowUrlPopover(!showUrlPopover)}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/40 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <ExternalLink size={14} /> URL
          </button>
        </Tooltip>
        {showUrlPopover && (
          <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col gap-2 z-[100] w-64">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Button Destination</span>
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com"
              className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-primary-500"
              onKeyDown={(e) => e.key === 'Enter' && applyUrl()}
              autoFocus
            />
            <div className="flex justify-end gap-1.5 mt-1">
              <button onClick={() => setShowUrlPopover(false)} className="px-2.5 py-1 text-xs text-gray-500 cursor-pointer">
                Cancel
              </button>
              <button onClick={applyUrl} className="px-3 py-1 text-xs font-semibold rounded-lg bg-primary-600 text-white cursor-pointer">
                Save URL
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="w-28">
        <CustomSelect
          value={(block.attributes.style as string) || 'fill'}
          options={[
            { value: 'fill', label: 'Filled' },
            { value: 'outline', label: 'Outline' },
            { value: 'link', label: 'Link' },
          ]}
          onChange={(val) => {
            updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, style: val } }));
            showNotification(`Style set to ${val}`);
          }}
          size="sm"
        />
      </div>

      <div className="w-32">
        <CustomSelect
          value={(block.attributes.width as string) || 'auto'}
          options={[
            { value: 'auto', label: 'Width: Auto' },
            { value: '25%', label: 'Width: 25%' },
            { value: '50%', label: 'Width: 50%' },
            { value: '75%', label: 'Width: 75%' },
            { value: '100%', label: 'Width: 100%' },
          ]}
          onChange={(val) => {
            updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, width: val } }));
            showNotification(`Width set to ${val}`);
          }}
          size="sm"
        />
      </div>

      <span className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-0.5 shrink-0" />
      <AlignmentPicker block={block} showNotification={showNotification} />
    </div>
  );
}

function ColumnsToolbar({ block, showNotification }: CommonToolbarProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
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
    showNotification(`Columns set to ${count}`);
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 rounded-lg border border-indigo-200/60 dark:border-indigo-800/60">
        <ColumnsIcon size={14} /> Columns ({cols})
      </span>

      <span className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-0.5 shrink-0" />

      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700">
        {[2, 3, 4].map((count) => (
          <button
            key={count}
            onClick={() => setColumnCount(count)}
            className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${cols === count ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-2xs' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'}`}
          >
            {count} Cols
          </button>
        ))}
      </div>
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
    <div className="flex items-center gap-1.5 flex-wrap">
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

  const toggleStyle = (targetStyle: ListStyle) => {
    const currentStyle = (block.attributes.style as ListStyle) || 'bullet';

    if (currentStyle === targetStyle) {
      // Toggle OFF: Convert list to paragraph block(s)
      const currentBlocks = useEditorStore.getState().blocks;
      const blockIdx = currentBlocks.findIndex((b) => b.id === block.id);
      const items = (block.attributes.items as { id: string; content: RichTextValue }[]) || [];

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
      showNotification('Removed list formatting');
      return;
    }

    updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, style: targetStyle } }));
    showNotification(`List style set to ${targetStyle}`);
  };

  const getActiveListItemId = (): string | null => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
    while (node && node !== document.body) {
      if (node.nodeType === 1 && (node as HTMLElement).hasAttribute('data-list-item')) {
        return (node as HTMLElement).getAttribute('data-list-item');
      }
      node = node.parentNode;
    }
    return null;
  };

  const indentList = () => {
    const items = (block.attributes.items as { id: string; content: RichTextValue; level?: number }[]) ?? [];
    const activeId = getActiveListItemId();
    const itemId = activeId || items[items.length - 1]?.id || items[0]?.id;
    if (itemId) {
      updateBlock(block.id, (b) => {
        const curItems = (b.attributes.items as { id: string; content: RichTextValue; level?: number }[]) ?? [];
        return {
          ...b,
          attributes: {
            ...b.attributes,
            items: curItems.map((it) => (it.id === itemId ? { ...it, level: Math.min((it.level || 0) + 1, 4) } : it)),
          },
        };
      });
      showNotification('Indented');
    }
  };

  const outdentList = () => {
    const items = (block.attributes.items as { id: string; content: RichTextValue; level?: number }[]) ?? [];
    const activeId = getActiveListItemId();
    const itemId = activeId || items[items.length - 1]?.id || items[0]?.id;
    if (itemId) {
      updateBlock(block.id, (b) => {
        const curItems = (b.attributes.items as { id: string; content: RichTextValue; level?: number }[]) ?? [];
        return {
          ...b,
          attributes: {
            ...b.attributes,
            items: curItems.map((it) => (it.id === itemId ? { ...it, level: Math.max((it.level || 0) - 1, 0) } : it)),
          },
        };
      });
      showNotification('Outdented');
    }
  };

  const currentStyle = (block.attributes.style as ListStyle) || 'bullet';

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
      <BlockTypeSelector block={block} />

      <Tooltip text="Bullet list">
        <button
          onClick={() => toggleStyle('bullet')}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0 ${currentStyle === 'bullet' ? 'bg-primary-100 text-primary-700 dark:bg-primary-950/70 dark:text-primary-300 font-semibold shadow-2xs' : 'text-gray-600 dark:text-gray-300 hover:text-primary-600'}`}
        >
          <List size={15} />
        </button>
      </Tooltip>

      <Tooltip text="Numbered list">
        <button
          onClick={() => toggleStyle('number')}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0 ${currentStyle === 'number' ? 'bg-primary-100 text-primary-700 dark:bg-primary-950/70 dark:text-primary-300 font-semibold shadow-2xs' : 'text-gray-600 dark:text-gray-300 hover:text-primary-600'}`}
        >
          <ListOrdered size={15} />
        </button>
      </Tooltip>

      <Tooltip text="Checklist">
        <button
          onClick={() => toggleStyle('checklist')}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0 ${currentStyle === 'checklist' ? 'bg-primary-100 text-primary-700 dark:bg-primary-950/70 dark:text-primary-300 font-semibold shadow-2xs' : 'text-gray-600 dark:text-gray-300 hover:text-primary-600'}`}
        >
          <CheckSquare size={15} />
        </button>
      </Tooltip>

      <span className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-1 shrink-0" />

      <Tooltip text="Indent list (Tab)">
        <button
          onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
          onClick={indentList}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-primary-600 transition-colors cursor-pointer shrink-0"
        >
          <Indent size={15} />
        </button>
      </Tooltip>

      <Tooltip text="Outdent list (Shift+Tab)">
        <button
          onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
          onClick={outdentList}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-primary-600 transition-colors cursor-pointer shrink-0"
        >
          <Outdent size={15} />
        </button>
      </Tooltip>
    </div>
  );
}

function MediaEmbedToolbar({ block, showNotification }: CommonToolbarProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 rounded-lg border border-purple-200/60 dark:border-purple-800/60">
        <Video size={14} /> {getBlockLabel(block.type)}
      </span>

      <span className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-0.5 shrink-0" />
      <AlignmentPicker block={block} showNotification={showNotification} />
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
    <div className="flex items-center gap-1.5 flex-wrap">
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
    <div className="flex items-center gap-1.5 flex-wrap">
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
      <div className="flex items-center gap-1.5 flex-wrap">
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
    <div className="flex items-center gap-1.5 flex-wrap">
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
    <div className="flex items-center gap-1.5 flex-wrap">
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
    <div className="flex items-center gap-1.5 flex-wrap">
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
            className={`w-7 h-7 rounded flex items-center justify-center transition-colors cursor-pointer ${
              verticalAlign === 'top'
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
            className={`w-7 h-7 rounded flex items-center justify-center transition-colors cursor-pointer ${
              verticalAlign === 'center'
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
            className={`w-7 h-7 rounded flex items-center justify-center transition-colors cursor-pointer ${
              verticalAlign === 'bottom'
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
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            imageFill
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
  quote: ParagraphToolbar,
  pullquote: ParagraphToolbar,
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
// MAIN TOP TOOLBAR HOST
// ==========================================

export default function BlockFormattingToolbar() {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const blocks = useEditorStore((s) => s.blocks);
  const htmlModeBlockIds = useEditorStore((s) => s.htmlModeBlockIds);
  const toggleHtmlMode = useEditorStore((s) => s.toggleHtmlMode);
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const moveBlock = useEditorStore((s) => s.moveBlock);
  const duplicateBlock = useEditorStore((s) => s.duplicateBlock);
  const removeBlock = useEditorStore((s) => s.removeBlock);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const past = useEditorStore((s) => s.past);
  const future = useEditorStore((s) => s.future);

  const [showLink, setShowLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  const [toast, setToast] = useState<string | null>(null);

  const savedRangeRef = useRef<Range | null>(null);

  const blockId = selectedIds[0];
  const block = blockId ? findBlock(blocks, blockId) : null;
  const blockType = block?.type || 'paragraph';

  const showNotification = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
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

  const execCmd = (cmd: string, value?: string) => {
    restoreSelection();
    try {
      document.execCommand('styleWithCSS', false, 'false');
    } catch {
      // ignore
    }

    if (cmd === 'hiliteColor') {
      const sel = window.getSelection();
      let hasHighlight = false;
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        let node: Node | null = range.commonAncestorContainer;
        if (node.nodeType === 3) node = node.parentNode;
        while (node && node !== document.body && !(node as HTMLElement).hasAttribute('contenteditable')) {
          if (node.nodeType === 1) {
            const bg = (node as HTMLElement).style?.backgroundColor || window.getComputedStyle(node as HTMLElement).backgroundColor;
            if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'none') {
              hasHighlight = true;
              break;
            }
          }
          node = node.parentNode;
        }
      }

      if (hasHighlight) {
        document.execCommand('hiliteColor', false, 'transparent');
        document.execCommand('backColor', false, 'transparent');
        showNotification('Highlight removed');
      } else {
        document.execCommand('hiliteColor', false, value || '#fef08a');
        showNotification('Highlight applied');
      }
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

  const removeLink = () => {
    restoreSelection();

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      let node: Node | null = range.commonAncestorContainer;
      if (node.nodeType === 3) node = node.parentNode;
      const anchor = (node as HTMLElement)?.closest('a');

      if (anchor) {
        const parent = anchor.parentNode;
        while (anchor.firstChild) {
          const child = anchor.firstChild;
          if (child.nodeType === 1) {
            (child as HTMLElement).style.color = '';
            (child as HTMLElement).style.textDecoration = '';
          }
          parent?.insertBefore(child, anchor);
        }
        anchor.remove();
      } else {
        document.execCommand('unlink', false);
      }
    } else {
      document.execCommand('unlink', false);
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
      className="sticky top-0 z-40 shadow-sm backdrop-blur-md bg-white/95 dark:bg-gray-900/95 ring-1 ring-primary-500/20 border-b border-gray-200/90 dark:border-gray-800 px-3 py-1.5 flex items-center justify-between gap-2 shrink-0 min-h-[46px] overflow-visible transition-all"
    >
      {/* Toast Notification */}
      {toast && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg shadow-xl z-[110] animate-bounce">
          {toast}
        </div>
      )}

      {/* Render MultiSelectToolbar or Active Block Toolbar */}
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
        <div className="text-xs text-gray-400">Select a block to format</div>
      )}

      {/* Right Fixed Section (Link popover for text blocks, Undo, Redo, Pin) */}
      <div className="flex items-center gap-1 shrink-0">
        {supportsInlineLink && (
          <div className="relative inline-flex items-center shrink-0">
            <Tooltip text="Insert / Edit Link (Ctrl+K)">
              <button
                onMouseDown={(e) => { e.preventDefault(); }}
                onClick={openLinkPopover}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-colors cursor-pointer shrink-0"
              >
                <LinkIcon size={15} />
              </button>
            </Tooltip>
            {showLink && (
              <div className="absolute top-full right-0 mt-2 p-3 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col gap-2 z-[100] w-64">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  {linkUrl ? 'Edit Link' : 'Insert Link'}
                </span>
                <input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-primary-500"
                  onKeyDown={(e) => e.key === 'Enter' && applyLink()}
                  autoFocus
                />
                <input
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Link text (optional)"
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-primary-500"
                  onKeyDown={(e) => e.key === 'Enter' && applyLink()}
                />
                <div className="flex justify-between items-center mt-1">
                  {linkUrl ? (
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={removeLink}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 hover:bg-red-100 transition-colors cursor-pointer"
                    >
                      Remove Link
                    </button>
                  ) : (
                    <button onClick={() => setShowLink(false)} className="px-2.5 py-1 text-xs text-gray-500 cursor-pointer">
                      Cancel
                    </button>
                  )}
                  <div className="flex gap-1.5">
                    {linkUrl && (
                      <button onClick={() => setShowLink(false)} className="px-2.5 py-1 text-xs text-gray-500 cursor-pointer">
                        Cancel
                      </button>
                    )}
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={applyLink}
                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-primary-600 text-white cursor-pointer shadow-2xs hover:bg-primary-700 transition-colors"
                    >
                      {linkUrl ? 'Update' : 'Apply'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Edit HTML Toggle Button */}
        {block && (
          <Tooltip text="Edit HTML">
            <button
              onClick={() => toggleHtmlMode(block.id)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0 ${htmlModeBlockIds.includes(block.id)
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40'
                }`}
              title="Edit HTML"
            >
              <Code2 size={15} />
            </button>
          </Tooltip>
        )}

        {/* Move Up / Move Down */}
        {block && (
          <>
            <Tooltip text="Move Block Up (Up Arrow)">
              <button
                onClick={() => {
                  moveBlock(block.id, 'up');
                  showNotification('Moved block up');
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-colors cursor-pointer shrink-0"
              >
                <ArrowUp size={15} />
              </button>
            </Tooltip>

            <Tooltip text="Move Block Down (Down Arrow)">
              <button
                onClick={() => {
                  moveBlock(block.id, 'down');
                  showNotification('Moved block down');
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-colors cursor-pointer shrink-0"
              >
                <ArrowDown size={15} />
              </button>
            </Tooltip>

            {/* Duplicate Block Button */}
            <Tooltip text="Duplicate Block">
              <button
                onClick={() => {
                  duplicateBlock(block.id);
                  showNotification('Block duplicated');
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer shrink-0"
                title="Duplicate this block"
              >
                <CopyPlus size={15} />
              </button>
            </Tooltip>

            {/* Delete Selected Block Button */}
            <Tooltip text="Delete Block (Trash)">
              <button
                onClick={() => {
                  removeBlock(block.id);
                  showNotification('Block deleted');
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-700 transition-all cursor-pointer shrink-0"
                title="Delete this block"
              >
                <Trash2 size={15} />
              </button>
            </Tooltip>
          </>
        )}

        <span className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-1 shrink-0" />

        {/* Undo */}
        <Tooltip text="Undo (Ctrl+Z)">
          <button
            onClick={undo}
            disabled={past.length === 0}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
          >
            <Undo2 size={15} />
          </button>
        </Tooltip>

        {/* Redo */}
        <Tooltip text="Redo (Ctrl+Y)">
          <button
            onClick={redo}
            disabled={future.length === 0}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
          >
            <Redo2 size={15} />
          </button>
        </Tooltip>

        {/* Pin Block Toggle Button */}
        {block && (
          <Tooltip text={block.attributes?.pinned ? 'Unpin Block' : 'Pin Block'}>
            <button
              onClick={() => {
                const isCurrentlyPinned = Boolean(block.attributes?.pinned);
                updateBlock(block.id, (b) => ({
                  ...b,
                  attributes: { ...b.attributes, pinned: !isCurrentlyPinned },
                }));
                showNotification(!isCurrentlyPinned ? 'Block pinned to top' : 'Block unpinned');
              }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${block.attributes?.pinned
                ? 'bg-amber-500 text-white shadow-md ring-2 ring-amber-400 font-bold'
                : 'text-gray-600 dark:text-gray-300 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                }`}
              title="Pin / Unpin this block"
            >
              <Pin size={15} className={block.attributes?.pinned ? 'rotate-45 text-white' : ''} />
            </button>
          </Tooltip>
        )}

        {/* <span className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-1 shrink-0" /> */}

        {/* Pin Toolbar */}
        {/* <Tooltip text={isPinned ? 'Unpin Toolbar from top' : 'Pin Toolbar to top (Sticky)'} align="right">
          <button
            onClick={() => {
              const nextState = !isPinned;
              setIsPinned(nextState);
              showNotification(nextState ? 'Toolbar pinned to top (Sticky)' : 'Toolbar unpinned');
            }}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${isPinned
              ? 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white font-bold shadow-md ring-2 ring-primary-400/50'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium'
              }`}
          >
            <Pin size={14} className={isPinned ? 'rotate-45 text-white' : ''} />
            <span className="text-[11px] select-none">
              {isPinned ? '📌 PINNED TO TOP' : 'Pin Toolbar'}
            </span>
          </button>
        </Tooltip> */}
      </div>
    </div>
  );
}
