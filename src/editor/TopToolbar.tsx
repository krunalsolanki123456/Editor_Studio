import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  FileDown, Eye, X, Monitor, Tablet, Smartphone,
  FileText, ChevronDown, Plus, Trash2, Save, Undo2, Redo2,
  ZoomIn, ZoomOut, CheckCircle2, Sun, Moon, CopyPlus, Edit3,
} from 'lucide-react';
import { useEditorStore, saveToIndexedDB, syncPages } from './store';
import { exportHtml } from './exporter';
import logo from "../assets/logo-Editor-Studio.png";
import type { BlockInstance } from './types';

export interface TopToolbarProps {
  onOpenInserter?: () => void;
  onSave?: (blocks: BlockInstance[], html: string) => void;
}

function Tooltip({
  text,
  children,
  align = 'center',
}: {
  text: string;
  children: React.ReactNode;
  align?: 'center' | 'left' | 'right';
}) {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      let left = rect.left + rect.width / 2;
      if (align === 'left') left = rect.left + 12;
      else if (align === 'right') left = rect.right - 12;
      setCoords({
        top: rect.bottom + 8,
        left: Math.max(70, Math.min(left, window.innerWidth - 70)),
      });
    }
  };

  const handleMouseLeave = () => {
    setCoords(null);
  };

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative inline-flex items-center shrink-0"
    >
      {children}
      {coords && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            transform: 'translateX(-50%)',
          }}
          className="pointer-events-none z-[99999999] flex flex-col items-center animate-in fade-in duration-100"
        >
          <div className="w-2 h-2 bg-slate-900 dark:bg-slate-800 rotate-45 -mb-1 shadow-xs border-t border-l border-slate-700/60" />
          <span className="px-2.5 py-1 text-[11px] font-semibold text-white bg-slate-900 dark:bg-slate-800 rounded-lg shadow-2xl border border-slate-700/60 whitespace-nowrap block">
            {text}
          </span>
        </div>,
        document.body
      )}
    </div>
  );
}

export default function TopToolbar({ onSave }: TopToolbarProps) {
  const blocks = useEditorStore((s) => s.blocks);
  const theme = useEditorStore((s) => s.theme);
  const toggleTheme = useEditorStore((s) => s.toggleTheme);
  const documentTitle = useEditorStore((s) => s.documentTitle);
  const deviceView = useEditorStore((s) => s.deviceView);
  const setDeviceView = useEditorStore((s) => s.setDeviceView);

  // Multi-Page state
  const pages = useEditorStore((s) => s.pages);
  const currentPageId = useEditorStore((s) => s.currentPageId);
  const setCurrentPageId = useEditorStore((s) => s.setCurrentPageId);
  const addPage = useEditorStore((s) => s.addPage);
  const renamePage = useEditorStore((s) => s.renamePage);
  const duplicatePage = useEditorStore((s) => s.duplicatePage);
  const deletePage = useEditorStore((s) => s.deletePage);

  // Preview & Zoom state
  const isPreviewMode = useEditorStore((s) => s.isPreviewMode);
  const setIsPreviewMode = useEditorStore((s) => s.setIsPreviewMode);
  const zoomLevel = useEditorStore((s) => s.zoomLevel);
  const setZoomLevel = useEditorStore((s) => s.setZoomLevel);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const past = useEditorStore((s) => s.past);
  const future = useEditorStore((s) => s.future);

  const [pagesDropdownOpen, setPagesDropdownOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentPage = pages.find((p) => p.id === currentPageId) || pages[0];

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setPagesDropdownOpen(false);
      }
    }
    if (pagesDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [pagesDropdownOpen]);

  const handleSave = () => {
    const state = useEditorStore.getState();
    const syncedPages = syncPages(state.pages, state.currentPageId, state.blocks);
    useEditorStore.setState({ pages: syncedPages });

    const fullPayload = {
      pages: syncedPages,
      currentPageId: state.currentPageId,
      blocks: state.blocks,
      documentTitle: state.documentTitle,
    };
    saveToIndexedDB(fullPayload);

    try {
      localStorage.setItem('be-autosave', JSON.stringify(fullPayload));
      localStorage.setItem('be-title', state.documentTitle);
    } catch {
      /* ignore */
    }

    const html = exportHtml(state.blocks, currentPage?.name || state.documentTitle);
    if (onSave) {
      onSave(state.blocks, html);
    }
    setSaveToast(`Saved "${currentPage?.name || 'Page'}" successfully!`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleSaveHtml = () => {
    const html = exportHtml(blocks, currentPage?.name || documentTitle);
    if (onSave) {
      onSave(blocks, html);
    }
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(currentPage?.name || documentTitle || 'page').toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (renameValue.trim() && currentPage) {
      renamePage(currentPage.id, renameValue.trim());
      setRenameModalOpen(false);
    }
  };

  const handleNewPage = () => {
    addPage();
    setPagesDropdownOpen(false);
  };

  const handleRenameClick = () => {
    if (currentPage) {
      setRenameValue(currentPage.name);
      setRenameModalOpen(true);
      setPagesDropdownOpen(false);
    }
  };

  const handleDuplicatePage = () => {
    if (currentPage) {
      duplicatePage(currentPage.id);
      setPagesDropdownOpen(false);
    }
  };

  const handleDeletePage = () => {
    if (currentPage && pages.length > 1) {
      deletePage(currentPage.id);
      setPagesDropdownOpen(false);
    }
  };

  // Render Pages Dropdown Component
  const renderPagesDropdown = () => (
    <div className="relative inline-block text-left shrink-0" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setPagesDropdownOpen(!pagesDropdownOpen)}
        className="flex items-center gap-1 sm:gap-2 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer shrink-0"
        title="Switch or manage pages"
      >
        <FileText size={13} className="text-blue-500 shrink-0" />
        <span className="max-w-[48px] xs:max-w-[70px] sm:max-w-[130px] truncate">{currentPage?.name || 'Page 1'}</span>
        <ChevronDown size={12} className={`text-slate-400 shrink-0 transition-transform duration-200 ${pagesDropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {pagesDropdownOpen && (
        <div className="absolute right-0 md:left-0 md:right-auto mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-2">
          <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between mb-1">
            <span>PAGES ({pages.length})</span>
          </div>

          <div className="max-h-56 overflow-y-auto be-scroll space-y-0.5 mb-1.5">
            {pages.map((p) => {
              const isActive = p.id === (currentPage?.id || currentPageId);
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    setCurrentPageId(p.id);
                    setPagesDropdownOpen(false);
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${isActive
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold border border-blue-200/60 dark:border-blue-800/60'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText size={14} className={isActive ? 'text-blue-500' : 'text-slate-400'} />
                    <span className="truncate">{p.name}</span>
                  </div>
                  {isActive && <CheckCircle2 size={14} className="text-blue-500 shrink-0" />}
                </div>
              );
            })}
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-1.5 space-y-1">
            <button
              type="button"
              onClick={handleNewPage}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>+ New Page</span>
            </button>

            <button
              type="button"
              onClick={handleRenameClick}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Edit3 size={14} className="text-slate-400" />
              <span>Rename Current Page</span>
            </button>

            <button
              type="button"
              onClick={handleDuplicatePage}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <CopyPlus size={14} className="text-slate-400" />
              <span>Duplicate Page</span>
            </button>

            {pages.length > 1 && (
              <button
                type="button"
                onClick={handleDeletePage}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Delete Page</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // If in Preview Mode, render the Preview Mode Top Header
  if (isPreviewMode) {
    return (
      <header className="sticky top-0 z-50 flex items-center justify-between px-2 sm:px-6 py-2 sm:py-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-all shadow-sm w-full overflow-visible gap-1 sm:gap-2 select-none">
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {renderPagesDropdown()}
        </div>

        <div className="flex items-center gap-1 sm:gap-4 flex-wrap justify-center shrink-0">
          <div className="hidden xs:flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <Tooltip text="Undo" align="center">
              <button
                type="button"
                onClick={undo}
                disabled={past.length === 0}
                className="p-1 sm:p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition-all cursor-pointer"
              >
                <Undo2 size={14} />
              </button>
            </Tooltip>
            <Tooltip text="Redo" align="center">
              <button
                type="button"
                onClick={redo}
                disabled={future.length === 0}
                className="p-1 sm:p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition-all cursor-pointer"
              >
                <Redo2 size={14} />
              </button>
            </Tooltip>
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <button
              onClick={() => setDeviceView('desktop')}
              className={`flex items-center gap-1 px-1.5 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${deviceView === 'desktop'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
            >
              <Monitor size={14} />
              <span className="hidden sm:inline">Desktop</span>
            </button>
            <button
              onClick={() => setDeviceView('tablet')}
              className={`flex items-center gap-1 px-1.5 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${deviceView === 'tablet'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
            >
              <Tablet size={14} />
              <span className="hidden sm:inline">Tablet</span>
            </button>
            <button
              onClick={() => setDeviceView('mobile')}
              className={`flex items-center gap-1 px-1.5 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${deviceView === 'mobile'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
            >
              <Smartphone size={14} />
              <span className="hidden sm:inline">Mobile</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs font-bold text-slate-700 dark:text-slate-300">
            <button
              type="button"
              onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 transition-colors cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut size={13} />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(100)}
              className="px-1.5 py-0.5 rounded hover:bg-white dark:hover:bg-slate-700 text-[11px] font-extrabold cursor-pointer transition-colors"
              title="Reset Zoom"
            >
              {zoomLevel}%
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(Math.min(150, zoomLevel + 10))}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 transition-colors cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn size={13} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsPreviewMode(false)}
            className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/80 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-all shadow-2xs cursor-pointer"
          >
            <Eye size={14} />
            <span className="hidden xs:inline">Exit</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1 px-3 sm:px-4 py-1.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md be-glow-primary transition-all cursor-pointer active:scale-95"
          >
            <Save size={14} />
            <span>Save</span>
          </button>
        </div>
      </header>
    );
  }

  // Normal Edit Mode Header
  return (
    <>
      <header className="sticky top-0 z-[100] flex items-center justify-between gap-1 sm:gap-2 px-1.5 sm:px-5 py-1.5 sm:py-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-all shadow-2xs select-none w-full overflow-visible">
        {/* Mobile: logo left, dropdown right — Desktop: both on left */}
        <div className="flex items-center justify-between md:justify-start md:gap-2 shrink-0 min-w-0 flex-1 md:flex-none">
          <div className="shrink-0 flex items-center">
            {/* Desktop & Tablet logo — hidden on mobile */}
            <img
              src={logo}
              alt="Editor Studio"
              className="hidden md:block toolbar-logo h-9 w-auto object-contain transition-all"
            />
            {/* Mobile logo — hidden on md+. Replace `logo` with `mobilelogo` once mobile-logo.png is added to src/assets/ */}
            <img
              src={logo}
              alt="Editor Studio"
              className="block md:hidden toolbar-logo h-8 w-auto object-contain transition-all"
            />
          </div>

          <div className="hidden md:block w-px h-5 bg-slate-200 dark:bg-slate-800 mx-0.5 sm:mx-1" />

          {renderPagesDropdown()}
        </div>

        <div className="hidden lg:flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 shrink-0">
          <Tooltip text="Desktop Canvas (1200px)" align="center">
            <button
              onClick={() => setDeviceView('desktop')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${deviceView === 'desktop'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              <Monitor size={20} />
            </button>
          </Tooltip>

          <Tooltip text="Tablet View (768px)" align="center">
            <button
              onClick={() => setDeviceView('tablet')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${deviceView === 'tablet'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              <Tablet size={20} />
            </button>
          </Tooltip>

          <Tooltip text="Mobile View (390px)" align="center">
            <button
              onClick={() => setDeviceView('mobile')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${deviceView === 'mobile'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              <Smartphone size={20} />
            </button>
          </Tooltip>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 justify-end shrink-0">
          <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shrink-0">
            <Tooltip text="Undo (⌘Z)" align="center">
              <button
                type="button"
                onClick={undo}
                disabled={past.length === 0}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition-all cursor-pointer"
              >
                <Undo2 size={20} />
              </button>
            </Tooltip>
            <Tooltip text="Redo (⌘Y)" align="center">
              <button
                type="button"
                onClick={redo}
                disabled={future.length === 0}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition-all cursor-pointer"
              >
                <Redo2 size={20} />
              </button>
            </Tooltip>
          </div>

          <Tooltip text={theme === 'dark' ? 'Light Mode' : 'Dark Mode'} align="center">
            <button
              type="button"
              onClick={toggleTheme}
              className="hidden md:flex p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            >
              {theme === 'dark' ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
            </button>
          </Tooltip>

          <Tooltip text="Export HTML" align="center">
            <button
              type="button"
              onClick={handleSaveHtml}
              className="hidden md:flex p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            >
              <FileDown size={20} />
            </button>
          </Tooltip>

          <Tooltip text="Preview Page" align="center">
            <button
              type="button"
              onClick={() => setIsPreviewMode(true)}
              className="hidden md:flex p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            >
              <Eye size={20} />
            </button>
          </Tooltip>

          <Tooltip text="Save (Ctrl+S)" align="center">
            <button
              type="button"
              onClick={handleSave}
              className="hidden md:flex p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            >
              <Save size={20} />
            </button>
          </Tooltip>

        </div>
      </header>

      {saveToast && (
        <div className="fixed bottom-6 right-6 z-[99999] flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-900/95 text-white dark:bg-slate-800/95 border border-slate-700 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{saveToast}</span>
        </div>
      )}

      {/* Rename Page Modal */}
      {renameModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setRenameModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-extrabold text-slate-800 dark:text-slate-100">
                <Edit3 size={16} className="text-blue-500" />
                <span>Rename Page</span>
              </div>
              <button
                type="button"
                onClick={() => setRenameModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRenameSubmit} className="space-y-4">
              <input
                type="text"
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="Enter page name..."
                className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenameModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!renameValue.trim()}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 transition-all shadow-md cursor-pointer"
                >
                  Save Name
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
