'use client';

import { useState, ReactNode } from 'react';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => ReactNode;
  /** Hide this column in mobile card view. Default: false */
  hideOnMobile?: boolean;
  /** Use as the card title in mobile view. Only one column should set this. */
  cardTitle?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  loading?: boolean;
  /** Force a specific view mode instead of auto-detecting */
  viewMode?: 'table' | 'cards';
}

export function DataTable<T extends { id: string | number }>({
  data,
  columns,
  onRowClick,
  loading,
  viewMode,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const { isMobile } = useBreakpoint();

  const showCards = viewMode === 'cards' || (viewMode === undefined && isMobile);

  const handleSort = (key: keyof T) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedData = sortKey
    ? [...data].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];

        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
      })
    : data;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      </div>
    );
  }

  // Mobile card view
  if (showCards) {
    const titleCol = columns.find((c) => c.cardTitle) || columns[0];
    const detailCols = columns.filter((c) => c !== titleCol && !c.hideOnMobile);

    return (
      <div className="space-y-3">
        {sortedData.map((row) => (
          <div
            key={row.id}
            onClick={() => onRowClick?.(row)}
            className={`bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 shadow-sm ${
              onRowClick ? 'active:bg-gray-50 dark:active:bg-slate-700 cursor-pointer' : ''
            }`}
          >
            {/* Card title */}
            <div className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {titleCol.render
                ? titleCol.render(row[titleCol.key], row)
                : String(row[titleCol.key])}
            </div>

            {/* Card fields */}
            <div className="space-y-1.5">
              {detailCols.map((col) => (
                <div
                  key={String(col.key)}
                  className="flex items-start justify-between gap-2 text-sm"
                >
                  <span className="text-gray-500 dark:text-gray-400 shrink-0">
                    {col.label}
                  </span>
                  <span className="text-gray-900 dark:text-gray-100 text-right">
                    {col.render ? col.render(row[col.key], row) : String(row[col.key])}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Desktop table view
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                onClick={() => col.sortable && handleSort(col.key)}
              >
                <div className="flex items-center gap-2">
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    <span>{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, idx) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-gray-200 dark:border-slate-700 ${
                onRowClick ? 'hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer' : ''
              } ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-gray-50 dark:bg-slate-800'}`}
            >
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  className="px-6 py-4 text-gray-900 dark:text-gray-100"
                >
                  {col.render ? col.render(row[col.key], row) : String(row[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
