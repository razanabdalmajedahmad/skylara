import type { ReactNode } from 'react';

export type PageEmptyProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function PageEmpty({ title, description, icon, action, className = '' }: PageEmptyProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40 px-6 py-12 text-center ${className}`}
    >
      {icon ? <div className="mb-4 text-gray-400">{icon}</div> : null}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm text-gray-600 dark:text-gray-400">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
