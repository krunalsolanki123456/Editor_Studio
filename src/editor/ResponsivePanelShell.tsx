import type { ReactNode } from 'react';

interface ResponsivePanelShellProps {
  open: boolean;
  side: 'left' | 'right';
  onClose: () => void;
  children: ReactNode;
  widthClassName?: string;
  className?: string;
  overlayClassName?: string;
  mobileSheet?: boolean;
}

export default function ResponsivePanelShell({
  open,
  side,
  onClose,
  children,
  widthClassName = 'w-[min(18rem,calc(100vw-1rem))] xl:w-72',
  className = '',
  overlayClassName = '',
  mobileSheet = true,
}: ResponsivePanelShellProps) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop Overlay — only on screens below 576px (bottom sheet mode) */}
      {mobileSheet && (
        <div
          className={`fixed inset-0 z-[190] bg-black/60 backdrop-blur-xs xs:hidden ${overlayClassName}`}
          onClick={onClose}
        />
      )}

      <aside
        className={`
          flex h-full min-h-0 flex-col overflow-hidden shrink-0
          bg-white dark:bg-gray-900
          border-gray-200/80 dark:border-gray-800/80
          ${
            mobileSheet
              ? /* < 576px: bottom sheet  |  576px+: side panel */
                'max-xs:fixed max-xs:inset-x-0 max-xs:bottom-0 max-xs:top-auto max-xs:h-[82vh] max-xs:max-h-[88vh] max-xs:w-full max-xs:rounded-t-3xl max-xs:border-t max-xs:z-[200] max-xs:shadow-2xl max-xs:animate-in max-xs:slide-in-from-bottom max-xs:duration-300'
              : /* Fallback side drawer for all sizes */
                `max-xs:fixed max-xs:inset-y-0 max-xs:h-dvh max-xs:z-[200] max-xs:shadow-2xl ${side === 'left' ? 'max-xs:left-0' : 'max-xs:right-0'}`
          }
          /* 576px+ : static flex child, pushes canvas */
          xs:relative xs:z-30 xs:shadow-none xs:h-full xs:w-72 xs:shrink-0
          ${side === 'left' ? 'xs:border-r' : 'xs:border-l'}
          ${className}
        `}
      >
        {/* Pull Handle — only visible below 576px (bottom sheet mode) */}
        {mobileSheet && (
          <div
            className="w-full flex items-center justify-center pt-2.5 pb-1 xs:hidden shrink-0 cursor-pointer"
            onClick={onClose}
          >
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
          </div>
        )}
        {children}
      </aside>
    </>
  );
}
