import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from './editor/store';
import TopToolbar from './editor/TopToolbar';
import EditorCanvas from './editor/EditorCanvas';
import BlockInserter from './editor/BlockInserter';
import SettingsSidebar from './editor/SettingsSidebar';
import InlineToolbar from './editor/InlineToolbar';
import MobileBottomBar from './editor/MobileBottomBar';
import { blockToHtmlCode } from './editor/utils';
import { createBlock, BlockFilterOptions } from './editor/blocks/registry';
import type { BlockInstance } from './editor/types';
import type { EditorPlan, BlockPermissionsConfig, UpgradeRequiredPayload } from './editor/permissions/types';
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
  /** Subscription plan for the current user. Activates the permission system when set. */
  plan?: EditorPlan;
  /** Block permission configuration from Super Admin. If omitted, uses default permissions. */
  blockPermissions?: BlockPermissionsConfig;
  /**
   * Called when a user clicks a premium-locked block.
   * Parent app handles pricing modal / upgrade flow.
   */
  onUpgradeRequired?: (payload: UpgradeRequiredPayload) => void;
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
  plan,
  blockPermissions,
  onUpgradeRequired,
}: EditorStudioProps) {
  const theme = useEditorStore((s) => s.theme);
  const inserterOpen = useEditorStore((s) => s.inserterOpen);
  const setInserterOpen = useEditorStore((s) => s.setInserterOpen);
  const insertBlock = useEditorStore((s) => s.insertBlock);
  const blocks = useEditorStore((s) => s.blocks);
  const setBlocks = useEditorStore((s) => s.setBlocks);
  const setDocumentTitle = useEditorStore((s) => s.setDocumentTitle);
  const setFilterOptions = useEditorStore((s) => s.setFilterOptions);
  const setPlan = useEditorStore((s) => s.setPlan);
  const setBlockPermissions = useEditorStore((s) => s.setBlockPermissions);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);

  // Keep onUpgradeRequired in a ref so components can always access latest version
  const onUpgradeRequiredRef = useRef(onUpgradeRequired);
  onUpgradeRequiredRef.current = onUpgradeRequired;

  const isPreviewMode = useEditorStore((s) => s.isPreviewMode);
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

  // Sync plan and block permissions to store
  useEffect(() => {
    setPlan(plan ?? null);
  }, [plan, setPlan]);

  useEffect(() => {
    setBlockPermissions(blockPermissions ?? null);
  }, [blockPermissions, setBlockPermissions]);

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

  const isParagraphEmpty = (b: BlockInstance | undefined) => {
    if (!b || b.type !== 'paragraph') return false;
    const c = b.attributes?.content;
    if (!c) return true;
    if (Array.isArray(c)) {
      return c.length === 0 || c.every((s: any) => !s.text || !(s.text as string).trim());
    }
    if (typeof c === 'string') return !(c as string).trim();
    return false;
  };

  const handleInsert = (type: string) => {
    const currentBlocks = useEditorStore.getState().blocks;
    const storeTargetIndex = useEditorStore.getState().inserterTargetIndex;
    let targetIndex: number | null = insertIndex ?? storeTargetIndex;

    // 1. If document only contains a single empty paragraph, replace it directly in-place
    if (currentBlocks.length === 1 && isParagraphEmpty(currentBlocks[0])) {
      const emptyBlock = currentBlocks[0];
      const newBlock = createBlock(type);
      if (newBlock) {
        useEditorStore.getState().updateBlock(emptyBlock.id, () => ({
          ...newBlock,
          id: emptyBlock.id,
        }));
        setInsertIndex(null);
        useEditorStore.setState({ inserterTargetIndex: null });
        setTimeout(() => {
          const el = document.querySelector(
            `[data-block-id="${emptyBlock.id}"] [contenteditable], [data-block-id="${emptyBlock.id}"] textarea, [data-block-id="${emptyBlock.id}"] input`
          ) as HTMLElement | null;
          if (el) el.focus();
        }, 50);
        return;
      }
    }

    // 2. If a block is currently selected
    if (selectedIds.length > 0) {
      const idx = currentBlocks.findIndex((b) => b.id === selectedIds[0]);
      if (idx !== -1) {
        const selectedBlock = currentBlocks[idx];

        // Code/preformatted conversion
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
          setInsertIndex(null);
          useEditorStore.setState({ inserterTargetIndex: null });
          setTimeout(() => {
            const el = document.querySelector(
              `[data-block-id="${selectedBlock.id}"] [contenteditable], [data-block-id="${selectedBlock.id}"] textarea`
            ) as HTMLElement | null;
            if (el) el.focus();
          }, 50);
          return;
        }

        // If the selected block is an empty paragraph, replace it in-place
        if (isParagraphEmpty(selectedBlock) && storeTargetIndex === null) {
          const newBlock = createBlock(type);
          if (newBlock) {
            useEditorStore.getState().updateBlock(selectedBlock.id, () => ({
              ...newBlock,
              id: selectedBlock.id,
            }));
            setInsertIndex(null);
            useEditorStore.setState({ inserterTargetIndex: null });
            setTimeout(() => {
              const el = document.querySelector(
                `[data-block-id="${selectedBlock.id}"] [contenteditable], [data-block-id="${selectedBlock.id}"] textarea, [data-block-id="${selectedBlock.id}"] input`
              ) as HTMLElement | null;
              if (el) el.focus();
            }, 50);
            return;
          }
        }

        if (targetIndex === null) {
          targetIndex = idx + 1;
        }
      }
    }

    // 3. If targetIndex points after an empty paragraph and there's only 1 block, replace it
    if (targetIndex !== null && targetIndex > 0 && targetIndex <= currentBlocks.length) {
      const prevBlock = currentBlocks[targetIndex - 1];
      if (isParagraphEmpty(prevBlock) && currentBlocks.length === 1) {
        const newBlock = createBlock(type);
        if (newBlock) {
          useEditorStore.getState().updateBlock(prevBlock.id, () => ({
            ...newBlock,
            id: prevBlock.id,
          }));
          setInsertIndex(null);
          useEditorStore.setState({ inserterTargetIndex: null });
          setTimeout(() => {
            const el = document.querySelector(
              `[data-block-id="${prevBlock.id}"] [contenteditable], [data-block-id="${prevBlock.id}"] textarea, [data-block-id="${prevBlock.id}"] input`
            ) as HTMLElement | null;
            if (el) el.focus();
          }, 50);
          return;
        }
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
    <div className={`h-full max-h-full w-full flex flex-col overflow-hidden editor-surface ${className}`}>
      {!hideToolbar && (
        <div className="relative z-[200] shrink-0">
          <TopToolbar
            onSave={onSave}
            onOpenInserter={() => {
              setInsertIndex(null);
              setInserterOpen(true);
            }}
          />
        </div>
      )}
      <div className="flex-1 min-h-0 flex overflow-hidden relative z-10">
        {!isPreviewMode && (
          <BlockInserter
            open={inserterOpen}
            onClose={() => setInserterOpen(false)}
            onInsert={handleInsert}
            onUpgradeRequired={onUpgradeRequiredRef.current}
          />
        )}
        <EditorCanvas onUpgradeRequired={onUpgradeRequiredRef.current} />
        {!isPreviewMode && <SettingsSidebar />}
      </div>
      {!isPreviewMode && <InlineToolbar />}
      {!isPreviewMode && <MobileBottomBar />}
    </div>
  );
}

export default EditorStudio;
