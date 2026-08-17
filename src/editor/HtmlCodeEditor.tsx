import { useState, useRef, useEffect } from 'react';
import { Code2, Eye, Copy, Check } from 'lucide-react';
import type { BlockInstance } from './types';
import { blockToHtmlCode } from './utils';
import { useEditorStore } from './store';
import { sanitizeHtmlString } from './paste/HTMLSanitizer';

interface HtmlCodeEditorProps {
  block: BlockInstance;
}

export default function HtmlCodeEditor({ block }: HtmlCodeEditorProps) {
  const updateBlocksFromHtml = useEditorStore((s) => s.updateBlocksFromHtml);

  const [code, setCode] = useState(() => blockToHtmlCode(block));
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setCode(blockToHtmlCode(block));
  }, [block]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReturnToVisual = () => {
    const sanitized = sanitizeHtmlString(code);
    updateBlocksFromHtml(block.id, sanitized);
  };

  const lines = code.split('\n');
  const lineCount = Math.max(1, lines.length);

  return (
    <div
      data-html-editor-for={block.id}
      className="be-html-code-editor relative group overflow-hidden border border-blue-500/30 dark:border-blue-400/30 rounded-2xl shadow-xl bg-slate-900 text-slate-100 my-3 w-full transition-all"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 select-none">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>

          <Code2 size={15} className="text-blue-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
            HTML Source Mode
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            title="Copy HTML Source"
          >
            {copied ? (
              <>
                <Check size={13} className="text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleReturnToVisual}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition-all cursor-pointer"
            title="Return to Visual Mode"
          >
            <Eye size={14} />
            <span>Visual Mode</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="relative flex overflow-x-auto p-4 font-mono text-sm leading-relaxed">
        {/* Line Numbers */}
        <div className="select-none text-right pr-4 mr-4 border-r border-slate-800 text-slate-500 shrink-0">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i + 1} className="leading-[1.625rem]">
              {i + 1}
            </div>
          ))}
        </div>

        {/* HTML Textarea */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="<!-- Type or paste HTML here -->"
          className="flex-1 bg-transparent border-0 outline-none resize-y min-h-[140px] w-full text-slate-100 placeholder-slate-600 focus:ring-0 p-0 font-mono text-sm leading-[1.625rem]"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
