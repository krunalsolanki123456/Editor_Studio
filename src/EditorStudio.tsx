import React, { useEffect, useState } from 'react';
import { useEditorStore } from './editor/store';
import TopToolbar from './editor/TopToolbar';
import EditorCanvas from './editor/EditorCanvas';
import BlockInserter from './editor/BlockInserter';
import SettingsSidebar from './editor/SettingsSidebar';
import InlineToolbar from './editor/InlineToolbar';
import { blockToHtmlCode } from './editor/utils';
import { createBlock, BlockFilterOptions } from './editor/blocks/registry';
import type { BlockInstance } from './editor/types';
import './index.css';

export interface EditorStudioProps extends BlockFilterOptions {
  initialBlocks?: BlockInstance[];
  initialTitle?: string;
  onChange?: (blocks: BlockInstance[]) => void;
  onSave?: (blocks: BlockInstance[], html: string) => void;
  theme?: 'light' | 'dark';
  className?: string;
  hideToolbar?: boolean;
  autoSave?: boolean;
}

export function EditorStudio({
  initialBlocks,
  initialTitle,
  onChange,
  onSave,
  theme: controlledTheme,
  className = '',
  hideToolbar = false,
  autoSave = true,
  allowedBlocks,
  disabledBlocks,
  allowedCategories,
  enablePolls,
  enableLiveUpdates,
  enableCharts,
  enableEmbeds,
  enableCode,
  enableLayout,
  enableMedia,
  enableTables,
}: EditorStudioProps) {
  const theme = useEditorStore((s) => s.theme);
  const inserterOpen = useEditorStore((s) => s.inserterOpen);
  const setInserterOpen = useEditorStore((s) => s.setInserterOpen);
  const insertBlock = useEditorStore((s) => s.insertBlock);
  const blocks = useEditorStore((s) => s.blocks);
  const setBlocks = useEditorStore((s) => s.setBlocks);
  const setDocumentTitle = useEditorStore((s) => s.setDocumentTitle);
  const setFilterOptions = useEditorStore((s) => s.setFilterOptions);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);

  const setSettingsSidebarOpen = useEditorStore((s) => s.setSettingsSidebarOpen);

  // Sync block filter options
  useEffect(() => {
    setFilterOptions({
      allowedBlocks,
      disabledBlocks,
      allowedCategories,
      enablePolls,
      enableLiveUpdates,
      enableCharts,
      enableEmbeds,
      enableCode,
      enableLayout,
      enableMedia,
      enableTables,
    });
  }, [
    setFilterOptions,
    allowedBlocks,
    disabledBlocks,
    allowedCategories,
    enablePolls,
    enableLiveUpdates,
    enableCharts,
    enableEmbeds,
    enableCode,
    enableLayout,
    enableMedia,
    enableTables,
  ]);

  // Prevent initialBlocks from overwriting autosaved state on page reload
  useEffect(() => {
    if (autoSave) {
      try {
        const saved = localStorage.getItem('be-autosave');
        if (saved !== null) {
          // A saved session exists (even if empty after deleting blocks) - do not overwrite with initialBlocks
          return;
        }
      } catch {
        /* fallback to initialBlocks */
      }
    }

    if (initialBlocks && initialBlocks.length > 0) {
      setBlocks(initialBlocks);
    }
  }, [initialBlocks, setBlocks, autoSave]);

  useEffect(() => {
    if (initialTitle) {
      if (autoSave) {
        try {
          const savedTitle = localStorage.getItem('be-title');
          if (savedTitle && savedTitle.trim() && savedTitle !== 'Untitled Document') {
            return;
          }
        } catch {
          /* fallback */
        }
      }
      setDocumentTitle(initialTitle);
    }
  }, [initialTitle, setDocumentTitle, autoSave]);

  // Sync controlled theme
  useEffect(() => {
    if (controlledTheme) {
      useEditorStore.setState({ theme: controlledTheme });
    }
  }, [controlledTheme]);

  // Apply dark mode class to root
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Notify parent on change
  useEffect(() => {
    if (onChange) {
      onChange(blocks);
    }
  }, [blocks, onChange]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setInserterOpen(false);
        setSettingsSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setInserterOpen, setSettingsSidebarOpen]);

  const selectedIds = useEditorStore((s) => s.selectedIds);

  const handleInsert = (type: string) => {
    const storeTargetIndex = useEditorStore.getState().inserterTargetIndex;
    let targetIndex: number | null = insertIndex ?? storeTargetIndex;

    if (targetIndex === null && selectedIds.length > 0) {
      const idx = blocks.findIndex((b) => b.id === selectedIds[0]);
      if (idx !== -1) {
        const selectedBlock = blocks[idx];
        if (type === 'code' || type === 'preformatted') {
          const codeText = blockToHtmlCode(selectedBlock);
          useEditorStore.getState().updateBlock(selectedBlock.id, (b) => ({
            ...b,
            type,
            attributes: {
              ...createBlock(type)?.attributes,
              content: codeText,
            },
          }));
          setTimeout(() => {
            const el = document.querySelector(
              `[data-block-id="${selectedBlock.id}"] [contenteditable], [data-block-id="${selectedBlock.id}"] textarea`
            ) as HTMLElement | null;
            if (el) el.focus();
          }, 50);
          return;
        }
        targetIndex = idx + 1;
      }
    }

    const newId = insertBlock(type, targetIndex);
    setInsertIndex(null);
    useEditorStore.setState({ inserterTargetIndex: null });

    if (newId) {
      setTimeout(() => {
        const el = document.querySelector(
          `[data-block-id="${newId}"] [contenteditable], [data-block-id="${newId}"] textarea, [data-block-id="${newId}"] input`
        ) as HTMLElement | null;
        if (el) el.focus();
      }, 50);
    }
  };

  return (
    <div className={`h-screen flex flex-col editor-surface ${className}`}>
      {!hideToolbar && (
        <TopToolbar
          onSave={onSave}
          onOpenInserter={() => {
            setInsertIndex(blocks.length);
            setInserterOpen(true);
          }}
        />
      )}
      <div className="flex-1 flex overflow-hidden">
        <BlockInserter
          open={inserterOpen}
          onClose={() => setInserterOpen(false)}
          onInsert={handleInsert}
        />
        <EditorCanvas />
        <SettingsSidebar />
      </div>
      <InlineToolbar />
    </div>
  );
}

export default EditorStudio;
