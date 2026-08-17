import { useState, useRef } from 'react';
import { Copy, Check, Code2, Lock } from 'lucide-react';
import type { BlockInstance } from '../types';
import { useEditorStore } from '../store';
import { fontFamilyStack } from '../typography';

export function detectLanguage(code: string): { key: string; label: string } {
  if (!code || !code.trim()) {
    return { key: 'plaintext', label: 'Plain Text' };
  }

  const str = code.trim();

  // 1. JSON
  if (
    (str.startsWith('{') && str.endsWith('}')) ||
    (str.startsWith('[') && str.endsWith(']'))
  ) {
    try {
      JSON.parse(str);
      return { key: 'json', label: 'JSON' };
    } catch {
      // Not strict JSON
    }
  }

  // 2. XML / HTML / TSX / JSX
  if (/^<\?xml/i.test(str)) {
    return { key: 'xml', label: 'XML' };
  }

  if (/<!DOCTYPE html>/i.test(str) || /<html[\s>]/i.test(str) || /<body[\s>]/i.test(str) || /<div|<span|<p/i.test(str)) {
    return { key: 'html', label: 'HTML' };
  }

  if (/^<[a-zA-Z0-9_\-\.\:]+/i.test(str) && /<\/[a-zA-Z0-9_\-\.\:]+>$/i.test(str)) {
    if (/\b(xmlns|version|encoding)=/i.test(str)) return { key: 'xml', label: 'XML' };
    return { key: 'html', label: 'HTML' };
  }

  // 3. PHP
  if (/<\?php/i.test(str) || /\$this->/i.test(str) || /echo\s+\$/i.test(str)) {
    return { key: 'php', label: 'PHP' };
  }

  // 4. SQL
  if (/\b(SELECT|INSERT|UPDATE|DELETE|CREATE TABLE|ALTER TABLE|DROP TABLE|WHERE|GROUP BY|ORDER BY|JOIN|LEFT JOIN|RIGHT JOIN|HAVING|UNION)\b/i.test(str)) {
    return { key: 'sql', label: 'SQL' };
  }

  // 5. Bash / Shell
  if (/^#!\/bin\/(bash|sh|zsh)/m.test(str) || /\b(echo|export|chmod|chown|mkdir|sudo|apt-get|npm run|npx|git checkout|git commit|curl|wget)\b/m.test(str)) {
    return { key: 'bash', label: 'Bash' };
  }

  // 6. Python
  if (/\bdef\s+\w+\s*\(|\bclass\s+\w+.*:|\bimport\s+\w+|\bfrom\s+\w+\s+import|\bprint\s*\(|\belif\b/m.test(str)) {
    return { key: 'python', label: 'Python' };
  }

  // 7. C#
  if (/\busing\s+System;|\bnamespace\s+\w+|\bpublic\s+class\s+\w+|\bConsole\.WriteLine/m.test(str)) {
    return { key: 'csharp', label: 'C#' };
  }

  // 8. C++
  if (/#include\s*<|std::cout|std::endl|std::vector|int main\s*\(/m.test(str)) {
    return { key: 'cpp', label: 'C++' };
  }

  // 9. Java
  if (/\bpublic\s+class\s+\w+|\bpublic\s+static\s+void\s+main|\bSystem\.out\.println|\bimport\s+java\./m.test(str)) {
    return { key: 'java', label: 'Java' };
  }

  // 10. YAML
  if (/^---\s*$/m.test(str) || (/^\w+:\s*.+$/m.test(str) && !str.includes('{') && !str.includes(';'))) {
    if (/^\s*-\s+\w+/m.test(str) || /^\w+:\s*$/m.test(str)) {
      return { key: 'yaml', label: 'YAML' };
    }
  }

  // 11. CSS / SCSS
  if (/[\.\#]\w+\s*\{[^}]*\}|\b(margin|padding|background|color|display|flex|grid|border-radius):\s*[^;]+;/m.test(str)) {
    if (/\$\w+:\s*[^;]+;|\&\:\w+|\@mixin|\@include/m.test(str)) {
      return { key: 'scss', label: 'SCSS' };
    }
    return { key: 'css', label: 'CSS' };
  }

  // 12. Markdown
  if (/^#+\s+\w+|^\[.+\]\(.+\)|^```\w*/m.test(str)) {
    return { key: 'markdown', label: 'Markdown' };
  }

  // 13. TSX / JSX / TypeScript / JavaScript
  const hasJSX = /<[A-Z]\w*[^>]*>|<[a-z]+\s+className=|<React\./m.test(str);
  const hasTS = /:\s*(string|number|boolean|any|void|never|unknown|React\.ReactNode)\b|\binterface\s+\w+|\btype\s+\w+\s*=|\bas\s+\w+/m.test(str);

  if (hasJSX && hasTS) return { key: 'tsx', label: 'TSX' };
  if (hasJSX) return { key: 'jsx', label: 'JSX' };
  if (hasTS) return { key: 'typescript', label: 'TypeScript' };

  if (/\b(const|let|var|function|return|import|export|if|else|for|while|switch|case|async|await)\b/m.test(str)) {
    return { key: 'javascript', label: 'JavaScript' };
  }

  return { key: 'plaintext', label: 'Plain Text' };
}

interface BlockProps {
  block: BlockInstance;
  selected: boolean;
}

export function CodeBlock({ block }: BlockProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const a = block.attributes;

  const content = (a.content as string) ?? '';
  const detected = detectLanguage(content);
  const languageLabel = (a.language as string) || detected.label;

  const showLineNumbers = a.showLineNumbers !== false;
  const wrapLines = Boolean(a.wrapLines);
  const showCopyButton = a.showCopyButton !== false;
  const showHeader = a.showHeader !== false;
  const readOnly = Boolean(a.readOnly);
  const tabSize = typeof a.tabSize === 'number' ? a.tabSize : 2;

  // Typography
  const fontFamily = (a.fontFamily as string) || 'firacode';
  const fontSize = (a.fontSize as number) || 14;
  const lineHeight = (a.lineHeight as number) || 1.6;
  const letterSpacing = (a.letterSpacing as number) || 0;

  // Appearance
  const bgColor = (a.backgroundColor as string) || '#0f172a';
  const textColor = (a.textColor as string) || '#f8fafc';
  const borderColor = (a.borderColor as string) || '#1e293b';
  const radiusNum = typeof a.borderRadius === 'number' ? a.borderRadius : parseInt(String(a.borderRadius || 12), 10);
  const borderRadius = isNaN(radiusNum) ? '12px' : `${radiusNum}px`;
  const padding = typeof a.padding === 'number' ? `${a.padding}px` : (a.padding as string) || '16px';
  const marginTop = typeof a.marginTop === 'number' ? `${a.marginTop}px` : (a.marginTop as string) || '12px';
  const marginBottom = typeof a.marginBottom === 'number' ? `${a.marginBottom}px` : (a.marginBottom as string) || '12px';
  const shadow = (a.shadow as string) || 'md';

  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const lines = content.split('\n');
  const lineCount = Math.max(1, lines.length);

  const shadowClasses: Record<string, string> = {
    none: 'shadow-none',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
    '2xl': 'shadow-2xl',
  };

  const handleCopy = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const spaces = ' '.repeat(tabSize);

      const nextVal = content.substring(0, start) + spaces + content.substring(end);
      const det = detectLanguage(nextVal);

      updateBlock(block.id, (b) => ({
        ...b,
        attributes: {
          ...b.attributes,
          content: nextVal,
          language: det.label,
          languageKey: det.key,
        },
      }));

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + spaces.length;
        }
      }, 0);
    }
  };

  const textStyle: React.CSSProperties = {
    fontFamily: fontFamilyStack(fontFamily),
    fontSize: `${fontSize}px`,
    lineHeight: lineHeight,
    letterSpacing: `${letterSpacing}px`,
    color: textColor,
    whiteSpace: wrapLines ? 'pre-wrap' : 'pre',
    wordBreak: wrapLines ? 'break-word' : 'normal',
    tabSize,
    MozTabSize: tabSize,
  };

  return (
    <div
      id={(a.customId as string) || undefined}
      className={`be-code-block relative group overflow-hidden border transition-all ${shadowClasses[shadow] || 'shadow-md'} ${(a.customCssClass as string) || ''}`}
      style={{
        backgroundColor: bgColor,
        borderColor: borderColor,
        borderRadius: borderRadius,
        marginTop,
        marginBottom,
      }}
    >
      {/* Read-Only Header Bar with Auto Detected Language Badge */}
      {showHeader && (
        <div className="flex items-center justify-between px-4 py-2 border-b bg-black/25 select-none" style={{ borderColor }}>
          <div className="flex items-center gap-2">
            {/* Window control dots */}
            <div className="flex items-center gap-1.5 mr-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>

            <Code2 size={15} className="text-primary-400" />
            {/* Read-Only Language Badge */}
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-300 select-none pointer-events-none">
              {languageLabel}
            </span>

            {readOnly && (
              <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Lock size={10} /> Read Only
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {showCopyButton && (
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-gray-200 transition-all cursor-pointer shadow-2xs border border-white/10"
                title="Copy code to clipboard"
              >
                {copied ? (
                  <>
                    <Check size={13} className="text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Code Editor Workspace */}
      <div className="relative flex overflow-x-auto" style={{ padding }}>
        {/* Line Numbers Gutter */}
        {showLineNumbers && (
          <div
            className="select-none text-right pr-3.5 mr-3 border-r border-white/10 text-gray-500 font-mono shrink-0 sticky left-0 z-10"
            style={{
              fontFamily: textStyle.fontFamily,
              fontSize: textStyle.fontSize,
              lineHeight: textStyle.lineHeight,
              letterSpacing: textStyle.letterSpacing,
            }}
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i + 1} className="leading-[inherit]">
                {i + 1}
              </div>
            ))}
          </div>
        )}

        {/* Text Area Code Input */}
        <textarea
          ref={textareaRef}
          value={content}
          readOnly={readOnly}
          onChange={(e) => {
            const val = e.target.value;
            const det = detectLanguage(val);
            updateBlock(block.id, (b) => ({
              ...b,
              attributes: {
                ...b.attributes,
                content: val,
                language: det.label,
                languageKey: det.key,
              },
            }));
          }}
          onKeyDown={handleKeyDown}
          placeholder="// Type or paste code snippet here..."
          className="flex-1 bg-transparent border-0 outline-none resize-y min-h-[100px] w-full focus:ring-0 p-0"
          style={textStyle}
          spellCheck={false}
        />

        {/* Float copy button if header is hidden */}
        {!showHeader && showCopyButton && (
          <button
            type="button"
            onClick={handleCopy}
            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 shadow-md cursor-pointer z-20"
            title="Copy Code"
          >
            {copied ? (
              <>
                <Check size={13} className="text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copy</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
