'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { Award, Plus, X, Shield, ChevronLeft, ChevronRight } from 'lucide-react';

interface Certificate {
  id: string;
  recipientName?: string;
  recipientEmail?: string;
  userId: number;
  courseTitle?: string;
  courseId?: string;
  type: string;
  title: string;
  issuedAt: string;
  verificationCode: string;
  visibility: string;
  isRevoked: boolean;
  revokedReason?: string;
  expiresAt?: string;
}

interface CertificatesResponse {
  certificates: Certificate[];
  total: number;
  page: number;
  totalPages: number;
}

const CERT_TYPES = [
  'COURSE_COMPLETION', 'SKILL_ASSESSMENT', 'ATTENDANCE',
  'INSTRUCTOR', 'COACH', 'RATING', 'LICENSE', 'CUSTOM',
];

const VISIBILITY_OPTIONS = ['PUBLIC', 'PRIVATE', 'UNLISTED'];

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Issue modal
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState({
    userId: '',
    type: 'COURSE_COMPLETION',
    title: '',
    courseId: '',
    eventId: '',
    eventType: '',
    visibility: 'PUBLIC',
    expiresAt: '',
  });
  const [issueSubmitting, setIssueSubmitting] = useState(false);
  const [issueError, setIssueError] = useState('');

  // Revoke modal
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeSubmitting, setRevokeSubmitting] = useState(false);

  const fetchCertificates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet<{ success: boolean; data: Certificate[]; meta?: { total: number; page: number; totalPages: number } }>(
        `/learning/admin/certificates?page=${page}&limit=20`
      );
      if (res.success) {
        setCertificates(res.data || []);
        setTotal(res.meta?.total || 0);
        setTotalPages(res.meta?.totalPages || 1);
      }
    } catch {
      setError('Failed to load certificates.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  const handleIssue = async () => {
    if (!issueForm.userId || !issueForm.title.trim()) return;
    setIssueSubmitting(true);
    setIssueError('');
    try {
      const payload: Record<string, any> = {
        userId: Number(issueForm.userId),
        type: issueForm.type,
        title: issueForm.title,
        visibility: issueForm.visibility,
      };
      if (issueForm.courseId) payload.courseId = issueForm.courseId;
      if (issueForm.eventId) payload.eventId = issueForm.eventId;
      if (issueForm.eventType) payload.eventType = issueForm.eventType;
      if (issueForm.expiresAt) payload.expiresAt = new Date(issueForm.expiresAt).toISOString();

      await apiPost('/learning/certificates/issue', payload);
      setIssueForm({
        userId: '', type: 'COURSE_COMPLETION', title: '', courseId: '',
        eventId: '', eventType: '', visibility: 'PUBLIC', expiresAt: '',
      });
      setShowIssueModal(false);
      await fetchCertificates();
    } catch (err: any) {
      setIssueError(err?.message || 'Failed to issue certificate.');
    } finally {
      setIssueSubmitting(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeId) return;
    setRevokeSubmitting(true);
    try {
      await apiPost(`/learning/certificates/${revokeId}/revoke`, {
        reason: revokeReason,
      });
      setRevokeId(null);
      setRevokeReason('');
      await fetchCertificates();
    } catch {
      setError('Failed to revoke certificate.');
    } finally {
      setRevokeSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Certificates</h1>
        <button
          onClick={() => { setIssueError(''); setShowIssueModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#1B4F72] text-white rounded-lg hover:bg-[#164063] transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Issue Certificate
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#1B4F72] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : certificates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Award className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">No certificates issued yet</p>
            <button
              onClick={() => { setIssueError(''); setShowIssueModal(true); }}
              className="px-4 py-2 bg-[#1B4F72] text-white rounded-lg hover:bg-[#164063] transition-colors text-sm font-medium"
            >
              Issue First Certificate
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Recipient</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Issued</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Verification</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Visibility</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {certificates.map((cert) => (
                    <tr key={cert.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900 dark:text-white">
                          {cert.recipientName || cert.recipientEmail || `User #${cert.userId}`}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-700 dark:text-gray-300">{cert.title}</p>
                        {cert.courseTitle && (
                          <p className="text-xs text-gray-400">{cert.courseTitle}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                          {cert.type?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(cert.issuedAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 px-2 py-1 rounded">
                          {cert.verificationCode}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{cert.visibility}</span>
                      </td>
                      <td className="px-4 py-3">
                        {cert.isRevoked ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                            Revoked
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!cert.isRevoked && (
                          <button
                            onClick={() => { setRevokeId(cert.id); setRevokeReason(''); }}
                            className="text-xs text-red-600 hover:text-red-800 font-medium"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-slate-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {certificates.length} of {total} certificates
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300 px-2">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Issue Certificate Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Issue Certificate</h3>
              <button
                onClick={() => setShowIssueModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {issueError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                  {issueError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  User ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={issueForm.userId}
                  onChange={(e) => setIssueForm((f) => ({ ...f, userId: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent"
                  placeholder="User ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={issueForm.title}
                  onChange={(e) => setIssueForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent"
                  placeholder="Certificate title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Certificate Type</label>
                <select
                  value={issueForm.type}
                  onChange={(e) => setIssueForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent bg-white dark:bg-slate-800"
                >
                  {CERT_TYPES.map((t) => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course ID</label>
                  <input
                    type="text"
                    value={issueForm.courseId}
                    onChange={(e) => setIssueForm((f) => ({ ...f, courseId: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Event ID</label>
                  <input
                    type="text"
                    value={issueForm.eventId}
                    onChange={(e) => setIssueForm((f) => ({ ...f, eventId: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Event Type</label>
                  <input
                    type="text"
                    value={issueForm.eventType}
                    onChange={(e) => setIssueForm((f) => ({ ...f, eventType: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Visibility</label>
                  <select
                    value={issueForm.visibility}
                    onChange={(e) => setIssueForm((f) => ({ ...f, visibility: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent bg-white dark:bg-slate-800"
                  >
                    {VISIBILITY_OPTIONS.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expires At</label>
                <input
                  type="date"
                  value={issueForm.expiresAt}
                  onChange={(e) => setIssueForm((f) => ({ ...f, expiresAt: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleIssue}
                  disabled={issueSubmitting || !issueForm.userId || !issueForm.title.trim()}
                  className="px-4 py-2 bg-[#1B4F72] text-white rounded-lg hover:bg-[#164063] transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {issueSubmitting ? 'Issuing...' : 'Issue Certificate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Modal */}
      {revokeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revoke Certificate</h3>
              <button
                onClick={() => setRevokeId(null)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                <Shield className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700">
                  This action cannot be undone. The certificate will be permanently marked as revoked.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason for revocation</label>
                <textarea
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent resize-none"
                  placeholder="Reason for revoking this certificate..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setRevokeId(null)}
                  className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRevoke}
                  disabled={revokeSubmitting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {revokeSubmitting ? 'Revoking...' : 'Revoke Certificate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
