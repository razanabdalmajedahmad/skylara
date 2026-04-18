'use client';

import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';
import { RouteGuard, ROLE_GROUPS } from '@/components/RouteGuard';
import { Shield, Loader2, AlertTriangle, CheckCircle2, FileText, Clock } from 'lucide-react';

interface ComplianceAlert {
  id: number; athleteName: string; type: string;
  message: string; severity: 'warning' | 'block';
  createdAt: string;
}

function ComplianceContent() {
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const res = await apiGet('/safety/compliance-alerts');
        setAlerts(res?.data?.alerts ?? []);
      } catch { setAlerts([]); }
      finally { setLoading(false); }
    }
    fetch();
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center h-[60vh]">
      <Loader2 size={32} className="text-secondary-500 animate-spin" />
    </div>
  );

  const blocks = alerts.filter(a => a.severity === 'block');
  const warnings = alerts.filter(a => a.severity === 'warning');

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Compliance</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">
          {blocks.length} blocking issue{blocks.length !== 1 ? 's' : ''} · {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
        </p>

        {alerts.length === 0 ? (
          <div className="text-center py-16 text-emerald-500 dark:text-emerald-400">
            <CheckCircle2 size={48} strokeWidth={1.5} className="mb-4 mx-auto" />
            <p className="text-base font-semibold">All clear — no compliance alerts.</p>
          </div>
        ) : (
          <>
            {blocks.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-red-500 dark:text-red-400 mb-2.5 uppercase">Blocking</h2>
                <div className="flex flex-col gap-2">
                  {blocks.map(a => (
                    <div key={a.id} className="bg-white dark:bg-slate-800 rounded-xl p-3.5 border border-red-500/25 dark:border-red-400/25 flex items-start gap-3">
                      <AlertTriangle size={18} className="text-red-500 dark:text-red-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-semibold text-sm text-gray-900 dark:text-white">{a.athleteName}</div>
                        <div className="text-red-700 dark:text-red-300 text-[13px]">{a.type}: {a.message}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {warnings.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-amber-500 dark:text-amber-400 mb-2.5 uppercase">Warnings</h2>
                <div className="flex flex-col gap-2">
                  {warnings.map(a => (
                    <div key={a.id} className="bg-white dark:bg-slate-800 rounded-xl p-3.5 border border-gray-200 dark:border-slate-700 flex items-start gap-3">
                      <Clock size={18} className="text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-semibold text-sm text-gray-900 dark:text-white">{a.athleteName}</div>
                        <div className="text-amber-700 dark:text-amber-300 text-[13px]">{a.type}: {a.message}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function CompliancePage() {
  return <RouteGuard allowedRoles={[...ROLE_GROUPS.SAFETY, ...ROLE_GROUPS.OPERATIONS]}><ComplianceContent /></RouteGuard>;
}
