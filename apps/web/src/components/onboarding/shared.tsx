'use client';

import { Search, CheckCircle2, XCircle, X, Info, Bell, Mail, MessageSquare, Smartphone, Globe } from 'lucide-react';
import type { StatusColor, FilterChip } from '@/lib/onboarding/types';

export function StatusBadge({ status, label }: { status: StatusColor | string; label?: string }) {
  const colorMap: Record<string, string> = {
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    COMPLETED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    DRAFT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    PAUSED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    SCHEDULED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    OPENED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    BOUNCED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    SENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    READ: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    EXPIRED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };
  const defaultLabels: Record<string, string> = { green: 'Complete', yellow: 'Pending', red: 'Missing', blue: 'In Progress', gray: 'N/A', orange: 'Warning', purple: 'Review' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${colorMap[status] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>{label ?? defaultLabels[status] ?? status}</span>;
}

export function PercentBadge({ value }: { value: number }) {
  const color = value >= 90 ? 'text-green-600 dark:text-green-400' : value >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400';
  return <span className={`font-semibold text-sm ${color}`}>{value}%</span>;
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const bg = value >= 90 ? 'bg-green-500' : value >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 ${className ?? ''}`}>
      <div className={`${bg} h-2 rounded-full transition-all duration-300`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

export function BoolIcon({ value }: { value: boolean }) {
  return value ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-400" />;
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? 'Search...'} className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  );
}

export function FilterChips({ chips, active, onToggle }: { chips: FilterChip[]; active: string; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <button key={c.value} onClick={() => onToggle(c.value)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${active === c.value ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>{c.label}</button>
      ))}
    </div>
  );
}

export function EmptyState({ message, icon }: { message: string; icon?: React.ReactNode }) {
  return (
    <div className="text-center py-12">
      {icon || <Info className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />}
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}

export function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function ChannelIcon({ channel }: { channel: string }) {
  switch (channel) {
    case 'EMAIL': return <Mail className="w-4 h-4 text-blue-500" />;
    case 'WHATSAPP': return <MessageSquare className="w-4 h-4 text-green-500" />;
    case 'PUSH': return <Smartphone className="w-4 h-4 text-purple-500" />;
    case 'IN_APP': return <Bell className="w-4 h-4 text-orange-500" />;
    default: return <Globe className="w-4 h-4 text-gray-500" />;
  }
}

export function ToastContainer({ toasts, onDismiss }: { toasts: { id: string; message: string; type: 'success' | 'error' | 'info' }[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => {
        const bg = t.type === 'success' ? 'bg-green-600' : t.type === 'error' ? 'bg-red-600' : 'bg-blue-600';
        return (
          <div key={t.id} className={`${bg} text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between gap-3 text-sm`}>
            <span>{t.message}</span>
            <button onClick={() => onDismiss(t.id)} className="flex-shrink-0 hover:opacity-80"><X className="w-4 h-4" /></button>
          </div>
        );
      })}
    </div>
  );
}

export interface SubTab { id: string; label: string; icon?: React.ReactNode; count?: number }

export function SubTabs({ tabs, active, onSwitch }: { tabs: SubTab[]; active: string; onSwitch: (id: string) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-px mb-4 border-b border-gray-200 dark:border-gray-700 scrollbar-hide">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onSwitch(t.id)}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap rounded-t-lg transition-colors ${
            active === t.id
              ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-b-0 border-gray-200 dark:border-gray-700 -mb-px'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
          }`}
        >
          {t.icon}
          {t.label}
          {t.count !== undefined && (
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${active === t.id ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'}`}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function PageLoading({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{label || 'Loading...'}</p>
      </div>
    </div>
  );
}
