import React, { useState } from 'react';
import {
  LayoutGrid, SlidersHorizontal, MoreHorizontal,
  Eye, Sun, Moon, X, Undo2, Redo2, Save, FileDown,
} from 'lucide-react';
import { useEditorStore, saveToIndexedDB, syncPages } from './store';
import { exportHtml } from './exporter';

export default function MobileBottomBar() {
  const inserterOpen = useEditorStore((s) => s.inserterOpen);
  const setInserterOpen = useEditorStore((s) => s.setInserterOpen);
  const settingsOpen = useEditorStore((s) => s.settingsSidebarOpen);
  const setSettingsSidebarOpen = useEditorStore((s) => s.setSettingsSidebarOpen);
  const isPreviewMode = useEditorStore((s) => s.isPreviewMode);
  const setIsPreviewMode = useEditorStore((s) => s.setIsPreviewMode);
  const theme = useEditorStore((s) => s.theme);
  const toggleTheme = useEditorStore((s) => s.toggleTheme);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const past = useEditorStore((s) => s.past);
  const future = useEditorStore((s) => s.future);
  const blocks = useEditorStore((s) => s.blocks);
  const documentTitle = useEditorStore((s) => s.documentTitle);

  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  if (isPreviewMode) return null;

  const handleSave = async () => {
    setMoreMenuOpen(false);
    try {
      const state = useEditorStore.getState();
      await saveToIndexedDB(state);
      await syncPages(state.pages, state.currentPageId, state.blocks);
      setSaveToast('Saved!');
      setTimeout(() => setSaveToast(null), 2500);
    } catch {
      setSaveToast('Save failed');
      setTimeout(() => setSaveToast(null), 2500);
    }
  };

  const handleExport = () => {
    setMoreMenuOpen(false);
    const html = exportHtml(blocks, documentTitle || 'Exported Page');
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(documentTitle || 'export').replace(/\s+/g, '-').toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ActionBtn = ({
    onClick,
    icon,
    label,
    disabled = false,
    accent,
  }: {
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    disabled?: boolean;
    accent?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-50 dark:hover:bg-blue-950/40 ${accent || 'text-slate-700 dark:text-slate-200 hover:text-blue-600'}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <>
      {/* Mobile Bottom Bar — full-width native style */}
      <nav
        aria-label="Mobile Navigation Dock"
        className="fixed bottom-0 inset-x-0 z-40 xs:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-2px_16px_rgba(0,0,0,0.08)] rounded-t-2xl flex items-end select-none"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Style / Settings — LEFT */}
        <button
          type="button"
          onClick={() => {
            setInserterOpen(false);
            setMoreMenuOpen(false);
            setSettingsSidebarOpen(!settingsOpen);
          }}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-all cursor-pointer relative group ${settingsOpen ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          title="Block Settings"
        >
          {settingsOpen && (
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
          )}
          <span className={`transition-transform duration-200 ${settingsOpen ? 'scale-110' : 'group-hover:scale-105'}`}>
            <SlidersHorizontal size={20} strokeWidth={settingsOpen ? 2.5 : 1.75} />
          </span>
          <span className={`text-[10px] font-semibold tracking-wide ${settingsOpen ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'}`}>
            Style
          </span>
        </button>

        {/* Blocks Library — CENTER FAB */}
        <div className="flex-1 flex flex-col items-center justify-end pb-2.5">
          <button
            type="button"
            onClick={() => {
              setSettingsSidebarOpen(false);
              setMoreMenuOpen(false);
              setInserterOpen(!inserterOpen);
            }}
            className={`flex flex-col items-center justify-center gap-0.5 w-16 h-16 rounded-full -mt-8 border-4 border-white dark:border-slate-900 shadow-xl transition-all cursor-pointer ${
              inserterOpen
                ? 'bg-blue-700 scale-105 shadow-blue-600/50'
                : 'bg-blue-600 hover:bg-blue-700 hover:scale-105 shadow-blue-500/40'
            }`}
            title="Blocks Library"
          >
            <LayoutGrid size={20} strokeWidth={2} className="text-white" />
            <span className="text-[9px] font-bold text-white tracking-wide leading-none">Blocks</span>
          </button>
        </div>

        {/* More Actions — RIGHT */}
        <button
          type="button"
          onClick={() => {
            setInserterOpen(false);
            setSettingsSidebarOpen(false);
            setMoreMenuOpen(!moreMenuOpen);
          }}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-all cursor-pointer relative group ${moreMenuOpen ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          title="More Actions"
        >
          {moreMenuOpen && (
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
          )}
          <span className={`transition-transform duration-200 ${moreMenuOpen ? 'scale-110' : 'group-hover:scale-105'}`}>
            <MoreHorizontal size={20} strokeWidth={moreMenuOpen ? 2.5 : 1.75} />
          </span>
          <span className={`text-[10px] font-semibold tracking-wide ${moreMenuOpen ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'}`}>
            More
          </span>
        </button>
      </nav>

      {/* More Actions Bottom Sheet */}
      {moreMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-[190] bg-black/60 backdrop-blur-xs xs:hidden"
            onClick={() => setMoreMenuOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-[200] bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_24px_rgba(0,0,0,0.1)] p-4 animate-in slide-in-from-bottom duration-300 xs:hidden space-y-3">
            {/* Pull handle */}
            <div
              className="w-12 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 mx-auto cursor-pointer"
              onClick={() => setMoreMenuOpen(false)}
            />

            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Quick Actions</span>
              <button
                type="button"
                onClick={() => setMoreMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Undo / Redo row */}
            <div className="grid grid-cols-2 gap-2">
              <ActionBtn
                onClick={() => { undo(); setMoreMenuOpen(false); }}
                disabled={past.length === 0}
                icon={<Undo2 size={16} className="text-slate-500" />}
                label="Undo"
              />
              <ActionBtn
                onClick={() => { redo(); setMoreMenuOpen(false); }}
                disabled={future.length === 0}
                icon={<Redo2 size={16} className="text-slate-500" />}
                label="Redo"
              />
            </div>

            {/* Main actions grid */}
            <div className="grid grid-cols-2 gap-2">
              <ActionBtn
                onClick={() => { setIsPreviewMode(true); setMoreMenuOpen(false); }}
                icon={<Eye size={16} className="text-blue-400" />}
                label="Preview Page"
              />
              <ActionBtn
                onClick={handleSave}
                icon={<Save size={16} className="text-emerald-400" />}
                label="Save"
                accent="text-slate-700 dark:text-slate-200 hover:text-emerald-600"
              />
              <ActionBtn
                onClick={handleExport}
                icon={<FileDown size={16} className="text-violet-500" />}
                label="Export HTML"
              />
              <ActionBtn
                onClick={() => { toggleTheme(); setMoreMenuOpen(false); }}
                icon={theme === 'dark'
                  ? <Sun size={16} className="text-amber-400" />
                  : <Moon size={16} className="text-indigo-400" />}
                label={theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
              />
            </div>
          </div>
        </>
      )}

      {/* Save Toast */}
      {saveToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[99999] flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900/95 text-white text-xs font-bold shadow-2xl border border-slate-700 backdrop-blur-md xs:hidden">
          <span>{saveToast}</span>
        </div>
      )}
    </>
  );
}
