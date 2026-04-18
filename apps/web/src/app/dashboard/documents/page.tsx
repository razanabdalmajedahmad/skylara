'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Shield,
  CreditCard,
  Wrench,
  Upload,
  Search,
  Filter,
  Download,
  Eye,
  Trash2,
  Plus,
  CheckCircle,
  AlertCircle,
  Clock,
  FolderOpen,
  User,
} from 'lucide-react';
import { apiGet } from '@/lib/api';

// ============================================================================
// DOCUMENT CATEGORIES
// ============================================================================

type DocCategory = 'all' | 'waivers' | 'rig_cards' | 'personal_id' | 'certifications' | 'system' | 'medical';

interface Document {
  id: string;
  title: string;
  category: DocCategory;
  type: string; // PDF, IMAGE, SIGNED_WAIVER, RIG_CARD, etc.
  ownerName: string;
  ownerId: string;
  uploadedBy: string;
  uploadedAt: string;
  expiresAt?: string;
  status: 'valid' | 'expiring' | 'expired' | 'pending_review' | 'archived';
  fileSize?: string;
  notes?: string;
  tags: string[];
}

const CATEGORY_CONFIG: Record<DocCategory, { label: string; icon: any; color: string; bg: string }> = {
  all: { label: 'All Documents', icon: FolderOpen, color: 'text-gray-700', bg: 'bg-gray-100' },
  waivers: { label: 'Waivers & Liability', icon: Shield, color: 'text-blue-700', bg: 'bg-blue-50' },
  rig_cards: { label: 'Rig Cards & Gear Docs', icon: Wrench, color: 'text-emerald-700', bg: 'bg-emerald-50' },
  personal_id: { label: 'Personal ID & Passports', icon: CreditCard, color: 'text-purple-700', bg: 'bg-purple-50' },
  certifications: { label: 'Licenses & Certifications', icon: CheckCircle, color: 'text-sky-700', bg: 'bg-sky-50' },
  system: { label: 'System Documents', icon: FileText, color: 'text-gray-700', bg: 'bg-gray-50' },
  medical: { label: 'Medical & Insurance', icon: AlertCircle, color: 'text-red-700', bg: 'bg-red-50' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  valid: { label: 'Valid', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  expiring: { label: 'Expiring Soon', color: 'text-amber-700', bg: 'bg-amber-50' },
  expired: { label: 'Expired', color: 'text-red-700', bg: 'bg-red-50' },
  pending_review: { label: 'Pending Review', color: 'text-blue-700', bg: 'bg-blue-50' },
  archived: { label: 'Archived', color: 'text-gray-500', bg: 'bg-gray-100' },
};

// ============================================================================
// COMPONENT
// ============================================================================

function mapDocTypeToCategory(t: string): DocCategory {
  const u = t.toUpperCase();
  if (u.includes('WAIVER') || u.includes('LIABILITY')) return 'waivers';
  if (u.includes('RIG') || u.includes('GEAR')) return 'rig_cards';
  if (u.includes('PHOTO') || u.includes('ID') || u.includes('PASSPORT')) return 'personal_id';
  if (u.includes('MEDICAL') || u.includes('INSURANCE')) return 'medical';
  if (u.includes('CERT') || u.includes('LICENSE')) return 'certifications';
  return 'system';
}

function mapRowStatus(status: string, expiresAt: string | null): Document['status'] {
  if (status === 'EXPIRED') return 'expired';
  if (status === 'REJECTED') return 'archived';
  if (status === 'PENDING') return 'pending_review';
  if (expiresAt) {
    const t = new Date(expiresAt).getTime();
    if (t < Date.now()) return 'expired';
    if (t < Date.now() + 30 * 86400000) return 'expiring';
  }
  if (status === 'VERIFIED') return 'valid';
  return 'pending_review';
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<DocCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    async function fetchDocs() {
      try {
        setLoadError(null);
        const res = await apiGet<{
          documents: Array<{
            id: string;
            title: string;
            documentType: string;
            status: string;
            expiresAt: string | null;
            createdAt: string;
            ownerName: string;
            ownerUserId: number;
            fileUrl: string | null;
          }>;
        }>('/onboarding/dropzone-documents');

        const realDocs: Document[] = (res.documents || []).map((d) => ({
          id: d.id,
          title: d.title,
          category: mapDocTypeToCategory(d.documentType),
          type: d.documentType,
          ownerName: d.ownerName,
          ownerId: String(d.ownerUserId),
          uploadedBy: 'Dropzone records',
          uploadedAt: d.createdAt.split('T')[0],
          expiresAt: d.expiresAt ? d.expiresAt.split('T')[0] : undefined,
          status: mapRowStatus(d.status, d.expiresAt),
          tags: [d.documentType],
        }));

        setDocuments(realDocs);
      } catch {
        setDocuments([]);
        setLoadError('Could not load documents for this dropzone.');
      }
    }
    fetchDocs();
  }, []);

  // Filter documents
  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
      const matchesSearch = searchQuery === '' ||
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [documents, selectedCategory, searchQuery]);

  // Stats
  const stats = {
    total: documents.length,
    valid: documents.filter(d => d.status === 'valid').length,
    expiring: documents.filter(d => d.status === 'expiring').length,
    expired: documents.filter(d => d.status === 'expired').length,
    pending: documents.filter(d => d.status === 'pending_review').length,
  };

  const categories = Object.entries(CATEGORY_CONFIG).filter(([k]) => k !== 'all');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <FolderOpen className="h-8 w-8 text-sky-600" />
              Documents
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Waivers, rig cards, personal IDs, certifications, and system documents
            </p>
            {loadError && (
              <p className="text-amber-700 dark:text-amber-300 text-sm mt-2">{loadError}</p>
            )}
          </div>
          <button
            type="button"
            disabled
            title="Document uploads are routed through user profiles and onboarding flows."
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-300 dark:bg-slate-600 text-gray-600 dark:text-gray-300 rounded-lg font-semibold cursor-not-allowed"
          >
            <Upload className="h-5 w-5" />
            Upload (use onboarding / profile)
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-900', bg: 'bg-white' },
            { label: 'Valid', value: stats.valid, color: 'text-emerald-700', bg: 'bg-emerald-50' },
            { label: 'Expiring', value: stats.expiring, color: 'text-amber-700', bg: 'bg-amber-50' },
            { label: 'Expired', value: stats.expired, color: 'text-red-700', bg: 'bg-red-50' },
            { label: 'Pending', value: stats.pending, color: 'text-blue-700', bg: 'bg-blue-50' },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.bg} rounded-lg p-4 border border-gray-200 dark:border-slate-700`}>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color} mt-1`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-sky-600 text-white'
                : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50'
            }`}
          >
            All ({documents.length})
          </button>
          {categories.map(([key, config]) => {
            const count = documents.filter(d => d.category === key).length;
            const Icon = config.icon;
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(key as DocCategory)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === key
                    ? 'bg-sky-600 text-white'
                    : `${config.bg} ${config.color} border border-gray-200 dark:border-slate-700 hover:opacity-80`
                }`}
              >
                <Icon className="h-4 w-4" />
                {config.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title, owner, or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
          />
        </div>

        {/* Document List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No documents found</p>
            </div>
          ) : (
            filtered.map((doc) => {
              const catConfig = CATEGORY_CONFIG[doc.category] || CATEGORY_CONFIG.system;
              const statusConfig = STATUS_CONFIG[doc.status] || STATUS_CONFIG.valid;
              const CatIcon = catConfig.icon;

              return (
                <div
                  key={doc.id}
                  className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-10 h-10 ${catConfig.bg} rounded-lg flex items-center justify-center`}>
                      <CatIcon className={`h-5 w-5 ${catConfig.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{doc.title}</h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <User className="h-3 w-3" /> {doc.ownerName}
                            </span>
                            <span className="text-xs text-gray-400">Uploaded {doc.uploadedAt}</span>
                            {doc.expiresAt && (
                              <span className="text-xs text-gray-400">Expires {doc.expiresAt}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusConfig.bg} ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                      </div>
                      {doc.notes && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">{doc.notes}</p>
                      )}
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {doc.tags.map((tag) => (
                          <span key={tag} className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 rounded-full">
                            {tag}
                          </span>
                        ))}
                        {doc.fileSize && (
                          <span className="text-[10px] text-gray-400 ml-auto">{doc.fileSize}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button
                        onClick={() => setSelectedDoc(doc)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        title="View"
                      >
                        <Eye className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      </button>
                      <button
                        onClick={() => { /* Document download via S3 URL when backend is available */ }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Document Detail Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedDoc(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{selectedDoc.title}</h2>
                <button onClick={() => setSelectedDoc(null)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 text-xl">&times;</button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Category</label>
                  <p className="mt-1 text-sm font-medium">{CATEGORY_CONFIG[selectedDoc.category]?.label}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</label>
                  <p className="mt-1">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${STATUS_CONFIG[selectedDoc.status]?.bg} ${STATUS_CONFIG[selectedDoc.status]?.color}`}>
                      {STATUS_CONFIG[selectedDoc.status]?.label}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Owner</label>
                  <p className="mt-1 text-sm">{selectedDoc.ownerName}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Uploaded By</label>
                  <p className="mt-1 text-sm">{selectedDoc.uploadedBy}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Upload Date</label>
                  <p className="mt-1 text-sm">{selectedDoc.uploadedAt}</p>
                </div>
                {selectedDoc.expiresAt && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Expires</label>
                    <p className="mt-1 text-sm">{selectedDoc.expiresAt}</p>
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Document Type</label>
                  <p className="mt-1 text-sm">{selectedDoc.type}</p>
                </div>
                {selectedDoc.fileSize && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">File Size</label>
                    <p className="mt-1 text-sm">{selectedDoc.fileSize}</p>
                  </div>
                )}
              </div>
              {selectedDoc.notes && (
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Notes</label>
                  <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{selectedDoc.notes}</p>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tags</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedDoc.tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-slate-700 rounded-full text-gray-600 dark:text-gray-400">{tag}</span>
                  ))}
                </div>
              </div>
              <div className="pt-4 border-t flex gap-2">
                <button
                  onClick={() => { /* Document download via S3 URL when backend is available */ }}
                  className="flex-1 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <Download className="h-4 w-4" /> Download
                </button>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
