'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import {
  ChevronLeft, Clock, CheckCircle2, Archive, RotateCcw,
  Eye, FileText, AlertTriangle, Loader2, GitCompare, ChevronDown,
  ChevronUp, Layers,
} from 'lucide-react';

interface Version {
  id: string;
  version: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  titleSnapshot: string;
  sectionsCount: number;
  submissionsCount: number;
  publishedAt: string | null;
  publishedByUserId: string | null;
  effectiveFrom: string | null;
  createdAt: string;
}

interface VersionDetail {
  id: number;
  version: number;
  sections: { key: string; title: string; sectionType: string; fields: { key: string; label: string }[] }[];
}

export default function WaiverVersionsPage() {
  const params = useParams<{ templateId: string }>();
  const router = useRouter();
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolling, setRolling] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<[string | null, string | null]>([null, null]);
  const [compareData, setCompareData] = useState<[VersionDetail | null, VersionDetail | null]>([null, null]);
  const [showCompare, setShowCompare] = useState(false);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<any[]>(`/waivers/templates/${params.templateId}/versions`);
      setVersions(data.map((v: any) => ({
        id: String(v.id),
        version: v.version,
        status: v.status,
        titleSnapshot: v.titleSnapshot || 'Untitled',
        sectionsCount: v.sectionsCount || 0,
        submissionsCount: v.submissionsCount || 0,
        publishedAt: v.publishedAt,
        publishedByUserId: v.publishedByUserId ? String(v.publishedByUserId) : null,
        effectiveFrom: v.effectiveFrom,
        createdAt: v.createdAt,
      })));
    } catch {
      setVersions([]);
    }
    setLoading(false);
  }, [params.templateId]);

  useEffect(() => { void fetchVersions(); }, [fetchVersions]);

  const handleRollback = async (versionId: string, versionNum: number) => {
    if (!confirm(`Rollback to version ${versionNum}? This will create a new draft version based on this one.`)) return;
    setRolling(versionId);
    try {
      await apiPost(`/waivers/templates/${params.templateId}/versions/${versionId}/rollback`);
      await fetchVersions();
    } catch {}
    setRolling(null);
  };

  const handleArchive = async (versionId: string) => {
    if (!confirm('Archive this version? It will no longer be the active published version.')) return;
    setArchiving(versionId);
    try {
      await apiPost(`/waivers/templates/${params.templateId}/versions/${versionId}/archive`);
      await fetchVersions();
    } catch {}
    setArchiving(null);
  };

  const handleCompare = async () => {
    if (!compareIds[0] || !compareIds[1]) return;
    setLoadingCompare(true);
    try {
      const [a, b] = await Promise.all([
        apiGet<VersionDetail>(`/waivers/templates/${params.templateId}/versions/${compareIds[0]}`),
        apiGet<VersionDetail>(`/waivers/templates/${params.templateId}/versions/${compareIds[1]}`),
      ]);
      setCompareData([a, b]);
      setShowCompare(true);
    } catch {}
    setLoadingCompare(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center"><Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto" /><p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading versions...</p></div>
      </div>
    );
  }

  const statusBadge = (s: string) => {
    switch (s) {
      case 'PUBLISHED': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 className="w-3 h-3" /> Published</span>;
      case 'ARCHIVED': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-400"><Archive className="w-3 h-3" /> Archived</span>;
      case 'DRAFT': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"><Clock className="w-3 h-3" /> Draft</span>;
      default: return null;
    }
  };

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  const published = versions.find((v) => v.status === 'PUBLISHED');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Version History</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Template: {params.templateId} &middot; {versions.length} version{versions.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/dashboard/waivers/templates/${params.templateId}/builder`} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <FileText className="w-4 h-4" /> Open Builder
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Compare selector */}
        {versions.length >= 2 && (
          <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <GitCompare className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Compare:</span>
              <select
                value={compareIds[0] || ''}
                onChange={(e) => setCompareIds([e.target.value || null, compareIds[1]])}
                className="text-sm px-3 py-1.5 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Select version A</option>
                {versions.map((v) => <option key={v.id} value={v.id}>v{v.version} ({v.status})</option>)}
              </select>
              <span className="text-gray-400">vs</span>
              <select
                value={compareIds[1] || ''}
                onChange={(e) => setCompareIds([compareIds[0], e.target.value || null])}
                className="text-sm px-3 py-1.5 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Select version B</option>
                {versions.map((v) => <option key={v.id} value={v.id}>v{v.version} ({v.status})</option>)}
              </select>
              <button
                onClick={handleCompare}
                disabled={!compareIds[0] || !compareIds[1] || compareIds[0] === compareIds[1] || loadingCompare}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingCompare ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitCompare className="w-4 h-4" />} Compare
              </button>
            </div>
          </div>
        )}

        {/* Compare results */}
        {showCompare && compareData[0] && compareData[1] && (
          <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border-2 border-blue-200 dark:border-blue-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-blue-500" />
                v{compareData[0].version} vs v{compareData[1].version}
              </h3>
              <button onClick={() => setShowCompare(false)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-300">Close</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[compareData[0], compareData[1]].map((vd, i) => (
                <div key={i}>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase">Version {vd!.version} &middot; {vd!.sections.length} sections</p>
                  <div className="space-y-1.5">
                    {vd!.sections.map((sec, si) => {
                      const otherSections = (i === 0 ? compareData[1] : compareData[0])!.sections;
                      const match = otherSections.find((os) => os.key === sec.key);
                      const isNew = !match;
                      const changed = match && (match.title !== sec.title || match.fields.length !== sec.fields.length);
                      return (
                        <div key={si} className={`text-xs px-2 py-1.5 rounded ${isNew ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' : changed ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800' : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400'}`}>
                          <span className="font-medium">{sec.title}</span>
                          <span className="text-[10px] ml-1.5 opacity-70">{sec.sectionType} &middot; {sec.fields.length} fields</span>
                          {isNew && <span className="ml-1 text-[10px] font-bold">NEW</span>}
                          {changed && <span className="ml-1 text-[10px] font-bold">CHANGED</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Version cards */}
        {versions.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-8 text-center">
            <Layers className="w-10 h-10 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No versions found for this template.</p>
            <Link href={`/dashboard/waivers/templates/${params.templateId}/builder`} className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <FileText className="w-4 h-4" /> Open Builder
            </Link>
          </div>
        ) : versions.map((v) => (
          <div key={v.id} className={`bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border-2 p-5 transition-colors ${
            v.status === 'PUBLISHED' ? 'border-green-300 dark:border-green-700' :
            v.status === 'DRAFT' ? 'border-yellow-300 dark:border-yellow-700' :
            'border-gray-200 dark:border-slate-700 dark:border-gray-700'
          }`}>
            {/* Version header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Version {v.version}</h3>
                  {statusBadge(v.status)}
                  {v.status === 'PUBLISHED' && <span className="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded font-medium">Current</span>}
                  {v.status === 'DRAFT' && <span className="text-[10px] bg-yellow-500 text-white px-2 py-0.5 rounded font-medium">Editable</span>}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{v.titleSnapshot}</p>
              </div>
              <button onClick={() => setExpandedId(expandedId === v.id ? null : v.id)} className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-400">
                {expandedId === v.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{v.sectionsCount}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Sections</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{v.submissionsCount}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Submissions</p>
              </div>
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{fmtDate(v.publishedAt)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Published</p>
              </div>
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{fmtDate(v.effectiveFrom)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Effective From</p>
              </div>
            </div>

            {/* Expanded details */}
            {expandedId === v.id && (
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg text-xs space-y-1">
                <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Version</span><span className="font-mono text-gray-700 dark:text-gray-300">v{v.version}</span></div>
                <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Created</span><span className="text-gray-700 dark:text-gray-300">{fmtDate(v.createdAt)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Published By</span><span className="text-gray-700 dark:text-gray-300">{v.publishedAt ? 'Staff' : '-'}</span></div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
              {v.status === 'DRAFT' && (
                <Link href={`/dashboard/waivers/templates/${params.templateId}/builder`} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-lg">
                  <FileText className="w-3.5 h-3.5" /> Edit in Builder
                </Link>
              )}
              {v.status !== 'DRAFT' && (
                <Link href={`/dashboard/waivers/templates/${params.templateId}/builder`} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  <Eye className="w-3.5 h-3.5" /> View
                </Link>
              )}
              {v.status === 'ARCHIVED' && (
                <button
                  onClick={() => handleRollback(v.id, v.version)}
                  disabled={rolling === v.id}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-lg disabled:opacity-50"
                >
                  {rolling === v.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  {rolling === v.id ? 'Rolling back...' : 'Rollback to This'}
                </button>
              )}
              {v.status === 'PUBLISHED' && (
                <button
                  onClick={() => handleArchive(v.id)}
                  disabled={archiving === v.id}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/10 rounded-lg disabled:opacity-50"
                >
                  {archiving === v.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
                  {archiving === v.id ? 'Archiving...' : 'Archive'}
                </button>
              )}
              {v.submissionsCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-gray-400 ml-auto">
                  <AlertTriangle className="w-3 h-3" /> {v.submissionsCount} signed record{v.submissionsCount !== 1 ? 's' : ''} tied to this version
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
