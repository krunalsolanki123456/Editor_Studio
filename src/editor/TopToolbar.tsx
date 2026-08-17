import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FileDown, Eye, X, Monitor, Tablet, Smartphone, Search, Code, Copy, Check,
} from 'lucide-react';
import { useEditorStore } from './store';
import { exportHtml } from './exporter';
import logo from "../assets/logo-Editor-Studio.png";

export interface TopToolbarProps {
  onOpenInserter?: () => void;
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
    <div className="relative group inline-flex items-center">
      {children}
      <div className={`absolute top-full mt-1.5 ${alignClasses} hidden group-hover:flex flex-col items-center pointer-events-none z-[110]`}>
        <div className={`w-2 h-2 bg-gray-900 dark:bg-gray-800 rotate-45 -mb-1 shadow-xs border-t border-l border-gray-700/50 ${arrowAlignClasses}`} />
        <span className="px-2.5 py-1 text-[11px] font-medium text-white bg-gray-900 dark:bg-gray-800 rounded-lg shadow-xl border border-gray-700/50 whitespace-nowrap">
          {text}
        </span>
      </div>
    </div>
  );
}

export default function TopToolbar({ onOpenInserter: _onOpenInserter }: TopToolbarProps) {
  const blocks = useEditorStore((s) => s.blocks);
  const documentTitle = useEditorStore((s) => s.documentTitle);
  const deviceView = useEditorStore((s) => s.deviceView);
  const setDeviceView = useEditorStore((s) => s.setDeviceView);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState<'visual' | 'code'>('visual');
  const [copied, setCopied] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');

  const handleSaveHtml = () => {
    const html = exportHtml(blocks);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${documentTitle || 'page'}-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderActionControls = () => (
    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
      {/* 1. Expandable Search Input / Button */}
      {searchOpen ? (
        <div className="relative flex items-center transition-all duration-200 ease-out">
          <Search size={14} className="absolute left-2.5 text-primary-600 dark:text-primary-400 pointer-events-none" />
          <input
            type="text"
            autoFocus
            value={headerSearch}
            onChange={(e) => setHeaderSearch(e.target.value)}
            placeholder="Search..."
            className="w-28 sm:w-44 md:w-48 lg:w-56 pl-8 pr-7 py-1 text-xs bg-gray-50 dark:bg-gray-800 border border-primary-500/80 rounded-xl text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none shadow-xs focus:ring-2 focus:ring-primary-500/20"
          />
          <button
            type="button"
            onClick={() => {
              setHeaderSearch('');
              setSearchOpen(false);
            }}
            className="absolute right-1.5 p-0.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            title="Close Search"
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <Tooltip text="Search" align="center">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="p-1.5 sm:p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-all cursor-pointer"
          >
            <Search size={17} />
          </button>
        </Tooltip>
      )}

      {/* 2. Full Page Preview Button */}
      <Tooltip text="Full Page Preview" align="center">
        <button
          onClick={() => { setPreviewTab('visual'); setPreviewOpen(true); }}
          className="p-1.5 sm:p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-all cursor-pointer"
        >
          <Eye size={17} />
        </button>
      </Tooltip>

      {/* 3. View HTML Code Button */}
      <Tooltip text="View HTML Code" align="center">
        <button
          onClick={() => { setPreviewTab('code'); setPreviewOpen(true); }}
          className="p-1.5 sm:p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-all cursor-pointer"
        >
          <Code size={17} />
        </button>
      </Tooltip>

      {/* 4. Save as HTML / Download Button */}
      <Tooltip text="Save as HTML" align="center">
        <button onClick={handleSaveHtml} className="p-1.5 sm:p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-all cursor-pointer">
          <FileDown size={17} />
        </button>
      </Tooltip>

      <div className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-0.5" />

      {/* Device Viewport Toggle Buttons */}
      <div className="flex items-center gap-0.5 bg-gray-100/70 dark:bg-gray-800/50 p-0.5 sm:p-1 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
        <Tooltip text="Desktop View" align="center">
          <button
            onClick={() => setDeviceView('desktop')}
            className={`p-1 sm:p-1.5 rounded-lg transition-all cursor-pointer ${deviceView === 'desktop'
              ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/70 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/80 shadow-2xs'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
          >
            <Monitor size={16} />
          </button>
        </Tooltip>

        <Tooltip text="Tablet View" align="center">
          <button
            onClick={() => setDeviceView('tablet')}
            className={`p-1 sm:p-1.5 rounded-lg transition-all cursor-pointer ${deviceView === 'tablet'
              ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/70 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/80 shadow-2xs'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
          >
            <Tablet size={16} />
          </button>
        </Tooltip>

        <Tooltip text="Mobile View" align="center">
          <button
            onClick={() => setDeviceView('mobile')}
            className={`p-1 sm:p-1.5 rounded-lg transition-all cursor-pointer ${deviceView === 'mobile'
              ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/70 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/80 shadow-2xs'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
          >
            <Smartphone size={16} />
          </button>
        </Tooltip>
      </div>
    </div>
  );

  return (
    <header className="sticky top-0 z-50 flex flex-col md:flex-row md:items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200/80 dark:border-gray-800/80 transition-all">
      {/* Top Main Row for Mobile / Single Row for Desktop */}
      <div className="flex items-center justify-between w-full md:w-auto gap-2">
        {/* Logo */}
        <div className="md:w-72 shrink-0 flex items-center">
          <div className="w-32 shrink-0">
            <img
              src={logo}
              alt="Editor Studio"
              className="toolbar-logo"
            />
          </div>
        </div>

        {/* Action Controls on Mobile (<= 767px) */}
        <div className="flex md:hidden items-center">
          {renderActionControls()}
        </div>
      </div>

      {/* Action Controls on Desktop (>= 768px) */}
      <div className="hidden md:flex items-center gap-2">
        {renderActionControls()}
      </div>

      {previewOpen && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/70 p-4 sm:p-6 backdrop-blur-md" onClick={() => setPreviewOpen(false)}>
          <div className="flex h-[min(880px,92vh)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-950 border border-gray-200 dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-300 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-6 py-3 flex-wrap gap-3">
              {/* Tab Switcher: Visual Preview vs HTML Code */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-gray-200 dark:bg-gray-800 p-1 rounded-xl border border-gray-300/60 dark:border-gray-700">
                  <button
                    onClick={() => setPreviewTab('visual')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${previewTab === 'visual'
                        ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                  >
                    <Eye size={15} />
                    <span>Visual Preview</span>
                  </button>

                  <button
                    onClick={() => setPreviewTab('code')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${previewTab === 'code'
                        ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                  >
                    <Code size={15} />
                    <span>View HTML Code</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Visual Preview Device Viewport Switcher */}
                {previewTab === 'visual' && (
                  <div className="flex items-center bg-gray-200/80 dark:bg-gray-800 p-1 rounded-xl shadow-inner border border-gray-300/50 dark:border-gray-700">
                    <button
                      onClick={() => setDeviceView('desktop')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${deviceView === 'desktop'
                        ? 'bg-white dark:bg-gray-900 text-primary-600 dark:text-primary-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                      title="Desktop Preview (1200px)"
                    >
                      <Monitor size={15} />
                      <span>Desktop</span>
                    </button>

                    <button
                      onClick={() => setDeviceView('tablet')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${deviceView === 'tablet'
                        ? 'bg-white dark:bg-gray-900 text-primary-600 dark:text-primary-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                      title="Tablet Preview (768px)"
                    >
                      <Tablet size={15} />
                      <span>Tablet</span>
                    </button>

                    <button
                      onClick={() => setDeviceView('mobile')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${deviceView === 'mobile'
                        ? 'bg-white dark:bg-gray-900 text-primary-600 dark:text-primary-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                      title="Mobile Preview (390px)"
                    >
                      <Smartphone size={15} />
                      <span>Mobile</span>
                    </button>
                  </div>
                )}

                {/* HTML Code Copy & Download Actions */}
                {previewTab === 'code' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const fullHtml = exportHtml(blocks, documentTitle);
                        navigator.clipboard.writeText(fullHtml);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copied ? 'Copied to Clipboard!' : 'Copy HTML Code'}</span>
                    </button>

                    <button
                      onClick={handleSaveHtml}
                      className="px-3 py-1.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileDown size={14} />
                      <span>Download</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setPreviewOpen(false)}
                  className="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 bg-gray-200/60 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  title="Close preview"
                  aria-label="Close preview"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="min-h-0 flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 p-4 flex justify-center items-center">
              {previewTab === 'visual' ? (
                <div
                  className={`h-full transition-all duration-300 ease-out bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-800 ${deviceView === 'mobile'
                    ? 'w-[390px] max-w-full'
                    : deviceView === 'tablet'
                      ? 'w-[768px] max-w-full'
                      : 'w-full max-w-[1200px]'
                    }`}
                >
                  <iframe
                    title="Full page preview"
                    srcDoc={exportHtml(blocks, documentTitle)}
                    className="w-full h-full border-0"
                  />
                </div>
              ) : (
                /* CODE VIEWER BOX */
                <div className="w-full h-full max-w-[1200px] flex flex-col bg-[#0f172a] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden p-4">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-xs font-mono text-slate-400 ml-2">
                        {documentTitle || 'index'}.html — Produced HTML Output
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        const fullHtml = exportHtml(blocks, documentTitle);
                        navigator.clipboard.writeText(fullHtml);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                    </button>
                  </div>

                  <pre className="flex-1 overflow-auto font-mono text-xs text-blue-300 bg-slate-950 p-4 rounded-xl border border-slate-800/80 leading-relaxed select-all whitespace-pre-wrap break-all">
                    {exportHtml(blocks, documentTitle)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
