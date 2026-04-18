'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  X,
  Inbox,
  Search,
  Plane,
  Hotel,
  Home,
  Coffee,
  ShoppingBag,
  Layers,
  MapPin,
  Filter,
  Building2,
  ExternalLink,
} from 'lucide-react';

interface Facility {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  category: string;
  status: string;
  description: string | null;
  city: string | null;
  state: string | null;
  countryCode: string | null;
  timezone: string;
  currency: string;
  capacity: number | null;
  organizationId: number;
  regionId: number | null;
  dropzoneId: number | null;
  organization: { id: number; name: string } | null;
  region: { id: number; name: string; slug: string } | null;
  _count?: { facilityMeta: number; entitlements: number };
}

interface Region {
  id: number;
  name: string;
  slug: string;
}

interface Organization {
  id: number;
  name: string;
}

const CATEGORY_ICONS: Record<string, typeof Building2> = {
  AVIATION: Plane,
  HOTEL: Hotel,
  APARTMENT: Home,
  BUNKHOUSE: Home,
  CAFE: Coffee,
  SHOP: ShoppingBag,
  MIXED: Layers,
};

const CATEGORY_COLORS: Record<string, string> = {
  AVIATION: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  HOTEL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  APARTMENT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  BUNKHOUSE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  CAFE: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  SHOP: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  MIXED: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-600',
  SUSPENDED: 'bg-red-100 text-red-700',
  ONBOARDING: 'bg-amber-100 text-amber-700',
  ARCHIVED: 'bg-slate-100 text-slate-600',
};

const CATEGORIES = ['AVIATION', 'HOTEL', 'APARTMENT', 'BUNKHOUSE', 'CAFE', 'SHOP', 'MIXED'];
const STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'ONBOARDING', 'ARCHIVED'];

const EMPTY_FORM = {
  name: '',
  slug: '',
  organizationId: 0,
  regionId: null as number | null,
  category: 'AVIATION',
  description: '',
  city: '',
  state: '',
  countryCode: '',
  timezone: 'UTC',
  currency: 'USD',
  capacity: '',
  phone: '',
  email: '',
  website: '',
  address: '',
  postalCode: '',
};

export default function FacilitiesPage() {
  const router = useRouter();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [meta, setMeta] = useState<{ total: number; page: number; totalPages: number }>({ total: 0, page: 1, totalPages: 1 });

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchFacilities = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (filterCategory) params.set('category', filterCategory);
      if (filterStatus) params.set('status', filterStatus);
      params.set('page', meta.page.toString());
      params.set('limit', '50');

      const res = await apiGet<{ success: boolean; data: Facility[]; meta: any }>(
        `/platform/facilities?${params.toString()}`
      );
      setFacilities(res.data || []);
      if (res.meta) setMeta(res.meta);
    } catch (err: any) {
      setError(err.message || 'Failed to load facilities');
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterStatus, meta.page]);

  const fetchDependencies = useCallback(async () => {
    try {
      const [regionsRes, orgsRes] = await Promise.allSettled([
        apiGet<{ success: boolean; data: Region[] }>('/platform/regions'),
        apiGet<{ success: boolean; data: Organization[] }>('/admin/organizations'),
      ]);
      if (regionsRes.status === 'fulfilled') setRegions(regionsRes.value.data || []);
      // Organizations might come from admin endpoint or be empty
      if (orgsRes.status === 'fulfilled' && orgsRes.value.data) {
        setOrganizations(Array.isArray(orgsRes.value.data) ? orgsRes.value.data : []);
      }
    } catch {
      // Non-critical — form will still work with manual org ID
    }
  }, []);

  useEffect(() => {
    fetchFacilities();
    fetchDependencies();
  }, [fetchFacilities, fetchDependencies]);

  const autoSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, organizationId: organizations[0]?.id || 0 });
    setEditingId(null);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (f: Facility) => {
    setForm({
      name: f.name,
      slug: f.slug,
      organizationId: f.organizationId,
      regionId: f.regionId,
      category: f.category,
      description: f.description || '',
      city: f.city || '',
      state: f.state || '',
      countryCode: f.countryCode || '',
      timezone: f.timezone,
      currency: f.currency,
      capacity: f.capacity?.toString() || '',
      phone: '',
      email: '',
      website: '',
      address: '',
      postalCode: '',
    });
    setEditingId(f.id);
    setFormError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug || !form.organizationId || !form.category) {
      setFormError('Name, slug, organization, and category are required');
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const payload = {
        ...form,
        capacity: form.capacity ? parseInt(form.capacity) : null,
        organizationId: typeof form.organizationId === 'string' ? parseInt(form.organizationId) : form.organizationId,
        regionId: form.regionId || null,
      };

      if (editingId) {
        await apiPut(`/platform/facilities/${editingId}`, payload);
      } else {
        await apiPost('/platform/facilities', payload);
      }
      setShowForm(false);
      setEditingId(null);
      await fetchFacilities();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save facility');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete facility "${name}"? This cannot be undone.`)) return;
    try {
      await apiDelete(`/platform/facilities/${id}`);
      await fetchFacilities();
    } catch (err: any) {
      setError(err.message || 'Failed to delete facility');
    }
  };

  const filtered = search
    ? facilities.filter((f) =>
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.slug.toLowerCase().includes(search.toLowerCase()) ||
        f.city?.toLowerCase().includes(search.toLowerCase()) ||
        f.organization?.name.toLowerCase().includes(search.toLowerCase())
      )
    : facilities;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading facilities...</span>
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
            placeholder="Search facilities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
          ))}
        </select>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Facility
        </button>
      </div>

      {/* Form Panel */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-indigo-200 dark:border-indigo-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {editingId ? 'Edit Facility' : 'New Facility'}
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
                placeholder="SkyLara Florida HQ"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slug *</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Organization *</label>
              {organizations.length > 0 ? (
                <select
                  value={form.organizationId}
                  onChange={(e) => setForm((f) => ({ ...f, organizationId: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  <option value={0}>Select organization...</option>
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  value={form.organizationId || ''}
                  onChange={(e) => setForm((f) => ({ ...f, organizationId: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  placeholder="Organization ID"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Region</label>
              <select
                value={form.regionId ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, regionId: e.target.value ? parseInt(e.target.value) : null }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="">No region</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                placeholder="Deland"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State / Province</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                placeholder="Florida"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timezone</label>
              <input
                type="text"
                value={form.timezone}
                onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Capacity</label>
              <input
                type="number"
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                placeholder="100"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              placeholder="Brief description of this facility..."
            />
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

      {/* Facilities Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 text-center py-16">
          <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {search || filterCategory || filterStatus ? 'No facilities match your filters' : 'No facilities registered yet'}
          </p>
          {!search && !filterCategory && !filterStatus && (
            <button onClick={openCreate} className="mt-3 text-sm text-indigo-600 hover:underline">
              Register your first facility
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((facility) => {
            const CatIcon = CATEGORY_ICONS[facility.category] || Building2;
            const catColor = CATEGORY_COLORS[facility.category] || 'bg-gray-100 text-gray-700';
            const statusColor = STATUS_COLORS[facility.status] || 'bg-gray-100 text-gray-600';

            return (
              <div
                key={facility.id}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2.5 rounded-lg ${catColor}`}>
                      <CatIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{facility.name}</h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{facility.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(facility)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-600 rounded text-gray-400 hover:text-blue-600"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(facility.id, facility.name)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-600 rounded text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${catColor}`}>
                    {facility.category}
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${statusColor}`}>
                    {facility.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                  {facility.organization && (
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3 h-3" />
                      <span className="truncate">{facility.organization.name}</span>
                    </div>
                  )}
                  {facility.region && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{facility.region.name}</span>
                    </div>
                  )}
                  {(facility.city || facility.state) && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">
                        {[facility.city, facility.state, facility.countryCode].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  {facility.capacity && (
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3 h-3" />
                      <span>Capacity: {facility.capacity}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{meta.total} facilities total</p>
          <div className="flex gap-2">
            <button
              onClick={() => setMeta((m) => ({ ...m, page: m.page - 1 }))}
              disabled={meta.page <= 1}
              className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 text-sm text-gray-500">
              Page {meta.page} of {meta.totalPages}
            </span>
            <button
              onClick={() => setMeta((m) => ({ ...m, page: m.page + 1 }))}
              disabled={meta.page >= meta.totalPages}
              className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
