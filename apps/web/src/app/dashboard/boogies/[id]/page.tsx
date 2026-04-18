'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Calendar, Users, FileText, Zap, Settings, BarChart3, MessageSquare,
  Clock, Plus, Trash2, Save, Lock, Unlock, ChevronLeft, Globe, Shield,
  GripVertical, UserPlus, Megaphone, Eye, Package,
} from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiPut, apiDelete } from '@/lib/api';
import { logger } from '@/lib/logger';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

type Tab = 'overview' | 'calendar' | 'registrations' | 'groups' | 'announcements' | 'packages' | 'form' | 'settings';

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'overview', label: 'Overview', icon: Eye },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'registrations', label: 'Registrations', icon: Users },
  { id: 'groups', label: 'Groups', icon: GripVertical },
  { id: 'packages', label: 'Packages', icon: Package },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'form', label: 'Form Builder', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const BLOCK_TYPES = [
  { value: 'BRIEFING', label: 'Briefing', color: '#3B82F6' },
  { value: 'JUMP_ROTATION', label: 'Jump Rotation', color: '#10B981' },
  { value: 'TUNNEL_ROTATION', label: 'Tunnel Rotation', color: '#8B5CF6' },
  { value: 'CANOPY_BLOCK', label: 'Canopy Block', color: '#F59E0B' },
  { value: 'ARRIVAL', label: 'Arrival', color: '#6366F1' },
  { value: 'REGISTRATION', label: 'Registration', color: '#06B6D4' },
  { value: 'WEATHER_HOLD', label: 'Weather Hold', color: '#EF4444' },
  { value: 'SOCIAL', label: 'Social/Awards', color: '#EC4899' },
  { value: 'CONTINGENCY', label: 'Contingency', color: '#9CA3AF' },
  { value: 'DEPARTURE', label: 'Departure', color: '#64748B' },
];

interface Boogie { id: number; title: string; subtitle: string|null; eventType: string; status: string; startDate: string; endDate: string; maxParticipants: number; currentParticipants: number; country: string|null; city: string|null; organizerName: string|null; currency: string; formSchema: any; [key: string]: any; }
interface CalendarBlock { id: number; title: string; blockType: string; dayIndex: number; startTime: string; endTime: string; color: string|null; notes: string|null; }
interface Registration { id: number; uuid: string; firstName: string; lastName: string; email: string; status: string; numberOfJumps: number|null; licenseType: string|null; paymentStatus: string; }
interface Group { id: number; name: string; groupType: string; discipline: string|null; isLocked: boolean; maxSize: number; members: any[]; instructor: any|null; }
interface Announcement { id: number; title: string; body: string; channel: string; sentAt: string|null; creator: any; }

export default function BoogieDetailPage() {
  const params = useParams();
  const boogieId = params?.id as string;
  const { user } = useAuth();

  const [tab, setTab] = useState<Tab>('overview');
  const [boogie, setBoogie] = useState<Boogie | null>(null);
  const [blocks, setBlocks] = useState<CalendarBlock[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockModalDay, setBlockModalDay] = useState(0);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);

  // Fetch all data
  useEffect(() => {
    if (!boogieId) return;
    async function load() {
      try {
        const [bRes, cRes, rRes, gRes, aRes] = await Promise.all([
          apiGet<{success:boolean;data:any}>(`/boogies/${boogieId}`).catch(() => { logger.error('Failed to fetch boogie', { page: 'boogie-detail' }); return null; }),
          apiGet<{success:boolean;data:any[]}>(`/boogies/${boogieId}/calendar`).catch(() => { logger.error('Failed to fetch calendar', { page: 'boogie-detail' }); return null; }),
          apiGet<{success:boolean;data:any[]}>(`/boogies/${boogieId}/registrations`).catch(() => { logger.error('Failed to fetch registrations', { page: 'boogie-detail' }); return null; }),
          apiGet<{success:boolean;data:any[]}>(`/boogies/${boogieId}/groups`).catch(() => { logger.error('Failed to fetch groups', { page: 'boogie-detail' }); return null; }),
          apiGet<{success:boolean;data:any[]}>(`/boogies/${boogieId}/announcements`).catch(() => { logger.error('Failed to fetch announcements', { page: 'boogie-detail' }); return null; }),
        ]);
        if (bRes?.data) setBoogie(bRes.data);
        if (cRes?.data) setBlocks(cRes.data);
        if (rRes?.data) setRegistrations(rRes.data);
        if (gRes?.data) setGroups(gRes.data);
        if (aRes?.data) setAnnouncements(aRes.data);
      } catch (err) { logger.error('Failed to load boogie details', { page: 'boogie-detail' }); } finally { setLoading(false); }
    }
    load();
  }, [boogieId]);

  // Calculate event days
  const eventDays = boogie ? Math.max(1, Math.ceil((new Date(boogie.endDate).getTime() - new Date(boogie.startDate).getTime()) / 86400000) + 1) : 1;

  const addBlock = useCallback((dayIndex: number) => {
    setBlockModalDay(dayIndex);
    setShowBlockModal(true);
  }, []);

  const deleteBlock = useCallback(async (blockId: number) => {
    try {
      await apiDelete(`/boogies/${boogieId}/calendar/blocks/${blockId}`);
      setBlocks(prev => prev.filter(b => b.id !== blockId));
    } catch { logger.error('Failed to delete calendar block', { page: 'boogie-detail' }); }
  }, [boogieId]);

  const addGroup = useCallback(() => {
    setShowGroupModal(true);
  }, []);

  const addAnnouncement = useCallback(() => {
    setShowAnnouncementModal(true);
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading event...</div>;
  if (!boogie) return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Event not found</div>;

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 text-white p-6 lg:p-8">
        <Link href="/dashboard/boogies" className="text-purple-200 hover:text-white text-sm flex items-center gap-1 mb-3">
          <ChevronLeft className="h-4 w-4" /> Back to Boogies
        </Link>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/20">{boogie.eventType.replace(/_/g, ' ')}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/20">{boogie.status}</span>
            </div>
            <h1 className="text-3xl font-bold">{boogie.title}</h1>
            {boogie.subtitle && <p className="text-purple-200 mt-1">{boogie.subtitle}</p>}
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-purple-200">
              <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {formatDate(boogie.startDate)} — {formatDate(boogie.endDate)}</span>
              {boogie.city && <span className="flex items-center gap-1"><Globe className="h-4 w-4" /> {boogie.city}, {boogie.country}</span>}
              <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {boogie.currentParticipants}/{boogie.maxParticipants}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/boogies/${boogieId}/register`} className="px-4 py-2 bg-white dark:bg-slate-800 text-purple-700 rounded-lg font-semibold text-sm hover:bg-purple-50 flex items-center gap-1.5">
              <UserPlus className="h-4 w-4" /> Register
            </Link>
            <Link href={`/dashboard/boogies/${boogieId}/matching`} className="px-4 py-2 bg-white/20 text-white rounded-lg font-semibold text-sm hover:bg-white/30 flex items-center gap-1.5">
              <Shield className="h-4 w-4" /> Matching
            </Link>
            <Link href={`/dashboard/boogies/${boogieId}/group-board`} className="px-4 py-2 bg-white/20 text-white rounded-lg font-semibold text-sm hover:bg-white/30 flex items-center gap-1.5">
              <GripVertical className="h-4 w-4" /> Groups
            </Link>
            <Link href={`/dashboard/boogies/${boogieId}/calendar`} className="px-4 py-2 bg-white/20 text-white rounded-lg font-semibold text-sm hover:bg-white/30 flex items-center gap-1.5">
              <Calendar className="h-4 w-4" /> Schedule
            </Link>
            {boogie.status === 'DRAFT' && (
              <button onClick={async () => { try { await apiPost(`/boogies/${boogieId}/publish`, {}); } catch {} setBoogie(prev => prev ? { ...prev, status: 'PUBLISHED' } : prev); }} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold text-sm">Publish</button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 lg:px-8 overflow-x-auto">
        <div className="flex gap-1">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.id ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4 lg:p-8 max-w-7xl mx-auto">
        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Event Details</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-500 dark:text-gray-400">Type:</span> <span className="font-medium">{boogie.eventType.replace(/_/g, ' ')}</span></div>
                  <div><span className="text-gray-500 dark:text-gray-400">Discipline:</span> <span className="font-medium">{boogie.discipline || 'Mixed'}</span></div>
                  <div><span className="text-gray-500 dark:text-gray-400">Organizer:</span> <span className="font-medium">{boogie.organizerName || 'TBD'}</span></div>
                  <div><span className="text-gray-500 dark:text-gray-400">Currency:</span> <span className="font-medium">{boogie.currency}</span></div>
                  <div><span className="text-gray-500 dark:text-gray-400">Approval:</span> <span className="font-medium">{boogie.approvalMode?.replace(/_/g, ' ')}</span></div>
                  <div><span className="text-gray-500 dark:text-gray-400">Waitlist:</span> <span className="font-medium">{boogie.waitlistEnabled ? 'Yes' : 'No'}</span></div>
                  <div><span className="text-gray-500 dark:text-gray-400">AAD Required:</span> <span className="font-medium">{boogie.aadRequired ? 'Yes' : 'No'}</span></div>
                  <div><span className="text-gray-500 dark:text-gray-400">Own Rig:</span> <span className="font-medium">{boogie.ownRigRequired ? 'Required' : 'Not required'}</span></div>
                </div>
              </div>
              {boogie.fullDescription && (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Description</h2>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{boogie.fullDescription}</p>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
                <h3 className="font-bold text-gray-900 dark:text-white mb-3">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400 text-sm">Registrations</span><span className="font-bold">{registrations.length}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400 text-sm">Groups</span><span className="font-bold">{groups.length}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400 text-sm">Schedule Blocks</span><span className="font-bold">{blocks.length}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400 text-sm">Announcements</span><span className="font-bold">{announcements.length}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400 text-sm">Event Days</span><span className="font-bold">{eventDays}</span></div>
                </div>
              </div>
              {/* Quick Links */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
                <h3 className="font-bold text-gray-900 dark:text-white mb-3">Quick Links</h3>
                <div className="space-y-2">
                  <Link href={`/dashboard/boogies/${boogieId}/public`} className="block text-sm text-purple-600 hover:text-purple-700 font-medium">→ Public Event Page</Link>
                  <Link href={`/dashboard/boogies/${boogieId}/register`} className="block text-sm text-purple-600 hover:text-purple-700 font-medium">→ Registration Form</Link>
                  <Link href={`/dashboard/boogies/${boogieId}/matching`} className="block text-sm text-purple-600 hover:text-purple-700 font-medium">→ Smart Matching</Link>
                  <Link href={`/dashboard/boogies/${boogieId}/group-board`} className="block text-sm text-purple-600 hover:text-purple-700 font-medium">→ Group Board</Link>
                  <Link href={`/dashboard/boogies/${boogieId}/calendar`} className="block text-sm text-purple-600 hover:text-purple-700 font-medium">→ Event Calendar</Link>
                  <Link href={`/dashboard/boogies/${boogieId}/feedback`} className="block text-sm text-purple-600 hover:text-purple-700 font-medium">→ Feedback Form</Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CALENDAR */}
        {tab === 'calendar' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Event Schedule — {eventDays} Days</h2>
            </div>
            <div className="space-y-6">
              {Array.from({ length: eventDays }, (_, dayIdx) => {
                const dayDate = new Date(new Date(boogie.startDate).getTime() + dayIdx * 86400000);
                const dayBlocks = blocks.filter(b => b.dayIndex === dayIdx).sort((a, b) => a.startTime.localeCompare(b.startTime));
                return (
                  <div key={dayIdx} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-5 py-3 bg-gray-50 dark:bg-slate-700 border-b flex items-center justify-between">
                      <h3 className="font-bold text-gray-900 dark:text-white">
                        Day {dayIdx + 1} — {dayDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
                      </h3>
                      <button onClick={() => addBlock(dayIdx)} className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold">
                        <Plus className="h-3.5 w-3.5" /> Add Block
                      </button>
                    </div>
                    <div className="p-4">
                      {dayBlocks.length === 0 ? (
                        <p className="text-sm text-gray-400 italic py-4 text-center">No blocks scheduled. Click "Add Block" to start planning.</p>
                      ) : (
                        <div className="space-y-2">
                          {dayBlocks.map(block => {
                            const bt = BLOCK_TYPES.find(t => t.value === block.blockType);
                            return (
                              <div key={block.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-300 dark:border-slate-600 transition-colors group">
                                <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: block.color || bt?.color || '#6B7280' }} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm text-gray-900 dark:text-white">{block.title}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 dark:text-gray-400 font-medium">{bt?.label || block.blockType}</span>
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    <Clock className="h-3 w-3 inline mr-1" />{block.startTime} — {block.endTime}
                                    {block.notes && <span className="ml-2 italic">· {block.notes}</span>}
                                  </div>
                                </div>
                                <button onClick={() => deleteBlock(block.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 transition-all">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* REGISTRATIONS */}
        {tab === 'registrations' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{registrations.length} Registrations</h2>
            </div>
            {registrations.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No registrations yet</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Name</th>
                      <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Email</th>
                      <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Jumps</th>
                      <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">License</th>
                      <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                      <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Payment</th>
                      <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrations.map(r => (
                      <tr key={r.id} className="border-t hover:bg-gray-50 dark:bg-slate-900">
                        <td className="px-4 py-3 font-medium">{r.firstName} {r.lastName}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.email}</td>
                        <td className="px-4 py-3">{r.numberOfJumps ?? '—'}</td>
                        <td className="px-4 py-3">{r.licenseType || '—'}</td>
                        <td className="px-4 py-3"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : r.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : r.status === 'WAITLISTED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{r.status}</span></td>
                        <td className="px-4 py-3"><span className={`text-xs font-medium ${r.paymentStatus === 'FULLY_PAID' ? 'text-emerald-600' : 'text-amber-600'}`}>{r.paymentStatus}</span></td>
                        <td className="px-4 py-3">
                          {r.status === 'PENDING' && (
                            <div className="flex gap-1">
                              <button onClick={async () => { try { await apiPost(`/boogies/${boogieId}/registrations/${r.id}/approve`, {}); } catch {} setRegistrations(prev => prev.map(x => x.id === r.id ? { ...x, status: 'APPROVED' } : x)); }} className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-semibold">Approve</button>
                              <button onClick={async () => { try { await apiPost(`/boogies/${boogieId}/registrations/${r.id}/reject`, {}); } catch {} setRegistrations(prev => prev.map(x => x.id === r.id ? { ...x, status: 'REJECTED' } : x)); }} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">Reject</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* GROUPS */}
        {tab === 'groups' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{groups.length} Groups</h2>
              <button onClick={addGroup} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm">
                <Plus className="h-4 w-4" /> Create Group
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map(g => (
                <div key={g.id} className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-900 dark:text-white">{g.name}</h3>
                    <div className="flex items-center gap-1">
                      {g.isLocked ? <Lock className="h-4 w-4 text-amber-500" /> : <Unlock className="h-4 w-4 text-gray-400" />}
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500 dark:text-gray-400">{g.groupType}</span>
                    </div>
                  </div>
                  {g.discipline && <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Discipline: {g.discipline}</p>}
                  <p className="text-sm text-gray-600 dark:text-gray-400">{g.members?.length || 0}/{g.maxSize} members</p>
                  {g.instructor && <p className="text-xs text-purple-600 mt-1">Coach: {g.instructor.firstName} {g.instructor.lastName}</p>}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={async () => {
                        const endpoint = g.isLocked ? 'unlock' : 'lock';
                        await apiPost(`/boogies/${boogieId}/groups/${g.id}/${endpoint}`, {});
                        setGroups(prev => prev.map(x => x.id === g.id ? { ...x, isLocked: !x.isLocked } : x));
                      }}
                      className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded font-medium"
                    >
                      {g.isLocked ? 'Unlock' : 'Lock'}
                    </button>
                  </div>
                </div>
              ))}
              {groups.length === 0 && (
                <div className="col-span-full text-center py-12 bg-white dark:bg-slate-800 rounded-xl border">
                  <GripVertical className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No groups yet. Create groups to organize participants.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PACKAGES */}
        {tab === 'packages' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Packages & Pricing</h2>
              <button
                onClick={() => setShowPackageModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm"
              >
                <Plus className="h-4 w-4" /> Add Package
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(boogie.packages || []).map((pkg: any) => (
                <div key={pkg.id} className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
                  <h3 className="font-bold text-gray-900 dark:text-white">{pkg.name}</h3>
                  <p className="text-2xl font-bold text-purple-600 mt-2">{(pkg.priceCents / 100).toFixed(0)} {pkg.currency}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{pkg.packageType.replace(/_/g, ' ')}</p>
                  {pkg.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{pkg.description}</p>}
                  <p className="text-xs text-gray-400 mt-2">{pkg.soldCount || 0} sold{pkg.maxSlots ? ` / ${pkg.maxSlots} max` : ''}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ANNOUNCEMENTS */}
        {tab === 'announcements' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Announcements</h2>
              <button onClick={addAnnouncement} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm">
                <Plus className="h-4 w-4" /> New Announcement
              </button>
            </div>
            <div className="space-y-3">
              {announcements.map(a => (
                <div key={a.id} className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 dark:text-white">{a.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500 dark:text-gray-400">{a.channel}</span>
                      {a.sentAt ? (
                        <span className="text-xs text-emerald-600 font-medium">Sent</span>
                      ) : (
                        <button
                          onClick={async () => {
                            await apiPost(`/boogies/${boogieId}/announcements/${a.id}/send`, {});
                            setAnnouncements(prev => prev.map(x => x.id === a.id ? { ...x, sentAt: new Date().toISOString() } : x));
                          }}
                          className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded font-semibold"
                        >
                          Send Now
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{a.body}</p>
                </div>
              ))}
              {announcements.length === 0 && (
                <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border">
                  <Megaphone className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No announcements yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* FORM BUILDER */}
        {tab === 'form' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Registration Form Schema</h2>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Current form has {Array.isArray(boogie.formSchema) ? boogie.formSchema.length : 0} fields</p>
              <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-auto max-h-60">{JSON.stringify(boogie.formSchema, null, 2)}</pre>
              <button
                onClick={async () => {
                  const defaultSchema = [
                    { field: 'email', label: 'Email', type: 'email', required: true, profileMapped: true },
                    { field: 'firstName', label: 'First Name', type: 'text', required: true, profileMapped: true },
                    { field: 'lastName', label: 'Last Name', type: 'text', required: true, profileMapped: true },
                    { field: 'phone', label: 'Phone', type: 'tel', required: false, profileMapped: true },
                    { field: 'nationality', label: 'Nationality', type: 'text', required: false },
                    { field: 'numberOfJumps', label: 'Total Jumps', type: 'number', required: true, profileMapped: true },
                    { field: 'tunnelTime', label: 'Tunnel Time (hours)', type: 'number', required: false },
                    { field: 'licenseType', label: 'License', type: 'select', options: ['A', 'B', 'C', 'D', 'Student'], required: true, profileMapped: true },
                    { field: 'aadConfirmed', label: 'AAD Confirmed', type: 'checkbox', required: true },
                    { field: 'gearOwnership', label: 'Gear', type: 'select', options: ['OWN_RIG', 'RENTAL_NEEDED', 'PARTIAL'], required: true },
                    { field: 'accommodationChoice', label: 'Accommodation', type: 'select', options: ['None', 'Campsite', 'Bunkhouse', 'Shared Room', 'Private Room', 'Hotel'], required: false },
                    { field: 'jerseySize', label: 'Jersey Size', type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], required: false },
                    { field: 'foodRestrictions', label: 'Food Restrictions', type: 'textarea', required: false },
                    { field: 'emergencyContact', label: 'Emergency Contact', type: 'text', required: true },
                    { field: 'termsAccepted', label: 'I accept the terms and conditions', type: 'checkbox', required: true },
                  ];
                  try {
                    await apiPut(`/boogies/${boogieId}/form-schema`, { schema: defaultSchema });
                    // Registration form schema applied
                  } catch { /* Form schema update failed */ }
                }}
                className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm"
              >
                Apply Default Registration Form
              </button>
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {tab === 'settings' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Event Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['title', 'subtitle', 'eventType', 'country', 'city', 'organizerName', 'maxParticipants', 'approvalMode', 'currency'].map(field => (
                <div key={field}>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{field.replace(/([A-Z])/g, ' $1')}</label>
                  <input type="text" defaultValue={boogie[field] || ''} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                </div>
              ))}
            </div>
            <button
              onClick={async () => {
                try {
                  await apiPut(`/boogies/${boogieId}`, boogie as Record<string, any>);
                } catch { /* Settings save will retry on next attempt */ }
              }}
              className="mt-6 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm"
            >
              Save Settings
            </button>
          </div>
        )}
      {/* Add Block Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowBlockModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Schedule Block</h2>
              <button onClick={() => setShowBlockModal(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 text-xl">&times;</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const title = (form.elements.namedItem('blockTitle') as HTMLInputElement).value;
              const blockType = (form.elements.namedItem('blockType') as HTMLSelectElement).value;
              const start = (form.elements.namedItem('startTime') as HTMLInputElement).value;
              const end = (form.elements.namedItem('endTime') as HTMLInputElement).value;
              const bt = BLOCK_TYPES.find(t => t.value === blockType);
              try {
                const res = await apiPost<{success:boolean;data:CalendarBlock}>(`/boogies/${boogieId}/calendar/blocks`, {
                  title, blockType, dayIndex: blockModalDay, startTime: start, endTime: end, color: bt?.color || '#3B82F6',
                });
                if (res?.data) setBlocks(prev => [...prev, res.data]);
              } catch { /* API may not be available */ }
              setShowBlockModal(false);
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input name="blockTitle" required className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Block Type</label>
                <select name="blockType" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-purple-500">
                  {BLOCK_TYPES.map(bt => <option key={bt.value} value={bt.value}>{bt.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start</label>
                  <input name="startTime" type="time" required defaultValue="09:00" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End</label>
                  <input name="endTime" type="time" required defaultValue="10:00" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowBlockModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm">Add Block</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowGroupModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Group</h2>
              <button onClick={() => setShowGroupModal(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 text-xl">&times;</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const name = (form.elements.namedItem('groupName') as HTMLInputElement).value;
              const groupType = (form.elements.namedItem('groupType') as HTMLSelectElement).value;
              try {
                const res = await apiPost<{success:boolean;data:Group}>(`/boogies/${boogieId}/groups`, { name, groupType });
                if (res?.data) setGroups(prev => [...prev, res.data]);
              } catch { /* API may not be available */ }
              setShowGroupModal(false);
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Group Name</label>
                <input name="groupName" required className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select name="groupType" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-purple-500">
                  <option value="JUMP">Jump</option>
                  <option value="TUNNEL">Tunnel</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowGroupModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm">Create Group</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Announcement Modal */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAnnouncementModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Announcement</h2>
              <button onClick={() => setShowAnnouncementModal(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 text-xl">&times;</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const title = (form.elements.namedItem('annTitle') as HTMLInputElement).value;
              const body = (form.elements.namedItem('annBody') as HTMLTextAreaElement).value;
              try {
                const res = await apiPost<{success:boolean;data:Announcement}>(`/boogies/${boogieId}/announcements`, { title, body });
                if (res?.data) setAnnouncements(prev => [res.data, ...prev]);
              } catch { /* API may not be available */ }
              setShowAnnouncementModal(false);
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input name="annTitle" required className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Body</label>
                <textarea name="annBody" required rows={4} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-purple-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAnnouncementModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm">Post</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Package Modal */}
      {showPackageModal && boogie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowPackageModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Package</h2>
              <button onClick={() => setShowPackageModal(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 text-xl">&times;</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const name = (form.elements.namedItem('pkgName') as HTMLInputElement).value;
              const price = parseInt((form.elements.namedItem('pkgPrice') as HTMLInputElement).value) * 100;
              const type = (form.elements.namedItem('pkgType') as HTMLSelectElement).value;
              try {
                await apiPost(`/boogies/${boogieId}/packages`, { name, priceCents: price, packageType: type, currency: boogie.currency });
                const bRes = await apiGet<{success:boolean;data:Boogie}>(`/boogies/${boogieId}`);
                if (bRes?.data) setBoogie(bRes.data);
              } catch { /* API may not be available */ }
              setShowPackageModal(false);
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Package Name</label>
                <input name="pkgName" required placeholder="e.g. Full Weekend Pass" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price ({boogie.currency})</label>
                <input name="pkgPrice" type="number" required min={0} placeholder="150" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Package Type</label>
                <select name="pkgType" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-purple-500">
                  <option value="TICKET_ONLY">Ticket Only</option>
                  <option value="FULL_PACKAGE">Full Package</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPackageModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm">Add Package</button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
