import type { ReactNode } from 'react';

export type PageErrorProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  children?: ReactNode;
  className?: string;
};

export function PageError({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
  children,
  className = '',
}: PageErrorProps) {
  return (
    <div
      className={`rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/80 dark:bg-red-950/30 px-6 py-8 text-center ${className}`}
      role="alert"
    >
      <h3 className="text-lg font-semibold text-red-900 dark:text-red-200">{title}</h3>
      <p className="mt-2 text-sm text-red-800 dark:text-red-300/90">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg bg-[#1B4F72] px-4 py-2 text-sm font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:ring-offset-2 dark:focus:ring-offset-slate-900"
        >
          {retryLabel}
        </button>
      ) : null}
      {children}
    </div>
  );
}
