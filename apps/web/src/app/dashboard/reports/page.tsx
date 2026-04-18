'use client';

import { useState, useEffect } from 'react';
import { Download, FileText, Printer, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { apiGet, getAuthToken } from '@/lib/api';
import { API_BASE_URL } from '@/lib/constants';
import { RouteGuard, ROLE_GROUPS } from '@/components/RouteGuard';
import { logger } from '@/lib/logger';

type ReportTab = 'operations' | 'safety' | 'training' | 'waivers' | 'instructors' | 'gear';

interface LoadRecord {
  id: string;
  aircraft: string;
  status: 'COMPLETE' | 'AIRBORNE' | 'BOARDING' | 'LOCKED' | 'FILLING' | 'OPEN';
  slots: number;
  weight: number;
  departure: string;
  duration: number;
}

interface Jumper {
  name: string;
  jumps: number;
  revenue: number;
  type: string;
}

interface PaymentMethod {
  method: string;
  amount: number;
  percent: number;
}

const EmptyState = ({ message }: { message?: string }) => (
  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-12 text-center">
    <p className="text-gray-500 dark:text-gray-400">{message || 'No data available for this period'}</p>
  </div>
);

export default function ReportsPage() {
  const [period, setPeriod] = useState('Today');
  const [activeTab, setActiveTab] = useState<ReportTab>('operations');
  const [jumpsData, setJumpsData] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [usersData, setUsersData] = useState<any>(null);

  // Operations tab state
  const [loads, setLoads] = useState<LoadRecord[]>([]);
  const [topJumpers, setTopJumpers] = useState<Jumper[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [jumpsByHour, setJumpsByHour] = useState<{ hour: string; jumps: number }[]>([]);
  const [aircraftUtilization, setAircraftUtilization] = useState<{ aircraft: string; utilization: number; loadsFlown: number; capacity: number }[]>([]);
  const [loadStatusBreakdown, setLoadStatusBreakdown] = useState<Record<string, number>>({});
  const [revenueBreakdown, setRevenueBreakdown] = useState<{ label: string; amount: number; percent: number; color: string }[]>([]);

  // Safety tab state
  const [incidents, setIncidents] = useState<{ id: string; severity: string; date: string; description: string; status: string }[]>([]);
  const [incidentsBySeverity, setIncidentsBySeverity] = useState<{ severity: string; count: number; color: string }[]>([]);
  const [incidentsByMonth, setIncidentsByMonth] = useState<{ month: string; incidents: number }[]>([]);

  // Training tab state
  const [affStudents, setAffStudents] = useState<{ level: string; count: number; avgTime: string }[]>([]);
  const [instructorWorkload, setInstructorWorkload] = useState<{ instructor: string; affJumps: number; tandems: number; total: number }[]>([]);

  // Waivers tab state
  const [expiringWaivers, setExpiringWaivers] = useState<{ id: string; name: string; expiresIn: number; type: string }[]>([]);
  const [waiverTypeDistribution, setWaiverTypeDistribution] = useState<{ type: string; count: number; color: string }[]>([]);

  // Instructors tab state
  const [instructorStats, setInstructorStats] = useState<{ instructor: string; rating: number; jumpsToday: number; tandems: number; aff: number }[]>([]);

  // Gear tab state
  const [gearCondition, setGearCondition] = useState<{ condition: string; count: number; color: string }[]>([]);
  const [recentInspections, setRecentInspections] = useState<{ id: string; item: string; type: string; lastInspected: string; nextDue: string }[]>([]);

  useEffect(() => {
    const fetchReportData = async () => {
      // Get date range based on period
      const today = new Date();
      const startDate = today.toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];

      // Fetch jumps data
      try {
        const jumpsResult = await apiGet(`/reports/jumps?startDate=${startDate}&endDate=${endDate}`);
        if (jumpsResult) {
          setJumpsData(jumpsResult);
        }
      } catch (error) {
        logger.error('Failed to fetch jumps data', { page: 'reports' });
      }

      // Fetch revenue data
      try {
        const revenueResult = await apiGet(`/reports/revenue?startDate=${startDate}&endDate=${endDate}`);
        if (revenueResult) {
          setRevenueData(revenueResult);
        }
      } catch (error) {
        logger.error('Failed to fetch revenue data', { page: 'reports' });
      }

      // Fetch users data
      try {
        const usersResult = await apiGet('/reports/users');
        if (usersResult) {
          setUsersData(usersResult);
        }
      } catch (error) {
        logger.error('Failed to fetch users data', { page: 'reports' });
      }

      // Fetch loads data
      try {
        const loadsResult = await apiGet('/loads');
        if (loadsResult && Array.isArray(loadsResult)) {
          setLoads(loadsResult);
        } else if (loadsResult?.data && Array.isArray(loadsResult.data)) {
          setLoads(loadsResult.data);
        }
      } catch (error) {
        logger.error('Failed to fetch loads data', { page: 'reports' });
      }

      // Fetch safety data
      try {
        const safetyResult = await apiGet(`/reports/safety?startDate=${startDate}&endDate=${endDate}`);
        if (safetyResult) {
          if (safetyResult.incidents) setIncidents(safetyResult.incidents);
          if (safetyResult.incidentsBySeverity) setIncidentsBySeverity(safetyResult.incidentsBySeverity);
          if (safetyResult.incidentsByMonth) setIncidentsByMonth(safetyResult.incidentsByMonth);
        }
      } catch (error) {
        logger.error('Failed to fetch safety data', { page: 'reports' });
      }

      // Fetch training data
      try {
        const trainingResult = await apiGet(`/reports/training?startDate=${startDate}&endDate=${endDate}`);
        if (trainingResult) {
          if (trainingResult.affStudents) setAffStudents(trainingResult.affStudents);
          if (trainingResult.instructorWorkload) setInstructorWorkload(trainingResult.instructorWorkload);
        }
      } catch (error) {
        logger.error('Failed to fetch training data', { page: 'reports' });
      }

      // Fetch waivers data
      try {
        const waiversResult = await apiGet(`/reports/waivers?startDate=${startDate}&endDate=${endDate}`);
        if (waiversResult) {
          if (waiversResult.expiringWaivers) setExpiringWaivers(waiversResult.expiringWaivers);
          if (waiversResult.waiverTypeDistribution) setWaiverTypeDistribution(waiversResult.waiverTypeDistribution);
        }
      } catch (error) {
        logger.error('Failed to fetch waivers data', { page: 'reports' });
      }

      // Fetch instructors data
      try {
        const instructorsResult = await apiGet(`/reports/instructors?startDate=${startDate}&endDate=${endDate}`);
        if (instructorsResult) {
          if (instructorsResult.instructorStats) setInstructorStats(instructorsResult.instructorStats);
        }
      } catch (error) {
        logger.error('Failed to fetch instructors data', { page: 'reports' });
      }

      // Fetch gear data
      try {
        const gearResult = await apiGet(`/reports/gear?startDate=${startDate}&endDate=${endDate}`);
        if (gearResult) {
          if (gearResult.gearCondition) setGearCondition(gearResult.gearCondition);
          if (gearResult.recentInspections) setRecentInspections(gearResult.recentInspections);
        }
      } catch (error) {
        logger.error('Failed to fetch gear data', { page: 'reports' });
      }
    };

    fetchReportData();
  }, [period]);

  // Guard against empty array for Math.max
  const maxJumps = jumpsByHour.length ? Math.max(...jumpsByHour.map(j => j.jumps)) : 1;

  // Computed KPI values from data
  const totalLoads = loads.length;
  const totalJumps = jumpsData?.totalJumps ?? loads.reduce((sum, l) => sum + l.slots, 0);
  const totalRevenue = revenueData?.totalRevenue ?? revenueBreakdown.reduce((sum, r) => sum + r.amount, 0);
  const activeJumpers = usersData?.activeJumpers ?? topJumpers.length;
  const incidentCount = incidents.length;
  const fleetUtilization = aircraftUtilization.length
    ? Math.round(aircraftUtilization.reduce((sum, a) => sum + a.utilization, 0) / aircraftUtilization.length * 10) / 10
    : 0;

  // Safety KPI computed values
  const totalIncidents = incidents.length;
  const openIncidents = incidents.filter(i => i.status === 'Open').length;
  const nearMisses = incidentsBySeverity.find(i => i.severity === 'Near Miss')?.count ?? incidents.filter(i => i.severity === 'Near Miss').length;
  const injuries = incidentsBySeverity.find(i => i.severity === 'Injury')?.count ?? incidents.filter(i => i.severity === 'Injury').length;
  const malfunctions = incidentsBySeverity.find(i => i.severity === 'Malfunction')?.count ?? incidents.filter(i => i.severity === 'Malfunction').length;

  // Training KPI computed values
  const totalAffStudents = affStudents.reduce((sum, s) => sum + s.count, 0);
  const level1Students = affStudents.find(s => s.level === 'Level 1')?.count ?? 0;
  const totalInstructorWorkload = instructorWorkload.length;

  // Waivers KPI computed values
  const totalWaivers = waiverTypeDistribution.reduce((sum, w) => sum + w.count, 0);
  const totalExpiring = expiringWaivers.length;

  // Instructors KPI computed values
  const activeInstructorCount = instructorStats.length;
  const avgRating = instructorStats.length
    ? Math.round(instructorStats.reduce((sum, i) => sum + i.rating, 0) / instructorStats.length * 10) / 10
    : 0;
  const totalInstructorJumps = instructorStats.reduce((sum, i) => sum + i.jumpsToday, 0);
  const totalTandems = instructorStats.reduce((sum, i) => sum + i.tandems, 0);

  // Gear KPI computed values
  const totalGearItems = gearCondition.reduce((sum, g) => sum + g.count, 0);
  const serviceableCount = gearCondition.find(g => g.condition === 'Serviceable')?.count ?? 0;
  const maintenanceDueCount = gearCondition.find(g => g.condition === 'Maintenance Due')?.count ?? 0;
  const outOfServiceCount = gearCondition.find(g => g.condition === 'Out of Service')?.count ?? 0;

  // Revenue total computed from breakdown
  const revenueTotal = revenueBreakdown.reduce((sum, r) => sum + r.amount, 0);

  // Max severity count for bar width calculation
  const maxSeverityCount = incidentsBySeverity.length ? Math.max(...incidentsBySeverity.map(i => i.count)) : 1;

  // Max waiver type count for bar width calculation
  const maxWaiverCount = waiverTypeDistribution.length ? Math.max(...waiverTypeDistribution.map(w => w.count)) : 1;

  // Max gear count for bar width calculation
  const maxGearCount = totalGearItems || 1;

  // Max AFF student count for bar width calculation
  const maxAffCount = affStudents.length ? Math.max(...affStudents.map(s => s.count)) : 1;

  const handleExport = (format: 'pdf' | 'csv') => {
    if (format === 'csv') {
      // Download CSV from API
      const token = getAuthToken();
      const url = `${API_BASE_URL}/reports/loads/csv`;
      const a = document.createElement('a');
      // Fetch with auth then trigger download
      fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => res.blob())
        .then((blob) => {
          const blobUrl = URL.createObjectURL(blob);
          a.href = blobUrl;
          a.download = `loads-report-${new Date().toISOString().slice(0, 10)}.csv`;
          a.click();
          URL.revokeObjectURL(blobUrl);
        })
        .catch(() => logger.error('CSV export failed', { page: 'reports' }));
    } else {
      // PDF: print as PDF for now
      window.print();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <RouteGuard allowedRoles={ROLE_GROUPS.OPERATIONS}>
    <div className="min-h-screen bg-gray-50 dark:bg-transparent p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">DZ Operations Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Real-time dashboard for dropzone management and performance tracking</p>
        </div>

        {/* Period Selector & Export Actions */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {['Today', 'This Week', 'This Month', 'Custom Range'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors text-sm md:text-base ${
                  period === p
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleExport('pdf')}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 border border-red-200"
            >
              <FileText size={16} /> PDF
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 border border-green-200"
            >
              <Download size={16} /> CSV
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2"
            >
              <Printer size={16} /> Print
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2 border-b border-gray-200 dark:border-slate-700">
          {[
            { id: 'operations', label: 'Operations' },
            { id: 'safety', label: 'Safety & Incidents' },
            { id: 'training', label: 'Training & AFF' },
            { id: 'waivers', label: 'Waiver Compliance' },
            { id: 'instructors', label: 'Instructor Performance' },
            { id: 'gear', label: 'Gear & Equipment' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ReportTab)}
              className={`px-4 py-3 font-semibold text-sm whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-b-[#1B4F72] text-[#1B4F72]'
                  : 'border-b-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* OPERATIONS TAB */}
        {activeTab === 'operations' && (
        <>
        {/* KPI Cards - 6 Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          {/* Total Loads */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-blue-500">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Total Loads</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalLoads}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">This period</p>
          </div>

          {/* Total Jumps */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-sky-500">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Total Jumps</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalJumps}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">This period</p>
          </div>

          {/* Revenue */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-emerald-500">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Revenue</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">${totalRevenue.toLocaleString()}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">This period</p>
          </div>

          {/* Active Jumpers */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-purple-500">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Active Jumpers</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{activeJumpers}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Unique today</p>
          </div>

          {/* Incidents */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-amber-500">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Incidents</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{incidentCount}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">This period</p>
          </div>

          {/* Aircraft Utilization */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-orange-500">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Utilization</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{fleetUtilization}%</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Fleet average</p>
          </div>
        </div>

        {/* Charts Section - 2x2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Jumps by Hour */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Jumps by Hour</h3>
            {jumpsByHour.length > 0 ? (
            <div className="space-y-3">
              {jumpsByHour.map((item) => (
                <div key={item.hour} className="flex items-center gap-3">
                  <div className="w-14 text-sm font-medium text-gray-700 dark:text-gray-300">{item.hour}</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full transition-all"
                      style={{ width: `${(item.jumps / maxJumps) * 100}%` }}
                    />
                    <div className="absolute inset-0 flex items-center px-2">
                      <span className="text-xs font-bold text-white drop-shadow">{item.jumps}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No data available for this period</p>
            )}
          </div>

          {/* Revenue Breakdown */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Revenue Breakdown</h3>
            {revenueBreakdown.length > 0 ? (
            <div className="space-y-4">
              {revenueBreakdown.map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">{item.label}</span>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">${item.amount.toLocaleString()} ({item.percent}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${item.color} transition-all`}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="pt-4 border-t border-gray-300 dark:border-slate-600 mt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-emerald-600">${revenueTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No data available for this period</p>
            )}
          </div>

          {/* Aircraft Utilization */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Aircraft Utilization</h3>
            {aircraftUtilization.length > 0 ? (
            <div className="space-y-5">
              {aircraftUtilization.map((item) => (
                <div key={item.aircraft}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-900 dark:text-white">{item.aircraft}</span>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{item.utilization}% ({item.loadsFlown}/{item.capacity})</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        item.utilization >= 80
                          ? 'bg-emerald-500'
                          : item.utilization >= 60
                          ? 'bg-blue-500'
                          : 'bg-orange-500'
                      }`}
                      style={{ width: `${item.utilization}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No data available for this period</p>
            )}
          </div>

          {/* Load Summary by Status */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Load Summary by Status</h3>
            {Object.keys(loadStatusBreakdown).length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(loadStatusBreakdown).map(([status, count]) => {
                const colors: Record<string, string> = {
                  COMPLETE: 'bg-emerald-50 border-emerald-300 text-emerald-700',
                  AIRBORNE: 'bg-blue-50 border-blue-300 text-blue-700',
                  BOARDING: 'bg-sky-50 border-sky-300 text-sky-700',
                  LOCKED: 'bg-amber-50 border-amber-300 text-amber-700',
                  FILLING: 'bg-purple-50 border-purple-300 text-purple-700',
                  OPEN: 'bg-gray-50 border-gray-300 dark:border-slate-600 text-gray-700',
                };
                return (
                  <div key={status} className={`rounded-lg border-2 p-4 text-center ${colors[status] || 'bg-gray-50 border-gray-300 text-gray-700'}`}>
                    <p className="text-xs font-bold uppercase tracking-wide mb-1">{status}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                );
              })}
            </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No data available for this period</p>
            )}
          </div>
        </div>

        {/* Detailed Tables */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Load History Table */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Load History</h3>
            {loads.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">Load</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">Aircraft</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">Slots</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">Departure</th>
                  </tr>
                </thead>
                <tbody>
                  {loads.slice(0, 6).map((load) => (
                    <tr key={load.id} className="border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-900">
                      <td className="py-3 px-2 font-semibold text-gray-900 dark:text-white">Load {load.id}</td>
                      <td className="py-3 px-2 text-gray-700 dark:text-gray-300">{load.aircraft}</td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          load.status === 'COMPLETE' ? 'bg-emerald-100 text-emerald-700' :
                          load.status === 'AIRBORNE' ? 'bg-blue-100 text-blue-700' :
                          load.status === 'BOARDING' ? 'bg-sky-100 text-sky-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {load.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-gray-700 dark:text-gray-300">{load.slots}</td>
                      <td className="py-3 px-2 text-gray-700 dark:text-gray-300">{load.departure}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No load data available</p>
            )}
          </div>

          {/* Top Jumpers Today */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Top Jumpers Today</h3>
            {topJumpers.length > 0 ? (
            <div className="space-y-3">
              {topJumpers.map((jumper, idx) => (
                <div key={idx} className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-slate-700 last:border-b-0">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">{jumper.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{jumper.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-white">{jumper.jumps} jumps</p>
                    <p className="text-sm text-emerald-600 font-semibold">${jumper.revenue}</p>
                  </div>
                </div>
              ))}
            </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No jumper data available</p>
            )}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Revenue by Payment Method</h3>
          {paymentMethods.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-4 gap-4">
            {paymentMethods.map((method) => (
              <div key={method.method} className="border border-gray-300 dark:border-slate-600 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{method.method}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">${method.amount.toLocaleString()}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">{method.percent}% of total</p>
              </div>
            ))}
          </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No payment data available</p>
          )}
        </div>
        </>
        )}

        {/* SAFETY & INCIDENTS TAB */}
        {activeTab === 'safety' && (
        <>
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {/* Total Incidents */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-amber-500">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Total Incidents</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalIncidents}</p>
            <p className="text-sm text-amber-600 font-semibold mt-2">This month</p>
          </div>

          {/* Open Incidents */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-red-500">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Open Incidents</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{openIncidents}</p>
            <p className="text-sm text-red-600 font-semibold mt-2">Requiring action</p>
          </div>

          {/* Near Misses */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-yellow-500">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Near Misses</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{nearMisses}</p>
            <p className="text-sm text-yellow-600 font-semibold mt-2">Low risk</p>
          </div>

          {/* Injuries */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-orange-500">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Injuries</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{injuries}</p>
            <p className="text-sm text-orange-600 font-semibold mt-2">This month</p>
          </div>

          {/* Malfunctions */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-rose-500">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Malfunctions</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{malfunctions}</p>
            <p className="text-sm text-rose-600 font-semibold mt-2">Equipment related</p>
          </div>
        </div>

        {incidentsBySeverity.length === 0 && incidentsByMonth.length === 0 && incidents.length === 0 ? (
          <EmptyState />
        ) : (
        <>
        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Incidents by Severity */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Incidents by Severity</h3>
            {incidentsBySeverity.length > 0 ? (
            <div className="space-y-5">
              {incidentsBySeverity.map((item) => (
                <div key={item.severity}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-900 dark:text-white">{item.severity}</span>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${item.color}`}
                      style={{ width: `${(item.count / maxSeverityCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No severity data available</p>
            )}
          </div>

          {/* Incidents by Month */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Incidents by Month</h3>
            {incidentsByMonth.length > 0 ? (
            <div className="space-y-3">
              {incidentsByMonth.map((item) => {
                const maxMonthly = Math.max(...incidentsByMonth.map(m => m.incidents));
                return (
                  <div key={item.month} className="flex items-center gap-3">
                    <div className="w-10 text-sm font-medium text-gray-700 dark:text-gray-300">{item.month}</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-amber-400 to-amber-600 h-full rounded-full transition-all"
                        style={{ width: `${(item.incidents / maxMonthly) * 100}%` }}
                      />
                      <div className="absolute inset-0 flex items-center px-2">
                        <span className="text-xs font-bold text-white drop-shadow">{item.incidents}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No monthly data available</p>
            )}
          </div>
        </div>

        {/* Open Incidents Table */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Open Incidents</h3>
          {incidents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">Ref</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">Severity</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">Date</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">Description</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((incident) => (
                  <tr key={incident.id} className="border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-900">
                    <td className="py-3 px-2 font-semibold text-gray-900 dark:text-white">{incident.description.slice(0, 25)}...</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        incident.severity === 'Near Miss' ? 'bg-yellow-100 text-yellow-700' :
                        incident.severity === 'Injury' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {incident.severity}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-gray-700 dark:text-gray-300">{incident.date}</td>
                    <td className="py-3 px-2 text-gray-700 dark:text-gray-300">{incident.description}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        incident.status === 'Open' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {incident.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No incident data available</p>
          )}
        </div>
        </>
        )}
        </>
        )}

        {/* TRAINING & AFF TAB */}
        {activeTab === 'training' && (
        <>
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {/* Active AFF Students */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-sky-500">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Active AFF Students</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalAffStudents}</p>
            <p className="text-sm text-sky-600 font-semibold mt-2">{affStudents.length > 0 ? `Across ${affStudents.length} levels` : 'No data'}</p>
          </div>

          {/* Graduation Rate */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-emerald-500">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Graduation Rate</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">--</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Requires API data</p>
          </div>

          {/* Avg Completion Time */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-purple-500">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Avg Completion</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">--</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Per AFF course</p>
          </div>

          {/* Level 1 Students */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-blue-500">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Level 1 Students</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{level1Students}</p>
            <p className="text-sm text-blue-600 font-semibold mt-2">Entry level</p>
          </div>

          {/* Instructors Available */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-amber-500">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Instructors</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalInstructorWorkload}</p>
            <p className="text-sm text-amber-600 font-semibold mt-2">AFF qualified</p>
          </div>
        </div>

        {affStudents.length === 0 && instructorWorkload.length === 0 ? (
          <EmptyState />
        ) : (
        <>
        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Students by Level */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Students by Level</h3>
            {affStudents.length > 0 ? (
            <div className="space-y-5">
              {affStudents.map((item) => (
                <div key={item.level}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-900 dark:text-white">{item.level}</span>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{item.count} students</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-sky-400 to-sky-600 transition-all"
                      style={{ width: `${(item.count / maxAffCount) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Avg: {item.avgTime}</p>
                </div>
              ))}
            </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No student data available</p>
            )}
          </div>

          {/* Instructor Workload */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Instructor Workload Distribution</h3>
            {instructorWorkload.length > 0 ? (
            <div className="space-y-4">
              {instructorWorkload.map((item) => (
                <div key={item.instructor} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-900 dark:text-white">{item.instructor}</span>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{item.total} jumps</span>
                  </div>
                  <div className="flex gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <span>AFF: {item.affJumps}</span>
                    <span className="text-gray-400">|</span>
                    <span>Tandem: {item.tandems}</span>
                  </div>
                </div>
              ))}
            </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No workload data available</p>
            )}
          </div>
        </div>
        </>
        )}
        </>
        )}

        {/* WAIVER COMPLIANCE TAB */}
        {activeTab === 'waivers' && (
        <>
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {/* Total Waivers */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-blue-500">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Total Waivers</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalWaivers}</p>
            <p className="text-sm text-blue-600 font-semibold mt-2">All active</p>
          </div>

          {/* Expiring in 30 Days */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-amber-500">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Expiring Soon</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalExpiring}</p>
            <p className="text-sm text-amber-600 font-semibold mt-2">Within 30 days</p>
          </div>

          {/* Expired */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-red-500">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Expired</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">--</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Requires API data</p>
          </div>

          {/* Compliance Rate */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-emerald-500">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Compliance Rate</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">--</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Requires API data</p>
          </div>

          {/* Pending Review */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-purple-500">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Pending Review</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">--</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Requires API data</p>
          </div>
        </div>

        {waiverTypeDistribution.length === 0 && expiringWaivers.length === 0 ? (
          <EmptyState />
        ) : (
        <>
        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Waiver Type Distribution */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Waiver Type Distribution</h3>
            {waiverTypeDistribution.length > 0 ? (
            <div className="space-y-5">
              {waiverTypeDistribution.map((item) => (
                <div key={item.type}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-900 dark:text-white">{item.type}</span>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${item.color}`}
                      style={{ width: `${(item.count / maxWaiverCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No waiver distribution data available</p>
            )}
          </div>

          {/* Compliance Status */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Compliance Overview</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex items-center gap-3">
                  <CheckCircle size={24} className="text-emerald-600" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Active & Current</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{totalWaivers > 0 ? `${totalWaivers - totalExpiring} waivers` : 'No data'}</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-emerald-600">{totalWaivers > 0 ? `${Math.round(((totalWaivers - totalExpiring) / totalWaivers) * 1000) / 10}%` : '--'}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-3">
                  <Clock size={24} className="text-amber-600" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Expiring Soon</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Within 30 days</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-amber-600">{totalWaivers > 0 ? `${Math.round((totalExpiring / totalWaivers) * 1000) / 10}%` : '--'}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-3">
                  <XCircle size={24} className="text-red-600" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Expired/Overdue</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Needs immediate action</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-red-600">--</span>
              </div>
            </div>
          </div>
        </div>

        {/* Expiring Waivers Table */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Waivers Expiring Within 30 Days</h3>
          {expiringWaivers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">Name</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">Type</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">Expires In</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">Urgency</th>
                </tr>
              </thead>
              <tbody>
                {expiringWaivers.map((waiver) => (
                  <tr key={waiver.id} className="border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-900">
                    <td className="py-3 px-2 font-semibold text-gray-900 dark:text-white">{waiver.name}</td>
                    <td className="py-3 px-2 text-gray-700 dark:text-gray-300">{waiver.type}</td>
                    <td className="py-3 px-2 text-gray-700 dark:text-gray-300">{waiver.expiresIn} days</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        waiver.expiresIn <= 5 ? 'bg-red-100 text-red-700' :
                        waiver.expiresIn <= 15 ? 'bg-amber-100 text-amber-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {waiver.expiresIn <= 5 ? 'Critical' : waiver.expiresIn <= 15 ? 'High' : 'Normal'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No expiring waivers</p>
          )}
        </div>
        </>
        )}
        </>
        )}

        {/* INSTRUCTOR PERFORMANCE TAB */}
        {activeTab === 'instructors' && (
        <>
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {/* Active Instructors */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-blue-500">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Active Instructors</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{activeInstructorCount}</p>
            <p className="text-sm text-blue-600 font-semibold mt-2">On schedule</p>
          </div>

          {/* Avg Rating */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-emerald-500">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Avg Rating</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{avgRating > 0 ? `${avgRating}` : '--'}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{avgRating > 0 ? 'Current average' : 'No data'}</p>
          </div>

          {/* Jumps Today */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-sky-500">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Jumps Today</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalInstructorJumps}</p>
            <p className="text-sm text-sky-600 font-semibold mt-2">Fleet wide</p>
          </div>

          {/* Tandem Jumps */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-purple-500">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Tandem Jumps</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalTandems}</p>
            <p className="text-sm text-purple-600 font-semibold mt-2">Today</p>
          </div>

          {/* Utilization Rate */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-orange-500">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Utilization</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">--</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Requires API data</p>
          </div>
        </div>

        {instructorStats.length === 0 ? (
          <EmptyState />
        ) : (
        <>
        {/* Top Instructors Table */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Top Instructors by Volume (Today)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">Instructor</th>
                  <th className="text-center py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">Rating</th>
                  <th className="text-center py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">Tandem</th>
                  <th className="text-center py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">AFF</th>
                  <th className="text-center py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">Total</th>
                </tr>
              </thead>
              <tbody>
                {instructorStats.map((instructor) => (
                  <tr key={instructor.instructor} className="border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-900">
                    <td className="py-3 px-2 font-semibold text-gray-900 dark:text-white">{instructor.instructor}</td>
                    <td className="py-3 px-2 text-center">
                      <span className="bg-emerald-100 text-emerald-700 font-bold px-2 py-1 rounded text-xs">
                        {instructor.rating}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center text-gray-700 dark:text-gray-300">{instructor.tandems}</td>
                    <td className="py-3 px-2 text-center text-gray-700 dark:text-gray-300">{instructor.aff}</td>
                    <td className="py-3 px-2 text-center font-bold text-gray-900 dark:text-white">{instructor.jumpsToday}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Performance Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Rating Distribution */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Rating Distribution</h3>
            <div className="space-y-4">
              {(() => {
                const highRating = instructorStats.filter(i => i.rating >= 4.8).length;
                const midRating = instructorStats.filter(i => i.rating >= 4.5 && i.rating < 4.8).length;
                const lowRating = instructorStats.filter(i => i.rating < 4.5).length;
                const maxRatingCount = Math.max(highRating, midRating, lowRating, 1);
                return (
                  <>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-900 dark:text-white">4.8-5.0</span>
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{highRating} instructors</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div className="h-3 rounded-full bg-emerald-500" style={{ width: `${(highRating / maxRatingCount) * 100}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-900 dark:text-white">4.5-4.7</span>
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{midRating} instructors</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div className="h-3 rounded-full bg-blue-500" style={{ width: `${(midRating / maxRatingCount) * 100}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-900 dark:text-white">Below 4.5</span>
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{lowRating} instructors</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div className="h-3 rounded-full bg-amber-500" style={{ width: `${(lowRating / maxRatingCount) * 100}%` }} />
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Jump Type Distribution */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Jump Type Distribution</h3>
            {(() => {
              const totalAff = instructorStats.reduce((sum, i) => sum + i.aff, 0);
              const totalTandemJumps = instructorStats.reduce((sum, i) => sum + i.tandems, 0);
              const totalFun = totalInstructorJumps - totalAff - totalTandemJumps;
              const totalAll = totalInstructorJumps || 1;
              const jumpTypes = [
                { type: 'Tandem', count: totalTandemJumps, color: 'bg-purple-500' },
                { type: 'AFF Training', count: totalAff, color: 'bg-sky-500' },
                { type: 'Fun Jumps', count: Math.max(totalFun, 0), color: 'bg-blue-500' },
              ];
              return (
                <div className="space-y-5">
                  {jumpTypes.map((item) => (
                    <div key={item.type}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-900 dark:text-white">{item.type}</span>
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{item.count} ({totalAll > 0 ? Math.round((item.count/totalAll)*100) : 0}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all ${item.color}`}
                          style={{ width: `${totalAll > 0 ? (item.count / totalAll) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
        </>
        )}
        </>
        )}

        {/* GEAR & EQUIPMENT TAB */}
        {activeTab === 'gear' && (
        <>
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {/* Total Gear */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-blue-500">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Total Gear Items</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalGearItems}</p>
            <p className="text-sm text-blue-600 font-semibold mt-2">In inventory</p>
          </div>

          {/* Serviceable */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-emerald-500">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Serviceable</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{serviceableCount}</p>
            <p className="text-sm text-emerald-600 font-semibold mt-2">Ready to use</p>
          </div>

          {/* Maintenance Due */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-amber-500">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Maintenance Due</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{maintenanceDueCount}</p>
            <p className="text-sm text-amber-600 font-semibold mt-2">Scheduled</p>
          </div>

          {/* Reserve Repacks Due */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-purple-500">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Repacks Due</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">--</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Requires API data</p>
          </div>

          {/* Out of Service */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-red-500">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Out of Service</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{outOfServiceCount}</p>
            <p className="text-sm text-red-600 font-semibold mt-2">Awaiting repair</p>
          </div>
        </div>

        {gearCondition.length === 0 && recentInspections.length === 0 ? (
          <EmptyState />
        ) : (
        <>
        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Gear Condition Distribution */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Gear Condition Status</h3>
            {gearCondition.length > 0 ? (
            <div className="space-y-5">
              {gearCondition.map((item) => (
                <div key={item.condition}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-900 dark:text-white">{item.condition}</span>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${item.color}`}
                      style={{ width: `${(item.count / maxGearCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No gear condition data available</p>
            )}
          </div>

          {/* Maintenance Schedule */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Maintenance Schedule</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:bg-slate-900">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Reserve Repacks Due</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Next 7 days</p>
                </div>
                <span className="text-2xl font-bold text-purple-600">--</span>
              </div>
              <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:bg-slate-900">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Harness Inspections</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Next 30 days</p>
                </div>
                <span className="text-2xl font-bold text-sky-600">--</span>
              </div>
              <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:bg-slate-900">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Equipment Service</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Overdue</p>
                </div>
                <span className="text-2xl font-bold text-red-600">--</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Inspections Table */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Inspections</h3>
          {recentInspections.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">Item</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">Type</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">Last Inspected</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">Next Due</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentInspections.map((inspection) => {
                  const nextDate = new Date(inspection.nextDue);
                  const today = new Date();
                  const isOverdue = nextDate < today;

                  return (
                    <tr key={inspection.id} className="border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-900">
                      <td className="py-3 px-2 font-semibold text-gray-900 dark:text-white">{inspection.item}</td>
                      <td className="py-3 px-2 text-gray-700 dark:text-gray-300">{inspection.type}</td>
                      <td className="py-3 px-2 text-gray-700 dark:text-gray-300">{inspection.lastInspected}</td>
                      <td className="py-3 px-2 text-gray-700 dark:text-gray-300">{inspection.nextDue}</td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          isOverdue ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {isOverdue ? 'OVERDUE' : 'ON TIME'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No inspection data available</p>
          )}
        </div>
        </>
        )}
        </>
        )}
      </div>
    </div>
    </RouteGuard>
  );
}
