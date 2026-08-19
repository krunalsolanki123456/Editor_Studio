import { useEffect, useState } from 'react';
import { Layout, Sparkles } from 'lucide-react';
import { useEditorStore } from './store';
import BlockWrapper from './BlockWrapper';
import SlashMenu from './SlashMenu';
import BlockFormattingToolbar from './BlockFormattingToolbar';
// import PublishingHeader from './PublishingHeader';
import { parseRichPasteToBlocks } from './richPasteEngine';
import { detectContentPattern, applyAISmartStructure } from './aiSmartPaste';
import { focusBlockId } from './utils';

export default function EditorCanvas() {
  const blocks = useEditorStore((s) => s.blocks);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const insertBlock = useEditorStore((s) => s.insertBlock);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const copyBlocks = useEditorStore((s) => s.copyBlocks);
  const pasteBlocks = useEditorStore((s) => s.pasteBlocks);
  const removeBlock = useEditorStore((s) => s.removeBlock);
  const slashMenu = useEditorStore((s) => s.slashMenu);
  const closeSlashMenu = useEditorStore((s) => s.closeSlashMenu);
  const openSlashMenu = useEditorStore((s) => s.openSlashMenu);
  const moveBlock = useEditorStore((s) => s.moveBlock);
  const deviceView = useEditorStore((s) => s.deviceView);

  const getCanvasContainerClass = () => {
    switch (deviceView) {
      case 'tablet':
        return 'max-w-[768px] mx-auto py-5 sm:py-6 px-3 sm:px-6 w-full my-3 sm:my-6 bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800/90 rounded-xl sm:rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 transition-all duration-300 ease-out min-h-[calc(100vh-7rem)]';
      case 'mobile':
        return 'max-w-[390px] mx-auto py-5 px-3 w-full my-3 sm:my-6 bg-white dark:bg-gray-900 border-4 border-gray-300 dark:border-gray-800 rounded-3xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 transition-all duration-300 ease-out min-h-[calc(100vh-7rem)]';
      case 'desktop':
      default:
        return 'max-w-[1200px] mx-auto py-4 sm:py-8 px-2 sm:px-6 md:px-8 w-full my-2 sm:my-6 bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800/80 rounded-xl sm:rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 transition-all duration-300 ease-out min-h-[calc(100vh-7rem)]';
    }
  };

  const groupSelectedBlocks = useEditorStore((s) => s.groupSelectedBlocks);
  const ungroupSelectedBlocks = useEditorStore((s) => s.ungroupSelectedBlocks);
  const selectAllBlocks = useEditorStore((s) => s.selectAllBlocks);
  const deleteSelectedBlocks = useEditorStore((s) => s.deleteSelectedBlocks);
  const duplicateSelectedBlocks = useEditorStore((s) => s.duplicateSelectedBlocks);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isEditable = target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'a') {
          if (isEditable) {
            const sel = window.getSelection();
            const textContent = (target.textContent || '').trim();
            const selectedText = sel ? sel.toString().trim() : '';
            if (selectedText.length > 0 && (selectedText === textContent || selectedText.length >= textContent.length - 2)) {
              e.preventDefault();
              target.blur();
              selectAllBlocks();
            }
          } else {
            e.preventDefault();
            selectAllBlocks();
          }
        }
        else if (e.key.toLowerCase() === 'g' && e.shiftKey) { e.preventDefault(); ungroupSelectedBlocks(); }
        else if (e.key.toLowerCase() === 'g' && !e.shiftKey) { e.preventDefault(); groupSelectedBlocks(); }
        else if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
        else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
        else if (e.key.toLowerCase() === 'c' && selectedIds.length > 0 && !isEditable) { e.preventDefault(); copyBlocks(); }
        else if (e.key.toLowerCase() === 'v' && !isEditable) { e.preventDefault(); pasteBlocks(); }
        else if (e.key.toLowerCase() === 'd' && selectedIds.length > 0) { e.preventDefault(); duplicateSelectedBlocks(); }
        else if (e.key.toLowerCase() === 's') { e.preventDefault(); }
        return;
      }

      if (isEditable) return;

      if (e.key === 'Escape') { clearSelection(); closeSlashMenu(); }
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) { e.preventDefault(); deleteSelectedBlocks(); }
      } else if (e.key === 'ArrowUp' && selectedIds.length === 1) {
        if (e.altKey || e.shiftKey) {
          e.preventDefault();
          moveBlock(selectedIds[0], 'up');
        } else {
          e.preventDefault();
          const idx = blocks.findIndex((b) => b.id === selectedIds[0]);
          if (idx > 0) {
            const prevId = blocks[idx - 1].id;
            useEditorStore.getState().selectBlock(prevId);
            focusBlockId(prevId, false);
          }
        }
      } else if (e.key === 'ArrowDown' && selectedIds.length === 1) {
        if (e.altKey || e.shiftKey) {
          e.preventDefault();
          moveBlock(selectedIds[0], 'down');
        } else {
          e.preventDefault();
          const idx = blocks.findIndex((b) => b.id === selectedIds[0]);
          if (idx !== -1 && idx < blocks.length - 1) {
            const nextId = blocks[idx + 1].id;
            useEditorStore.getState().selectBlock(nextId);
            focusBlockId(nextId, true);
          }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedIds, undo, redo, copyBlocks, pasteBlocks, duplicateSelectedBlocks, deleteSelectedBlocks, selectAllBlocks, removeBlock, clearSelection, closeSlashMenu, moveBlock]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      openSlashMenu(detail.blockId, detail.rect.x, detail.rect.y);
    };
    window.addEventListener('be-slash', handler);
    return () => window.removeEventListener('be-slash', handler);
  }, [openSlashMenu]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const blockEl = (e.target as HTMLElement).closest('[data-block-id]') as HTMLElement;
      if (!blockEl) return;
      const blockId = blockEl.getAttribute('data-block-id');
      if (!blockId) return;
      const { updateBlock } = useEditorStore.getState();
      updateBlock(blockId, (b) => ({ ...b, attributes: { ...b.attributes, align: detail.align } }));
    };
    window.addEventListener('be-align', handler);
    return () => window.removeEventListener('be-align', handler);
  }, []);

  const [converting, setConverting] = useState(false);
  const [aiPasteToast, setAiPasteToast] = useState<{ pattern: string; summary: string } | null>(null);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const active = document.activeElement;
      const isEditableInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');

      if (isEditableInput) return;

      const html = e.clipboardData?.getData('text/html');
      const plainText = e.clipboardData?.getData('text/plain');
      const contentToParse = (html && html.trim()) ? html : (plainText && plainText.trim() ? plainText : '');

      if (!contentToParse) return;

      const isInlineRichText = active && (active as HTMLElement).isContentEditable;

      if (isEditableInput || isInlineRichText) return;

      e.preventDefault();
      setConverting(true);

      setTimeout(() => {
        try {
          const generatedBlocks = parseRichPasteToBlocks(contentToParse);
          if (generatedBlocks.length > 0) {
            const detectedPattern = detectContentPattern(generatedBlocks, contentToParse);
            const smartResult = applyAISmartStructure(generatedBlocks, detectedPattern);

            const activeBlockEl = active ? (active as HTMLElement).closest('[data-block-id]') : null;
            const targetId = activeBlockEl ? activeBlockEl.getAttribute('data-block-id') : (selectedIds.length > 0 ? selectedIds[0] : null);

            const { blocks, addBlocks, replaceBlockWithBlocks } = useEditorStore.getState();
            const targetBlock = targetId ? blocks.find((b) => b.id === targetId) : null;
            const isTargetEmpty = targetBlock && (() => {
              const c = targetBlock.attributes?.content;
              if (!c) return true;
              if (Array.isArray(c)) {
                return c.length === 0 || !c.map((item: any) => item?.text || '').join('').trim();
              }
              if (typeof c === 'string') return !c.trim();
              return false;
            })();

            if (targetId && isTargetEmpty) {
              replaceBlockWithBlocks(targetId, smartResult.blocks);
            } else {
              addBlocks(smartResult.blocks, targetId);
            }

            setAiPasteToast({
              pattern: smartResult.patternType,
              summary: smartResult.summary,
            });
          }
        } finally {
          setTimeout(() => setConverting(false), 400);
          setTimeout(() => setAiPasteToast(null), 3500);
        }
      }, 30);
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleCanvasClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    // Check if an anchor link was clicked
    const anchor = target.closest('a');
    if (anchor) {
      const href = anchor.getAttribute('href');
      if (href && href !== '#' && !href.startsWith('javascript:')) {
        e.preventDefault();
        e.stopPropagation();
        window.open(anchor.href, '_blank', 'noopener,noreferrer');
        return;
      }
    }

    const isBlock = target.closest('[data-block-id]');
    const isControl = target.closest('button, input, textarea, a, select, [contenteditable="true"]');
    const isToolbar = target.closest('.sticky, header, nav, .be-toolbar, [role="toolbar"]');

    if (isBlock || isControl || isToolbar) return;

    if (blocks.length === 0) {
      e.stopPropagation();
      const id = insertBlock('paragraph');
      if (id) {
        setTimeout(() => {
          const el = document.querySelector(`[data-block-id="${id}"] [contenteditable]`) as HTMLElement | null;
          if (el) el.focus({ preventScroll: true });
        }, 30);
      }
    } else {
      clearSelection();
      // If clicking in empty area below last block
      const lastBlock = blocks[blocks.length - 1];
      if (lastBlock) {
        if (lastBlock.type === 'paragraph') {
          const text = Array.isArray(lastBlock.attributes?.content)
            ? (lastBlock.attributes.content as any[]).map((s: any) => s.text || '').join('').trim()
            : typeof lastBlock.attributes?.content === 'string'
              ? (lastBlock.attributes.content as string).trim()
              : '';
          if (text === '') {
            useEditorStore.getState().selectBlock(lastBlock.id);
            const el = document.querySelector(`[data-block-id="${lastBlock.id}"] [contenteditable]`) as HTMLElement | null;
            if (el) el.focus({ preventScroll: true });
            return;
          }
        }
        const id = insertBlock('paragraph', blocks.length);
        if (id) {
          setTimeout(() => {
            const el = document.querySelector(`[data-block-id="${id}"] [contenteditable]`) as HTMLElement | null;
            if (el) el.focus({ preventScroll: true });
          }, 30);
        }
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-dot-grid transition-colors relative">
      <div
        className="flex-1 overflow-y-auto be-scroll"
        onClick={handleCanvasClick}
      >
        {/* <PublishingHeader /> */}
        <BlockFormattingToolbar />
        <div className="p-4 sm:p-6 pb-48">
          <div className={`${getCanvasContainerClass()} cursor-text mb-20`} onClick={handleCanvasClick}>
            <div>
              {blocks.map((block, index) => (
                <BlockWrapper key={block.id} block={block} index={index} total={blocks.length} />
              ))}
            </div>

          {blocks.length === 0 && (
            <div className="text-center py-16 px-6 cursor-text">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-500 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/25">
                <Layout size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1.5">Start building your page</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                Click anywhere on the document or select a block from the left sidebar to start typing.
              </p>
            </div>
          )}
        </div>
      </div>

      <SlashMenu open={slashMenu.open} blockId={slashMenu.blockId} anchor={slashMenu.anchor} onClose={closeSlashMenu} />
    </div>

      {(converting || aiPasteToast) && (
        <div className="fixed bottom-6 right-6 z-[99999] flex items-center gap-3 px-4 py-3 bg-slate-900/95 text-white font-bold text-xs rounded-2xl shadow-2xl border border-slate-700 backdrop-blur-md animate-fade-in">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-md shrink-0">
            <Sparkles size={15} className={converting ? 'animate-spin' : ''} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              {converting ? 'Converting Content…' : `✨ AI Smart Paste: ${aiPasteToast?.pattern}`}
            </div>
            <div className="text-xs text-slate-200 font-semibold mt-0.5">
              {converting ? 'Analyzing layout & generating native blocks' : aiPasteToast?.summary}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

