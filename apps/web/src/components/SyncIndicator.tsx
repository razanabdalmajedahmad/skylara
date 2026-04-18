/**
 * PHASE 5: OFFLINE-FIRST LOGIC
 * UI component: Sync status indicator
 * Shows online/offline status, pending actions, last sync time
 * Positioned bottom-left to avoid overlap with PortalAssistant (bottom-right)
 */

import React, { useState } from 'react';
import { useOfflineStatus, useManualSync } from '../hooks/useOffline';
import { RefreshCw, Wifi, WifiOff, AlertTriangle, Check } from 'lucide-react';

interface SyncIndicatorProps {
  position?: 'bottom' | 'top' | 'bottom-left';
}

export function SyncIndicator({ position = 'bottom-left' }: SyncIndicatorProps) {
  const status = useOfflineStatus();
  const { sync, syncing } = useManualSync();
  const [expanded, setExpanded] = useState(false);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getStatusConfig = () => {
    if (!status.isOnline) return {
      bg: 'bg-red-500',
      icon: WifiOff,
      text: `Offline · ${status.pendingActions} pending`,
    };
    if (status.conflicts > 0) return {
      bg: 'bg-orange-500',
      icon: AlertTriangle,
      text: `${status.conflicts} conflicts`,
    };
    if (status.pendingActions > 0) return {
      bg: 'bg-amber-500',
      icon: RefreshCw,
      text: `${status.pendingActions} pending`,
    };
    return {
      bg: 'bg-green-500',
      icon: Check,
      text: 'Synced',
    };
  };

  const positionClass = position === 'bottom-left'
    ? 'bottom-4 left-4 lg:left-[calc(16rem+1rem)]'
    : position === 'top'
      ? 'top-4 right-4'
      : 'bottom-4 right-4';

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  return (
    <div className={`fixed ${positionClass} z-30`}>
      {expanded && (
        <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 w-64 border border-gray-200 dark:border-slate-700">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-3">Sync Status</h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Status</span>
              <span className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                {status.isOnline ? (
                  <><Wifi size={12} className="text-green-500" /> Online</>
                ) : (
                  <><WifiOff size={12} className="text-red-500" /> Offline</>
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Last Sync</span>
              <span className="text-gray-700 dark:text-gray-300">{formatTime(status.lastSync)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Pending</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{status.pendingActions}</span>
            </div>
            {status.conflicts > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Conflicts</span>
                <span className="font-medium text-orange-600 dark:text-orange-400">{status.conflicts}</span>
              </div>
            )}
            <button
              onClick={sync}
              disabled={syncing || !status.isOnline}
              className="mt-2 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className={`${config.bg} text-white rounded-full px-3.5 py-2 text-xs font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2`}
      >
        <StatusIcon size={14} className={syncing ? 'animate-spin' : ''} />
        {config.text}
      </button>
    </div>
  );
}

export default SyncIndicator;
