import { useEffect, useState } from 'react';
import { useEditorStore } from './editor/store';
import TopToolbar from './editor/TopToolbar';
import EditorCanvas from './editor/EditorCanvas';
import BlockInserter from './editor/BlockInserter';
import SettingsSidebar from './editor/SettingsSidebar';
import InlineToolbar from './editor/InlineToolbar';
import { blockToHtmlCode } from './editor/utils';
import { createBlock } from './editor/blocks/registry';

export default function App() {
  const theme = useEditorStore((s) => s.theme);
  const inserterOpen = useEditorStore((s) => s.inserterOpen);
  const setInserterOpen = useEditorStore((s) => s.setInserterOpen);
  const insertBlock = useEditorStore((s) => s.insertBlock);
  const blocks = useEditorStore((s) => s.blocks);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);

  const setSettingsSidebarOpen = useEditorStore((s) => s.setSettingsSidebarOpen);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

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
    let targetIndex: number | null = insertIndex;
    if (selectedIds.length > 0) {
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
    <div className="h-screen flex flex-col editor-surface">
      <TopToolbar onOpenInserter={() => { setInsertIndex(blocks.length); setInserterOpen(true); }} />
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
