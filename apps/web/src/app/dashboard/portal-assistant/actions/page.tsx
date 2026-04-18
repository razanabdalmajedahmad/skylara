'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost } from '@/lib/api';
import { PortalAssistantNav } from '../page';
import { useRouter } from 'next/navigation';
import {
  Zap,
  Search,
  UserPlus,
  Users,
  ClipboardList,
  Plane,
  ArrowRightLeft,
  Eye,
  AlertTriangle,
  FileWarning,
  Wrench,
  Calendar,
  ClipboardCheck,
  FileText,
  GraduationCap,
  ScrollText,
  Loader2,
  ArrowRight,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface QuickAction {
  id: string;
  category: string;
  title: string;
  description: string;
  route: string;
  icon: React.ElementType;
}

/* ------------------------------------------------------------------ */
/*  Category colors                                                    */
/* ------------------------------------------------------------------ */

const CATEGORY_COLORS: Record<string, string> = {
  Onboarding: 'border-l-emerald-500',
  Manifest: 'border-l-blue-500',
  Safety: 'border-l-red-500',
  Events: 'border-l-purple-500',
  Admin: 'border-l-amber-500',
};

const CATEGORY_BG: Record<string, string> = {
  Onboarding: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  Manifest: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Safety: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  Events: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  Admin: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

/* ------------------------------------------------------------------ */
/*  Actions data                                                       */
/* ------------------------------------------------------------------ */

const ACTIONS: QuickAction[] = [
  // Onboarding
  { id: 'a-01', category: 'Onboarding', title: 'Start Athlete Onboarding', description: 'Register a new athlete and guide them through check-in, waiver, and profile setup.', route: '/dashboard/onboarding', icon: UserPlus },
  { id: 'a-02', category: 'Onboarding', title: 'Start Tandem Onboarding', description: 'Quick tandem customer registration for walk-ins with waiver and payment flow.', route: '/dashboard/onboarding', icon: Users },
  { id: 'a-03', category: 'Onboarding', title: 'Create Student Record', description: 'Set up an AFF student profile with course enrollment and level tracking.', route: '/dashboard/onboarding', icon: GraduationCap },
  // Manifest
  { id: 'a-04', category: 'Manifest', title: 'Create Load', description: 'Open a new load with aircraft, altitude, and slot configuration.', route: '/dashboard/manifest', icon: ClipboardList },
  { id: 'a-05', category: 'Manifest', title: 'Move Jumper', description: 'Reassign a jumper from one load to another while maintaining slot integrity.', route: '/dashboard/manifest', icon: ArrowRightLeft },
  { id: 'a-06', category: 'Manifest', title: 'View Boarding Loads', description: 'See all loads currently in BOARDING status with jumper details.', route: '/dashboard/manifest', icon: Eye },
  // Safety
  { id: 'a-07', category: 'Safety', title: 'Open Incident Report', description: 'File a new safety incident report with severity, timeline, and involved parties.', route: '/dashboard/incidents/new', icon: AlertTriangle },
  { id: 'a-08', category: 'Safety', title: 'Review Missing Waivers', description: 'Check which checked-in athletes have unsigned or expired waivers.', route: '/dashboard/waivers', icon: FileWarning },
  { id: 'a-09', category: 'Safety', title: 'Check Gear Status', description: 'View gear inspection status, repack dates, and flagged equipment.', route: '/dashboard/gear', icon: Wrench },
  // Events
  { id: 'a-10', category: 'Events', title: 'Create Event', description: 'Set up a new boogie or special event with registration and scheduling.', route: '/dashboard/boogies/new', icon: Calendar },
  { id: 'a-11', category: 'Events', title: 'Review Registrations', description: 'Process and approve pending event registrations and payments.', route: '/dashboard/boogies', icon: ClipboardCheck },
  // Admin
  { id: 'a-12', category: 'Admin', title: 'Review Expiring Documents', description: 'View documents expiring within 30 days including licenses and medical forms.', route: '/dashboard/documents', icon: FileText },
  { id: 'a-13', category: 'Admin', title: 'Coach Applications', description: 'Review and approve pending coach and instructor applications.', route: '/dashboard/admin/onboarding/coaches', icon: GraduationCap },
  { id: 'a-14', category: 'Admin', title: 'View Audit Trail', description: 'Browse the system audit log for recent changes and administrative actions.', route: '/dashboard/reports', icon: ScrollText },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function QuickActionsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const categories = useMemo(() => Array.from(new Set(ACTIONS.map((a) => a.category))), []);

  const filtered = useMemo(() => {
    let items = ACTIONS;
    if (filterCategory) {
      items = items.filter((a) => a.category === filterCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q)
      );
    }
    return items;
  }, [filterCategory, searchQuery]);

  const grouped = useMemo(() => {
    const map: Record<string, QuickAction[]> = {};
    for (const a of filtered) {
      if (!map[a.category]) map[a.category] = [];
      map[a.category].push(a);
    }
    return map;
  }, [filtered]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <PortalAssistantNav current="/dashboard/portal-assistant/actions" />

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Quick Actions</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Launch common operations with one click
      </p>

      {/* Search and filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter actions..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-white dark:bg-slate-800 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterCategory(null)}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              !filterCategory
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-200 dark:border-slate-700 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(filterCategory === cat ? null : cat)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                filterCategory === cat
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-200 dark:border-slate-700 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Zap className="w-12 h-12 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No actions match your filter</p>
        </div>
      )}

      {/* Grouped actions */}
      {Object.entries(grouped).map(([category, actions]) => (
        <div key={category} className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_BG[category] || 'bg-gray-100 text-gray-600 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-300'}`}>
              {category}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400">{actions.length} action{actions.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <div
                  key={action.id}
                  className={`bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 border-l-4 ${CATEGORY_COLORS[action.category] || 'border-l-gray-400'} p-5 flex flex-col`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400 dark:text-gray-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white">{action.title}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{action.description}</p>
                    </div>
                  </div>
                  <div className="mt-auto pt-3">
                    <button
                      onClick={() => router.push(action.route)}
                      className="flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                    >
                      Launch <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
