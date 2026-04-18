'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import {
  Plus,
  Settings,
  Trash2,
  Download,
  Share2,
  ChevronDown,
  AlertCircle,
  Grid,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Table as TableIcon,
  TrendingUp,
  MoreVertical,
  X,
} from 'lucide-react';

interface Dashboard {
  id: string;
  name: string;
  description: string;
  shared: boolean;
  blocks: DashboardBlock[];
}

interface DashboardBlock {
  id: string;
  type: 'KPI_CARD' | 'LINE_CHART' | 'BAR_CHART' | 'PIE_CHART' | 'DATA_TABLE' | 'HEATMAP' | 'FUNNEL';
  title: string;
  dataSource: string;
  width: number; // 1-12 columns
  height: number; // 1-12 rows
  x: number; // position
  y: number; // position
  settings?: {
    dateRange?: { start: string; end: string };
    groupBy?: string;
    colorTheme?: string;
  };
}

interface Template {
  id: string;
  name: string;
  description: string;
}

const TEMPLATES: Template[] = [
  { id: 'dz_manager', name: 'DZ Manager', description: 'Monitor operations and jumpers' },
  { id: 'coach', name: 'Coach Dashboard', description: 'Track student progress' },
  { id: 'manifest', name: 'Manifest View', description: 'Daily load planning' },
  { id: 'admin', name: 'Admin Panel', description: 'System-wide metrics' },
];

const BLOCK_TYPES = [
  { id: 'KPI_CARD', name: 'KPI Card', icon: TrendingUp },
  { id: 'LINE_CHART', name: 'Line Chart', icon: LineChartIcon },
  { id: 'BAR_CHART', name: 'Bar Chart', icon: BarChart3 },
  { id: 'PIE_CHART', name: 'Pie Chart', icon: PieChartIcon },
  { id: 'DATA_TABLE', name: 'Data Table', icon: TableIcon },
  { id: 'HEATMAP', name: 'Heatmap', icon: Grid },
];

export default function ReportBuilderPage() {
  const { user } = useAuth();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [currentDashboard, setCurrentDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showNewDashboardModal, setShowNewDashboardModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState<string | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState('');
  const [newDashboardDesc, setNewDashboardDesc] = useState('');
  const [selectedBlockType, setSelectedBlockType] = useState<string>('KPI_CARD');
  const [selectedDataSource, setSelectedDataSource] = useState('');
  const [draggedBlock, setDraggedBlock] = useState<DashboardBlock | null>(null);

  const mapApiBlock = useCallback((b: any): DashboardBlock => {
    const pos = b.position || {};
    const sz = b.size || {};
    return {
      id: b.id,
      type: (b.blockType || b.type) as DashboardBlock['type'],
      title: b.title,
      dataSource: b.dataSource,
      width: typeof sz.width === 'number' ? sz.width : 4,
      height: typeof sz.height === 'number' ? sz.height : 3,
      x: typeof pos.x === 'number' ? pos.x : 0,
      y: typeof pos.y === 'number' ? pos.y : 0,
      settings: b.config,
    };
  }, []);

  const mapApiDashboardDetail = useCallback(
    (detail: any): Dashboard => ({
      id: detail.id,
      name: detail.name,
      description: detail.description || '',
      shared: !!detail.isShared,
      blocks: (detail.blocks || []).map(mapApiBlock),
    }),
    [mapApiBlock]
  );

  // Fetch dashboards
  useEffect(() => {
    const fetchDashboards = async () => {
      try {
        const response = await apiGet<{
          dashboards: Array<{ id: string; name: string; description?: string; isShared: boolean; blockCount: number; createdAt: string }>;
        }>('/reports/dashboards');
        const summaries = response.dashboards || [];
        const shells: Dashboard[] = summaries.map((d) => ({
          id: d.id,
          name: d.name,
          description: d.description || '',
          shared: d.isShared,
          blocks: [],
        }));
        setDashboards(shells);
        if (shells.length > 0) {
          const detail = await apiGet<any>(`/reports/dashboards/${shells[0].id}`);
          setCurrentDashboard(mapApiDashboardDetail(detail));
        } else {
          setCurrentDashboard(null);
        }
        setError(null);
      } catch (err) {
        console.error('Failed to fetch dashboards:', err);
        setDashboards([]);
        setCurrentDashboard(null);
        setError(err instanceof Error ? err.message : 'Failed to load dashboards');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboards();
    }
  }, [user, mapApiDashboardDetail]);

  const handleCreateDashboard = async () => {
    if (!newDashboardName.trim()) return;

    try {
      const response = await apiPost<any>('/reports/dashboards', {
        name: newDashboardName,
        description: newDashboardDesc,
      });

      const mapped = mapApiDashboardDetail(response);
      setDashboards((prev) => [mapped, ...prev]);
      setCurrentDashboard(mapped);
      setNewDashboardName('');
      setNewDashboardDesc('');
      setShowNewDashboardModal(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create dashboard');
    }
  };

  const handleAddBlock = async () => {
    if (!currentDashboard || !selectedDataSource.trim()) return;

    try {
      const y = Math.max(0, ...currentDashboard.blocks.map((b) => b.y + b.height));
      const raw = await apiPost<any>(`/reports/dashboards/${currentDashboard.id}/blocks`, {
        blockType: selectedBlockType,
        title: `New ${selectedBlockType}`,
        dataSource: selectedDataSource,
        position: { x: 0, y },
        size: { width: 4, height: 3 },
      });

      const uiBlock = mapApiBlock(raw);
      setCurrentDashboard((prev) => (prev ? { ...prev, blocks: [...prev.blocks, uiBlock] } : null));

      setSelectedDataSource('');
      setShowAddPanel(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add block');
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!currentDashboard) return;

    try {
      await apiDelete(`/reports/blocks/${blockId}`);
      setCurrentDashboard((prev) =>
        prev
          ? {
              ...prev,
              blocks: prev.blocks.filter((b) => b.id !== blockId),
            }
          : null
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete block');
    }
  };

  const handleExport = (format: 'csv' | 'json') => {
    if (!currentDashboard) return;

    // Mock export - in production, this would call an API
    const data = {
      dashboard: currentDashboard,
      exportedAt: new Date().toISOString(),
    };

    const dataStr = format === 'json' ? JSON.stringify(data, null, 2) : csvFromData(data);
    const dataBlob = new Blob([dataStr], {
      type: format === 'json' ? 'application/json' : 'text/csv',
    });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard-${Date.now()}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLoadTemplate = async (templateId: string) => {
    try {
      const response = await apiPost<any>(`/reports/dashboards/from-template`, {
        templateId,
      });

      const mapped = mapApiDashboardDetail(response);
      setDashboards((prev) => [mapped, ...prev]);
      setCurrentDashboard(mapped);
      setShowTemplateModal(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-slate-800 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 dark:border-slate-700 dark:border-gray-700 border-t-blue-500"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-800 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Report Builder
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Create custom dashboards to visualize your data
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowNewDashboardModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Dashboard
            </button>
            <button
              onClick={() => setShowTemplateModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 font-medium transition-colors"
            >
              <Grid className="w-5 h-5" />
              From Template
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Dashboard Selector & Controls */}
        {dashboards.length > 0 && (
          <div className="mb-8 flex items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700">
            <div className="flex-1">
              <select
                value={currentDashboard?.id || ''}
                onChange={async (e) => {
                  const id = e.target.value;
                  if (!id) return;
                  try {
                    const detail = await apiGet<any>(`/reports/dashboards/${id}`);
                    const mapped = mapApiDashboardDetail(detail);
                    setCurrentDashboard(mapped);
                    setDashboards((prev) =>
                      prev.map((d) => (d.id === mapped.id ? { ...d, blocks: mapped.blocks } : d))
                    );
                  } catch {
                    setError('Failed to load dashboard');
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {dashboards.map((dash) => (
                  <option key={dash.id} value={dash.id}>
                    {dash.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors relative"
              >
                <Share2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                {showShareMenu && (
                  <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 dark:bg-gray-700 border border-gray-200 dark:border-slate-700 dark:border-gray-600 rounded-lg shadow-lg z-10">
                    <button
                      onClick={() => {
                        handleExport('csv');
                        setShowShareMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export CSV
                    </button>
                    <button
                      onClick={() => {
                        handleExport('json');
                        setShowShareMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2 border-t border-gray-200 dark:border-slate-700 dark:border-gray-600"
                    >
                      <Download className="w-4 h-4" />
                      Export JSON
                    </button>
                  </div>
                )}
              </button>

              <button
                onClick={() => setShowAddPanel(!showAddPanel)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
        )}

        {/* Grid Layout for Blocks */}
        {currentDashboard && (
          <div className="grid grid-cols-12 gap-4 auto-rows-max">
            {currentDashboard.blocks.map((block) => (
              <BlockCard
                key={block.id}
                block={block}
                onSettings={() => setShowSettingsModal(block.id)}
                onDelete={() => handleDeleteBlock(block.id)}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {(!currentDashboard || currentDashboard.blocks.length === 0) && (
          <div className="text-center py-12">
            <Grid className="w-16 h-16 text-gray-400 dark:text-gray-600 dark:text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No blocks yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create your first dashboard block to get started
            </p>
            <button
              onClick={() => setShowAddPanel(true)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Add Your First Block
            </button>
          </div>
        )}

        {/* Add Block Panel */}
        {showAddPanel && (
          <div className="fixed bottom-0 right-0 top-0 w-96 bg-white dark:bg-slate-800 dark:bg-gray-800 border-l border-gray-200 dark:border-slate-700 dark:border-gray-700 shadow-lg z-40 flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Add Block
              </h3>
              <button
                onClick={() => setShowAddPanel(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Block Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {BLOCK_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setSelectedBlockType(type.id)}
                        className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                          selectedBlockType === type.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-slate-700 dark:border-gray-700 hover:border-gray-300 dark:border-slate-600 dark:hover:border-gray-600'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs font-medium text-center">{type.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Data Source
                </label>
                <input
                  type="text"
                  value={selectedDataSource}
                  onChange={(e) => setSelectedDataSource(e.target.value)}
                  placeholder="e.g., jumps, revenue, bookings"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-slate-700 dark:border-gray-700 space-y-2">
              <button
                onClick={handleAddBlock}
                disabled={!selectedDataSource.trim()}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add Block
              </button>
              <button
                onClick={() => setShowAddPanel(false)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Dashboard Modal */}
      {showNewDashboardModal && (
        <Modal
          title="Create New Dashboard"
          onClose={() => setShowNewDashboardModal(false)}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Dashboard Name
              </label>
              <input
                type="text"
                value={newDashboardName}
                onChange={(e) => setNewDashboardName(e.target.value)}
                placeholder="e.g., Monthly Revenue"
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={newDashboardDesc}
                onChange={(e) => setNewDashboardDesc(e.target.value)}
                placeholder="Optional description"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleCreateDashboard}
                disabled={!newDashboardName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => setShowNewDashboardModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <Modal
          title="Choose a Template"
          onClose={() => setShowTemplateModal(false)}
        >
          <div className="space-y-3">
            {TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => handleLoadTemplate(template.id)}
                className="w-full text-left p-4 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <p className="font-medium text-gray-900 dark:text-white">{template.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{template.description}</p>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* Block Settings Modal */}
      {showSettingsModal && (
        <Modal
          title="Block Settings"
          onClose={() => setShowSettingsModal(null)}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title
              </label>
              <input
                type="text"
                placeholder="Block title"
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date Range
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  type="date"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function BlockCard({
  block,
  onSettings,
  onDelete,
}: {
  block: DashboardBlock;
  onSettings: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      style={{
        gridColumn: `span ${Math.min(block.width, 12)}`,
        gridRow: `span ${block.height}`,
      }}
      className="bg-white dark:bg-slate-800 dark:bg-gray-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-xl overflow-hidden group hover:shadow-lg dark:hover:shadow-2xl transition-shadow"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
          {block.title}
        </h3>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onSettings}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
          >
            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex items-center justify-center min-h-[200px]">
        <BlockVisualization block={block} />
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-xs text-gray-600 dark:text-gray-400">
        {block.dataSource}
      </div>
    </div>
  );
}

function BlockVisualization({ block }: { block: DashboardBlock }) {
  switch (block.type) {
    case 'KPI_CARD':
      return (
        <div className="text-center w-full">
          <p className="text-4xl font-bold text-gray-900 dark:text-white mb-2">2,453</p>
          <p className="text-sm text-green-600 dark:text-green-400 flex items-center justify-center gap-1">
            <TrendingUp className="w-4 h-4" />
            +12.5% vs last period
          </p>
        </div>
      );

    case 'LINE_CHART':
      return (
        <svg viewBox="0 0 300 150" className="w-full h-full">
          <polyline
            points="10,120 50,90 90,110 130,60 170,80 210,40 250,70 290,20"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
          />
          <circle cx="10" cy="120" r="3" fill="#3b82f6" />
          <circle cx="50" cy="90" r="3" fill="#3b82f6" />
          <circle cx="90" cy="110" r="3" fill="#3b82f6" />
          <circle cx="130" cy="60" r="3" fill="#3b82f6" />
          <circle cx="170" cy="80" r="3" fill="#3b82f6" />
          <circle cx="210" cy="40" r="3" fill="#3b82f6" />
          <circle cx="250" cy="70" r="3" fill="#3b82f6" />
          <circle cx="290" cy="20" r="3" fill="#3b82f6" />
        </svg>
      );

    case 'BAR_CHART':
      return (
        <svg viewBox="0 0 300 150" className="w-full h-full">
          {[30, 80, 50, 100, 70, 90, 60].map((height, i) => (
            <rect
              key={i}
              x={10 + i * 40}
              y={130 - height}
              width="30"
              height={height}
              fill="#3b82f6"
              opacity="0.8"
            />
          ))}
        </svg>
      );

    case 'PIE_CHART':
      return (
        <svg viewBox="0 0 150 150" className="w-24 h-24 mx-auto">
          <circle cx="75" cy="75" r="60" fill="none" stroke="#3b82f6" strokeWidth="20" strokeDasharray="94.2 339.3" />
          <circle cx="75" cy="75" r="60" fill="none" stroke="#10b981" strokeWidth="20" strokeDasharray="84.8 339.3" style={{ transform: 'rotate(98deg)', transformOrigin: 'center' }} />
          <circle cx="75" cy="75" r="60" fill="none" stroke="#f59e0b" strokeWidth="20" strokeDasharray="66 339.3" style={{ transform: 'rotate(178deg)', transformOrigin: 'center' }} />
        </svg>
      );

    case 'DATA_TABLE':
      return (
        <div className="w-full text-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700">
                <th className="text-left py-2 px-2 font-semibold text-gray-600 dark:text-gray-400">Name</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 dark:text-gray-400">Value</th>
              </tr>
            </thead>
            <tbody>
              {['Item 1', 'Item 2', 'Item 3'].map((item) => (
                <tr key={item} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="py-2 px-2">{item}</td>
                  <td className="py-2 px-2">$1,234</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'HEATMAP':
      return (
        <div className="grid grid-cols-5 gap-1">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div
              key={i}
              className="w-6 h-6 rounded"
              style={{
                backgroundColor: ['#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e'][i % 5],
              }}
            />
          ))}
        </div>
      );

    case 'FUNNEL':
      return (
        <div className="space-y-2 w-full">
          {[100, 75, 50, 25].map((width, i) => (
            <div
              key={i}
              className="h-6 bg-blue-500 rounded"
              style={{ width: `${width}%`, marginLeft: 'auto' }}
            />
          ))}
        </div>
      );

    default:
      return <div className="text-gray-400">Block</div>;
  }
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function csvFromData(data: any): string {
  // Simple CSV export
  return JSON.stringify(data);
}
