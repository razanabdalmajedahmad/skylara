'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Lock, Unlock, Users, ChevronLeft, GripVertical, UserPlus, AlertTriangle, Shield, Copy } from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import Link from 'next/link';

interface Group { id: number; name: string; groupType: string; discipline: string | null; isLocked: boolean; maxSize: number; members: any[]; instructor: any | null; instructorId: number | null; }
interface Registration { id: number; firstName: string; lastName: string; numberOfJumps: number | null; licenseType: string | null; tunnelTime: number | null; gearOwnership: string | null; aadConfirmed: boolean; status: string; }

export default function GroupBoardPage() {
  const params = useParams();
  const boogieId = params?.id as string;
  const [groups, setGroups] = useState<Group[]>([]);
  const [unassigned, setUnassigned] = useState<Registration[]>([]);
  const [allRegs, setAllRegs] = useState<Registration[]>([]);
  const [dragItem, setDragItem] = useState<Registration | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);

  useEffect(() => {
    async function load() {
      const [gRes, rRes] = await Promise.all([
        apiGet<{ success: boolean; data: Group[] }>(`/boogies/${boogieId}/groups`).catch(() => null),
        apiGet<{ success: boolean; data: Registration[] }>(`/boogies/${boogieId}/registrations`).catch(() => null),
      ]);
      if (gRes?.data) setGroups(gRes.data);
      const regs = (rRes?.data || []).filter((r: any) => r.status === 'APPROVED' || r.status === 'PENDING');
      setAllRegs(regs);
      // Find unassigned
      const assignedIds = new Set((gRes?.data || []).flatMap((g: any) => (g.members || []).map((m: any) => m.registrationId)));
      setUnassigned(regs.filter((r: any) => !assignedIds.has(r.id)));
    }
    load();
  }, [boogieId]);

  const addGroup = useCallback(() => {
    setShowGroupModal(true);
  }, []);

  const toggleLock = useCallback(async (group: Group) => {
    const endpoint = group.isLocked ? 'unlock' : 'lock';
    await apiPost(`/boogies/${boogieId}/groups/${group.id}/${endpoint}`, {});
    setGroups(prev => prev.map(g => g.id === group.id ? { ...g, isLocked: !g.isLocked } : g));
  }, [boogieId]);

  // Drag and drop handlers
  const handleDragStart = (reg: Registration) => setDragItem(reg);

  const handleDrop = useCallback(async (groupId: number | 'unassigned') => {
    if (!dragItem) return;
    if (groupId === 'unassigned') {
      // Find which group the member is in and remove via API
      for (const g of groups) {
        const member = (g.members || []).find((m: any) => m.registrationId === dragItem.id);
        if (member) {
          try {
            await apiDelete(`/boogies/${boogieId}/groups/${g.id}/members/${member.id || member.registrationId}`);
          } catch {}
          break;
        }
      }
      setUnassigned(prev => [...prev, dragItem]);
      setGroups(prev => prev.map(g => ({ ...g, members: (g.members || []).filter((m: any) => m.registrationId !== dragItem.id) })));
    } else {
      // Add to group via API — persists to database
      try {
        const res = await apiPost(`/boogies/${boogieId}/groups/${groupId}/members`, {
          registrationId: dragItem.id,
          role: 'PARTICIPANT',
        });
        if (res) {
          setGroups(prev => prev.map(g =>
            g.id === groupId
              ? { ...g, members: [...(g.members || []), { id: (res as any).data?.id, registrationId: dragItem.id, role: 'PARTICIPANT' }] }
              : g
          ));
          setUnassigned(prev => prev.filter(r => r.id !== dragItem.id));
        }
      } catch { console.error('Failed to assign — check if already in a group'); }
    }
    setDragItem(null);
  }, [dragItem, boogieId, groups]);

  const AthleteCard = ({ reg, compact }: { reg: Registration; compact?: boolean }) => (
    <div
      draggable
      onDragStart={() => handleDragStart(reg)}
      className={`bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${compact ? 'text-xs' : 'text-sm'}`}
    >
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-gray-300 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 dark:text-white truncate">{reg.firstName} {reg.lastName}</div>
          <div className="flex items-center gap-2 mt-0.5 text-gray-500 dark:text-gray-400">
            <span>{reg.numberOfJumps ?? '?'} jumps</span>
            <span>·</span>
            <span>{reg.licenseType || '—'}</span>
            {reg.tunnelTime ? <><span>·</span><span>{reg.tunnelTime}h tunnel</span></> : null}
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          {reg.aadConfirmed ? (
            <Shield className="h-3.5 w-3.5 text-emerald-500" aria-label="AAD confirmed" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 text-red-500" aria-label="AAD not confirmed" />
          )}
          <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${
            reg.gearOwnership === 'OWN_RIG' ? 'bg-emerald-100 text-emerald-700' :
            reg.gearOwnership === 'RENTAL_NEEDED' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {reg.gearOwnership === 'OWN_RIG' ? 'OWN' : reg.gearOwnership === 'RENTAL_NEEDED' ? 'RENTAL' : 'GEAR?'}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900 p-4 lg:p-6">
      <div className="max-w-[1600px] mx-auto">
        <Link href={`/dashboard/boogies/${boogieId}`} className="text-purple-600 hover:text-purple-700 text-sm flex items-center gap-1 mb-4">
          <ChevronLeft className="h-4 w-4" /> Back to Event
        </Link>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <GripVertical className="h-7 w-7 text-purple-600" /> Group Board
          </h1>
          <div className="flex gap-2">
            <button onClick={addGroup} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm">
              <Plus className="h-4 w-4" /> New Group
            </button>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4">
          {/* Unassigned Column */}
          <div
            className="w-72 flex-shrink-0 bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-gray-300"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop('unassigned')}
          >
            <div className="px-4 py-3 border-b bg-gray-50 rounded-t-xl">
              <h3 className="font-bold text-gray-700 dark:text-gray-300 text-sm flex items-center gap-2">
                <Users className="h-4 w-4" /> Unassigned ({unassigned.length})
              </h3>
            </div>
            <div className="p-3 space-y-2 max-h-[70vh] overflow-y-auto">
              {unassigned.map(reg => <AthleteCard key={reg.id} reg={reg} />)}
              {unassigned.length === 0 && <p className="text-xs text-gray-400 text-center py-4">All participants assigned</p>}
            </div>
          </div>

          {/* Group Columns */}
          {groups.map(group => (
            <div
              key={group.id}
              className={`w-72 flex-shrink-0 bg-white dark:bg-slate-800 rounded-xl border ${group.isLocked ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200'}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => !group.isLocked && handleDrop(group.id)}
            >
              <div className={`px-4 py-3 border-b rounded-t-xl ${group.isLocked ? 'bg-amber-50' : 'bg-purple-50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">{group.name}</h3>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">{group.groupType}{group.discipline ? ` · ${group.discipline}` : ''} · {(group.members || []).length}/{group.maxSize}</p>
                  </div>
                  <button onClick={() => toggleLock(group)} className="p-1 hover:bg-white dark:bg-slate-800 rounded">
                    {group.isLocked ? <Lock className="h-4 w-4 text-amber-600" /> : <Unlock className="h-4 w-4 text-gray-400" />}
                  </button>
                </div>
                {group.instructor && (
                  <div className="text-[10px] text-purple-600 font-medium mt-1">Coach: {group.instructor.firstName} {group.instructor.lastName}</div>
                )}
              </div>
              <div className="p-3 space-y-2 max-h-[60vh] overflow-y-auto">
                {(group.members || []).map((m: any) => {
                  const reg = allRegs.find(r => r.id === m.registrationId);
                  return reg ? <AthleteCard key={m.registrationId} reg={reg} compact /> : null;
                })}
                {(group.members || []).length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-8">Drop athletes here</p>
                )}
              </div>
            </div>
          ))}

          {/* Add Group Card */}
          <div
            onClick={addGroup}
            className="w-72 flex-shrink-0 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl flex items-center justify-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 transition-colors min-h-[200px]"
          >
            <div className="text-center">
              <Plus className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Add Group</p>
            </div>
          </div>
        </div>
      {/* New Group Modal */}
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
              const type = (form.elements.namedItem('groupType') as HTMLSelectElement).value;
              const maxSize = parseInt((form.elements.namedItem('maxSize') as HTMLInputElement).value);
              try {
                const res = await apiPost<{ success: boolean; data: Group }>(`/boogies/${boogieId}/groups`, { name, groupType: type, maxSize });
                if (res?.data) setGroups(prev => [...prev, { ...res.data, members: [], instructor: null }]);
              } catch { /* API may not be available */ }
              setShowGroupModal(false);
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Group Name</label>
                <input name="groupName" required placeholder="e.g. Team Alpha" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select name="groupType" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-purple-500">
                  <option value="JUMP">Jump</option>
                  <option value="TUNNEL">Tunnel</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Size</label>
                <input name="maxSize" type="number" defaultValue={8} min={2} max={50} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-purple-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowGroupModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 font-medium text-sm">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm">Create Group</button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
