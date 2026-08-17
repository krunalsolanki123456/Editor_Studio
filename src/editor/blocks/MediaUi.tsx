import type { ReactNode } from 'react';

export const mediaSurfaceClassName = 'overflow-hidden rounded-2xl border border-gray-200/80 bg-gradient-to-br from-white to-gray-50 shadow-sm dark:border-gray-700 dark:from-gray-900 dark:to-gray-800';
export const mediaInputClassName = 'w-full flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500';
export const mediaTagClassName = 'rounded-full bg-white px-2.5 py-1 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700';
export const mediaPrimaryButtonClassName = 'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60';
export const mediaSecondaryButtonClassName = 'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800';

export function MediaPanel({
  icon, title, description, children, footer,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className={mediaSurfaceClassName}>
      <div className="flex items-start gap-4 border-b border-gray-200/70 px-5 py-4 dark:border-gray-700">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 ring-1 ring-primary-100 dark:bg-primary-500/10 dark:text-primary-300 dark:ring-primary-500/20">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</p>
          <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>
      <div className="space-y-4 px-5 py-5">
        {children}
        {footer}
      </div>
    </div>
  );
}

export function MediaFrame({
  children,
  ratio = '16 / 9',
  className = '',
}: {
  children: ReactNode;
  ratio?: string;
  className?: string;
}) {
  return (
    <div
      className={`${mediaSurfaceClassName} ${className}`}
      style={ratio ? { aspectRatio: ratio } : undefined}
    >
      {children}
    </div>
  );
}

