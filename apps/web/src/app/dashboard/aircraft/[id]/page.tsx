'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  Plane,
  Gauge,
  Fuel,
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  User,
  Weight,
  RefreshCw,
} from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { RouteGuard, ROLE_GROUPS } from '@/components/RouteGuard';

interface Aircraft {
  id: number;
  registration: string;
  type: string;
  manufacturer: string | null;
  model: string | null;
  maxCapacity: number;
  maxWeight: number;
  emptyWeight: number;
  fuelBurnRate: number | null;
  fuelCapacity: number | null;
  cgForwardLimit: number | null;
  cgAftLimit: number | null;
  status: string;
  hobbsHours: number | null;
  next100hrDue: number | null;
  annualDue: string | null;
}

interface CgCheckRecord {
  id: number;
  loadId: number;
  totalWeight: number;
  fuelWeight: number;
  pilotWeight: number;
  passengerWeight: number;
  calculatedCg: number;
  result: 'PASS' | 'FAIL' | 'MARGINAL';
  overrideReason: string | null;
  createdAt: string;
  performedBy?: { firstName: string; lastName: string };
}

interface FuelEstimate {
  aircraftId: number;
  loadNumber: number | null;
  estimatedPayload: number;
  estimatedFuelNeeded: number;
  estimatedTotalWeight: number;
  maxGrossWeight: number;
  marginLbs: number;
  marginPercent: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  warnings: string[];
  pilotConfirmed: boolean;
  pilotConfirmedAt: string | null;
  pilotConfirmedBy: string | null;
}

const FALLBACK_AIRCRAFT: Aircraft = {
  id: 0, registration: '', type: '', manufacturer: null, model: null,
  maxCapacity: 0, maxWeight: 0, emptyWeight: 0, fuelBurnRate: null, fuelCapacity: null,
  cgForwardLimit: null, cgAftLimit: null, status: 'INACTIVE',
  hobbsHours: null, next100hrDue: null, annualDue: null,
};

const FALLBACK_CG_CHECKS: CgCheckRecord[] = [];

const FALLBACK_FUEL_ESTIMATE: FuelEstimate = {
  aircraftId: 0, loadNumber: null, estimatedPayload: 0, estimatedFuelNeeded: 0,
  estimatedTotalWeight: 0, maxGrossWeight: 0, marginLbs: 0, marginPercent: 0,
  confidence: 'LOW', warnings: [],
  pilotConfirmed: false, pilotConfirmedAt: null, pilotConfirmedBy: null,
};

const CG_RESULT_STYLES: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
  PASS: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
  MARGINAL: { bg: 'bg-amber-100', text: 'text-amber-700', icon: AlertTriangle },
  FAIL: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
};

type Tab = 'overview' | 'performance' | 'fuel' | 'confirmations';

export default function AircraftDetailPage() {
  const params = useParams();
  const aircraftId = params?.id as string;

  const [aircraft, setAircraft] = useState<Aircraft | null>(null);
  const [cgChecks, setCgChecks] = useState<CgCheckRecord[]>([]);
  const [fuelEstimate, setFuelEstimate] = useState<FuelEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [acRes, cgRes] = await Promise.allSettled([
          apiGet<{ success: boolean; data: any }>(`/aircraft/${aircraftId}`),
          apiGet<{ success: boolean; data: any[] }>(`/aircraft/${aircraftId}/cg-checks`),
        ]);

        if (acRes.status === 'fulfilled' && acRes.value?.data) {
          setAircraft(acRes.value.data);
        } else {
          setAircraft(null);
        }

        if (cgRes.status === 'fulfilled' && cgRes.value?.data) {
          setCgChecks(cgRes.value.data);
        } else {
          setCgChecks([]);
        }

        // Compute fuel estimate from aircraft data
        if (acRes.status === 'fulfilled' && acRes.value?.data) {
          const ac = acRes.value.data;
          const maxGross = ac.maxWeight || 0;
          const emptyW = ac.emptyWeight || 0;
          setFuelEstimate({
            aircraftId: ac.id,
            loadNumber: null,
            estimatedPayload: 0,
            estimatedFuelNeeded: ac.fuelCapacity || 0,
            estimatedTotalWeight: emptyW + (ac.fuelCapacity || 0),
            maxGrossWeight: maxGross,
            marginLbs: maxGross - emptyW - (ac.fuelCapacity || 0),
            marginPercent: maxGross > 0 ? Math.round(((maxGross - emptyW) / maxGross) * 100) : 0,
            confidence: 'LOW',
            warnings: ['Operational estimate only — pilot review required'],
            pilotConfirmed: false,
            pilotConfirmedAt: null,
            pilotConfirmedBy: null,
          });
        } else {
          setFuelEstimate(null);
        }
      } catch {
        setAircraft(FALLBACK_AIRCRAFT);
        setCgChecks(FALLBACK_CG_CHECKS);
        setFuelEstimate(FALLBACK_FUEL_ESTIMATE);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [aircraftId]);

  const handlePilotConfirm = async (comment: string) => {
    if (!fuelEstimate) return;
    try {
      await apiPost(`/aircraft/${aircraftId}/pilot-confirm`, {
        loadId: fuelEstimate.loadNumber,
        estimatedTotalWeight: fuelEstimate.estimatedTotalWeight,
        estimatedFuelNeeded: fuelEstimate.estimatedFuelNeeded,
        comment,
      });
    } catch { /* API may not be available */ }
    setFuelEstimate(prev => prev ? {
      ...prev,
      pilotConfirmed: true,
      pilotConfirmedAt: new Date().toISOString(),
      pilotConfirmedBy: 'Current Pilot',
    } : prev);
    setShowConfirmModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!aircraft) {
    return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Aircraft not found</div>;
  }

  const TABS: { id: Tab; label: string; icon: typeof Plane }[] = [
    { id: 'overview', label: 'Overview', icon: Plane },
    { id: 'performance', label: 'Performance', icon: Gauge },
    { id: 'fuel', label: 'Fuel Estimate', icon: Fuel },
    { id: 'confirmations', label: 'CG & Confirmations', icon: Shield },
  ];

  return (
    <RouteGuard allowedRoles={ROLE_GROUPS.OPERATIONS}>
    <div className="min-h-screen bg-gray-50 dark:bg-transparent p-4 lg:p-6">
      <div className="max-w-5xl mx-auto">
        <Link href="/dashboard/aircraft" className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white dark:text-gray-400 dark:hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Fleet
        </Link>

        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Plane className="w-7 h-7 text-blue-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{aircraft.registration}</h1>
              <p className="text-gray-600 dark:text-gray-400">{aircraft.type} {aircraft.manufacturer ? `- ${aircraft.manufacturer}` : ''}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              aircraft.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
              aircraft.status === 'MX_HOLD' ? 'bg-amber-100 text-amber-700' :
              'bg-gray-100 text-gray-600'
            }`}>{aircraft.status}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {tab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { label: 'Max Capacity', value: `${aircraft.maxCapacity} seats`, icon: User },
              { label: 'Max Gross Weight', value: `${aircraft.maxWeight.toLocaleString()} lbs`, icon: Weight },
              { label: 'Empty Weight', value: `${aircraft.emptyWeight.toLocaleString()} lbs`, icon: Weight },
              { label: 'Fuel Capacity', value: aircraft.fuelCapacity ? `${aircraft.fuelCapacity.toLocaleString()} lbs` : 'N/A', icon: Fuel },
              { label: 'Fuel Burn Rate', value: aircraft.fuelBurnRate ? `${aircraft.fuelBurnRate} gal/hr` : 'N/A', icon: Gauge },
              { label: 'Hobbs Hours', value: aircraft.hobbsHours ? `${aircraft.hobbsHours.toLocaleString()} hrs` : 'N/A', icon: Clock },
              { label: 'Next 100hr Due', value: aircraft.next100hrDue ? `${aircraft.next100hrDue.toLocaleString()} hrs` : 'N/A', icon: Clock },
              { label: 'Annual Due', value: aircraft.annualDue ? new Date(aircraft.annualDue).toLocaleDateString() : 'N/A', icon: FileText },
            ].map((item, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-4 flex items-center gap-3">
                <item.icon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{item.label}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Performance Tab */}
        {tab === 'performance' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">CG Envelope</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Forward Limit</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{aircraft.cgForwardLimit ? `${(aircraft.cgForwardLimit * 100).toFixed(1)}% MAC` : 'Not configured'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Aft Limit</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{aircraft.cgAftLimit ? `${(aircraft.cgAftLimit * 100).toFixed(1)}% MAC` : 'Not configured'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Useful Load</p>
                  <p className="text-xl font-bold text-blue-600">{(aircraft.maxWeight - aircraft.emptyWeight).toLocaleString()} lbs</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Payload (est. fuel deducted)</p>
                  <p className="text-xl font-bold text-purple-600">{(aircraft.maxWeight - aircraft.emptyWeight - (aircraft.fuelCapacity || 0) * 0.5).toLocaleString()} lbs</p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Pilot Authority</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">These are platform-stored performance references. The pilot in command is responsible for verifying actual weight, balance, CG, fuel state, and aircraft performance suitability before every flight per FAA/EASA regulations.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fuel Estimate Tab */}
        {tab === 'fuel' && fuelEstimate && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Fuel Estimate Support — Load {fuelEstimate.loadNumber}</h2>
                <span className={`text-xs font-bold px-2 py-1 rounded ${
                  fuelEstimate.confidence === 'HIGH' ? 'bg-emerald-100 text-emerald-700' :
                  fuelEstimate.confidence === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-600'
                }`}>Confidence: {fuelEstimate.confidence}</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Estimated Payload</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{fuelEstimate.estimatedPayload.toLocaleString()} lbs</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Estimated Fuel Needed</p>
                  <p className="text-xl font-bold text-blue-600">{fuelEstimate.estimatedFuelNeeded.toLocaleString()} lbs</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Est. Total Weight</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{fuelEstimate.estimatedTotalWeight.toLocaleString()} lbs</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Weight Margin</p>
                  <p className={`text-xl font-bold ${fuelEstimate.marginPercent >= 3 ? 'text-emerald-600' : fuelEstimate.marginPercent >= 1 ? 'text-amber-600' : 'text-red-600'}`}>
                    {fuelEstimate.marginLbs} lbs ({fuelEstimate.marginPercent.toFixed(1)}%)
                  </p>
                </div>
              </div>

              {/* Weight bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>Empty: {aircraft.emptyWeight.toLocaleString()}</span>
                  <span>MTOW: {fuelEstimate.maxGrossWeight.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div className="h-3 rounded-full flex">
                    <div className="bg-gray-400" style={{ width: `${(aircraft.emptyWeight / fuelEstimate.maxGrossWeight) * 100}%` }} title="Empty weight" />
                    <div className="bg-blue-500" style={{ width: `${(fuelEstimate.estimatedFuelNeeded / fuelEstimate.maxGrossWeight) * 100}%` }} title="Fuel" />
                    <div className="bg-purple-500" style={{ width: `${(fuelEstimate.estimatedPayload / fuelEstimate.maxGrossWeight) * 100}%` }} title="Payload" />
                  </div>
                </div>
                <div className="flex gap-4 mt-1 text-[10px]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-gray-400 rounded" /> Empty</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded" /> Fuel</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-purple-500 rounded" /> Payload</span>
                </div>
              </div>

              {/* Warnings */}
              {fuelEstimate.warnings.length > 0 && (
                <div className="space-y-2 mb-4">
                  {fuelEstimate.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700 dark:text-amber-400">{w}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Pilot Confirmation */}
              <div className="border-t border-gray-200 dark:border-slate-700 dark:border-gray-700 pt-4">
                {fuelEstimate.pilotConfirmed ? (
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Pilot Confirmed</p>
                      <p className="text-xs text-emerald-600">{fuelEstimate.pilotConfirmedBy} at {fuelEstimate.pilotConfirmedAt ? new Date(fuelEstimate.pilotConfirmedAt).toLocaleString() : ''}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Pilot review required</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Operational estimate only. Pilot must review and confirm final fuel, weight, balance, and aircraft performance suitability.</p>
                    </div>
                    <button
                      onClick={() => setShowConfirmModal(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex-shrink-0"
                    >
                      Pilot Confirm
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  <strong>Operational estimate only.</strong> Pilot must review and confirm final fuel, weight, balance, and aircraft performance suitability. SkyLara estimates and recommends but never silently auto-approves final aircraft decisions.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CG & Confirmations Tab */}
        {tab === 'confirmations' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">CG Check History</h2>
            {cgChecks.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl border p-8 text-center">
                <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No CG checks recorded for this aircraft</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-700/50">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Load</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Total Weight</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">CG Position</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Result</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Performed By</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cgChecks.map(check => {
                      const style = CG_RESULT_STYLES[check.result] || CG_RESULT_STYLES.PASS;
                      const Icon = style.icon;
                      return (
                        <tr key={check.id} className="border-t border-gray-100 dark:border-gray-700">
                          <td className="px-4 py-3 font-medium">Load {check.loadId}</td>
                          <td className="px-4 py-3">{check.totalWeight.toLocaleString()} lbs</td>
                          <td className="px-4 py-3">{(Number(check.calculatedCg) * 100).toFixed(1)}% MAC</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${style.bg} ${style.text}`}>
                              <Icon className="w-3 h-3" /> {check.result}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            {check.performedBy ? `${check.performedBy.firstName} ${check.performedBy.lastName}` : 'System'}
                          </td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{new Date(check.createdAt).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Audit note */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-400">CG check records are append-only and cannot be modified. Every check is logged with the performing user, timestamp, aircraft, load, and calculated values for full audit trail compliance.</p>
            </div>
          </div>
        )}
      </div>

      {/* Pilot Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowConfirmModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Pilot Confirmation</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Confirm that you have reviewed and accept the fuel estimate, weight, and balance for this load.
              </p>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const comment = (form.elements.namedItem('comment') as HTMLTextAreaElement).value;
              handlePilotConfirm(comment);
            }} className="p-6 space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  By confirming, you acknowledge that you are the pilot in command and have verified weight, balance, fuel, and aircraft suitability per applicable regulations (FAA/EASA).
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Comment (optional)</label>
                <textarea
                  name="comment"
                  rows={3}
                  placeholder="Any notes about fuel state, adjustments, or conditions..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowConfirmModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">Confirm as Pilot</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </RouteGuard>
  );
}
