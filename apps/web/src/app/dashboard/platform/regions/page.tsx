'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  Plus,
  ChevronRight,
  ChevronDown,
  MapPin,
  Clock,
  DollarSign,
  Building2,
  Pencil,
  Trash2,
  X,
  Inbox,
  Search,
} from 'lucide-react';

interface Region {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  countryCode: string;
  subdivisionCode: string | null;
  timezone: string;
  currency: string;
  status: string;
  parentRegionId: number | null;
  metadata: any;
  childRegions: { id: number; name: string; slug: string }[];
  childCount: number;
  facilityCount: number;
}

const EMPTY_FORM = {
  name: '',
  slug: '',
  countryCode: '',
  subdivisionCode: '',
  timezone: 'UTC',
  currency: 'USD',
  parentRegionId: null as number | null,
};

export default function RegionsPage() {
  const router = useRouter();
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchRegions = useCallback(async () => {
    try {
      setError(null);
      const res = await apiGet<{ success: boolean; data: Region[] }>('/platform/regions');
      setRegions(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load regions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRegions();
  }, [fetchRegions]);

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCreate = (parentId?: number) => {
    setForm({ ...EMPTY_FORM, parentRegionId: parentId || null });
    setEditingId(null);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (region: Region) => {
    setForm({
      name: region.name,
      slug: region.slug,
      countryCode: region.countryCode,
      subdivisionCode: region.subdivisionCode || '',
      timezone: region.timezone,
      currency: region.currency,
      parentRegionId: region.parentRegionId,
    });
    setEditingId(region.id);
    setFormError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug || !form.countryCode) {
      setFormError('Name, slug, and country code are required');
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      if (editingId) {
        await apiPut(`/platform/regions/${editingId}`, form);
      } else {
        await apiPost('/platform/regions', form);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await fetchRegions();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save region');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete region "${name}"? This cannot be undone.`)) return;
    try {
      await apiDelete(`/platform/regions/${id}`);
      await fetchRegions();
    } catch (err: any) {
      setError(err.message || 'Failed to delete region');
    }
  };

  const autoSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  // Build tree: top-level (no parent) + nested
  const topLevel = regions.filter((r) => !r.parentRegionId);
  const childrenOf = (parentId: number) => regions.filter((r) => r.parentRegionId === parentId);

  const filtered = search
    ? regions.filter((r) =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.countryCode.toLowerCase().includes(search.toLowerCase()) ||
        r.slug.toLowerCase().includes(search.toLowerCase())
      )
    : topLevel;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading regions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search regions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => openCreate()}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Region
        </button>
      </div>

      {/* Form Panel */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-indigo-200 dark:border-indigo-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {editingId ? 'Edit Region' : 'New Region'}
            </h3>
            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {formError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{formError}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({ ...f, name, slug: editingId ? f.slug : autoSlug(name) }));
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                placeholder="North America"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slug *</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                placeholder="north-america"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country Code *</label>
              <input
                type="text"
                value={form.countryCode}
                onChange={(e) => setForm((f) => ({ ...f, countryCode: e.target.value.toUpperCase() }))}
                maxLength={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                placeholder="US"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subdivision Code</label>
              <input
                type="text"
                value={form.subdivisionCode}
                onChange={(e) => setForm((f) => ({ ...f, subdivisionCode: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                placeholder="US-FL"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timezone</label>
              <input
                type="text"
                value={form.timezone}
                onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                placeholder="America/New_York"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency</label>
              <input
                type="text"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
                maxLength={10}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                placeholder="USD"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-5">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingId ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Regions List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {search ? 'No regions match your search' : 'No regions created yet'}
            </p>
            {!search && (
              <button
                onClick={() => openCreate()}
                className="mt-3 text-sm text-indigo-600 hover:underline"
              >
                Create your first region
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {filtered.map((region) => {
              const children = childrenOf(region.id);
              const isExpanded = expandedIds.has(region.id);
              const hasChildren = children.length > 0 || region.childCount > 0;

              return (
                <div key={region.id}>
                  <div className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    {/* Expand toggle */}
                    <button
                      onClick={() => hasChildren && toggleExpand(region.id)}
                      className={`p-1 rounded ${hasChildren ? 'hover:bg-gray-200 dark:hover:bg-slate-600' : 'opacity-0 pointer-events-none'}`}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                    </button>

                    {/* Region info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{region.name}</h3>
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400">
                          {region.countryCode}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                          region.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {region.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-400 dark:text-gray-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {region.slug}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {region.timezone}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" /> {region.currency}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> {region.facilityCount} facilities
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openCreate(region.id)}
                        title="Add sub-region"
                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg text-gray-400 hover:text-indigo-600"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEdit(region)}
                        title="Edit"
                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg text-gray-400 hover:text-blue-600"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(region.id, region.name)}
                        title="Delete"
                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Children (nested) */}
                  {isExpanded && children.length > 0 && (
                    <div className="ml-10 border-l-2 border-indigo-100 dark:border-indigo-900">
                      {children.map((child) => (
                        <div
                          key={child.id}
                          className="flex items-center gap-3 p-3 pl-4 hover:bg-gray-50 dark:hover:bg-slate-700/50"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{child.name}</span>
                              <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400">
                                {child.countryCode}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {child.facilityCount} facilities · {child.slug}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => openEdit(child as Region)}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-600 rounded text-gray-400 hover:text-blue-600"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(child.id, child.name)}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-600 rounded text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
