import type { ReactNode } from 'react';
import { Spinner } from './spinner';

export type PageLoadingProps = {
  message?: string;
  children?: ReactNode;
  className?: string;
};

/** Full-viewport loading shell — matches dashboard auth gate pattern. */
export function PageLoading({
  message = 'Loading SkyLara...',
  children,
  className = '',
}: PageLoadingProps) {
  return (
    <div
      className={`flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-950 ${className}`}
    >
      <div className="text-center">
        <Spinner size="md" label={message} aria-label={message} />
        {children}
      </div>
    </div>
  );
}
