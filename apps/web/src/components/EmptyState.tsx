'use client';

import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {icon && (
        <div className="text-4xl mb-4">
          {icon}
        </div>
      )}

      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>

      {description && (
        <p className="text-gray-600 text-center max-w-md mb-6">{description}</p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
        >
          {action.label}
        </button>
      )}

      {children}
    </div>
  );
}
