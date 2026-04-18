'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Calendar, Plus, Trash2, Clock, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import Link from 'next/link';

const BLOCK_TYPES = [
  { value: 'ARRIVAL', label: 'Arrival', color: '#6366F1', emoji: '✈️' },
  { value: 'REGISTRATION', label: 'Check-In', color: '#06B6D4', emoji: '📋' },
  { value: 'BRIEFING', label: 'Briefing', color: '#3B82F6', emoji: '🎤' },
  { value: 'JUMP_ROTATION', label: 'Jump Rotation', color: '#10B981', emoji: '🪂' },
  { value: 'TUNNEL_ROTATION', label: 'Tunnel Session', color: '#8B5CF6', emoji: '🌀' },
  { value: 'CANOPY_BLOCK', label: 'Canopy Coaching', color: '#F59E0B', emoji: '🪂' },
  { value: 'WEATHER_HOLD', label: 'Weather Hold', color: '#EF4444', emoji: '⛈️' },
  { value: 'SOCIAL', label: 'Social/Awards', color: '#EC4899', emoji: '🎉' },
  { value: 'CONTINGENCY', label: 'Contingency', color: '#9CA3AF', emoji: '⏳' },
  { value: 'DEPARTURE', label: 'Departure', color: '#64748B', emoji: '👋' },
];

interface CalBlock { id: number; title: string; blockType: string; dayIndex: number; startTime: string; endTime: string; color: string | null; notes: string | null; }

export default function CalendarPage() {
  const params = useParams();
  const boogieId = params?.id as string;
  const [boogie, setBoogie] = useState<any>(null);
  const [blocks, setBlocks] = useState<CalBlock[]>([]);
  const [view, setView] = useState<'week' | 'day'>('week');
  const [selectedDay, setSelectedDay] = useState(0);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockModalDay, setBlockModalDay] = useState(0);
  const [blockModalType, setBlockModalType] = useState('');

  useEffect(() => {
    async function load() {
      const [bRes, cRes] = await Promise.all([
        apiGet<{ success: boolean; data: any }>(`/boogies/${boogieId}`).catch(() => null),
        apiGet<{ success: boolean; data: CalBlock[] }>(`/boogies/${boogieId}/calendar`).catch(() => null),
      ]);
      if (bRes?.data) setBoogie(bRes.data);
      if (cRes?.data) setBlocks(cRes.data);
    }
    load();
  }, [boogieId]);

  const eventDays = boogie ? Math.max(1, Math.ceil((new Date(boogie.endDate).getTime() - new Date(boogie.startDate).getTime()) / 86400000) + 1) : 7;

  const addBlock = useCallback((dayIndex: number, blockType: string) => {
    setBlockModalDay(dayIndex);
    setBlockModalType(blockType);
    setShowBlockModal(true);
  }, []);

  const deleteBlock = useCallback(async (blockId: number) => {
    await apiDelete(`/boogies/${boogieId}/calendar/blocks/${blockId}`);
    setBlocks(prev => prev.filter(b => b.id !== blockId));
  }, [boogieId]);

  const getDayDate = (idx: number) => boogie ? new Date(new Date(boogie.startDate).getTime() + idx * 86400000) : new Date();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        <Link href={`/dashboard/boogies/${boogieId}`} className="text-purple-600 text-sm flex items-center gap-1 mb-4"><ChevronLeft className="h-4 w-4" /> Back</Link>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3"><Calendar className="h-7 w-7 text-purple-600" /> Event Calendar</h1>
          <div className="flex gap-2">
            <button onClick={() => setView('week')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${view === 'week' ? 'bg-purple-600 text-white' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border'}`}>Week</button>
            <button onClick={() => setView('day')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${view === 'day' ? 'bg-purple-600 text-white' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border'}`}>Day</button>
          </div>
        </div>

        {/* Block type palette */}
        <div className="flex flex-wrap gap-2 mb-6 bg-white dark:bg-slate-800 rounded-xl p-3 border">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium self-center mr-2">Add block:</span>
          {BLOCK_TYPES.map(bt => (
            <button
              key={bt.value}
              onClick={() => addBlock(view === 'day' ? selectedDay : 0, bt.value)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border hover:shadow-sm transition-shadow"
              style={{ borderColor: bt.color, color: bt.color }}
            >
              <span>{bt.emoji}</span> {bt.label}
            </button>
          ))}
        </div>

        {/* Day selector for day view */}
        {view === 'day' && (
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => setSelectedDay(Math.max(0, selectedDay - 1))} className="p-1 hover:bg-gray-200 rounded"><ChevronLeft className="h-5 w-5" /></button>
            <span className="font-bold">Day {selectedDay + 1} — {getDayDate(selectedDay).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
            <button onClick={() => setSelectedDay(Math.min(eventDays - 1, selectedDay + 1))} className="p-1 hover:bg-gray-200 rounded"><ChevronRight className="h-5 w-5" /></button>
          </div>
        )}

        {/* Calendar Grid */}
        {view === 'week' ? (
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(eventDays, 7)}, 1fr)` }}>
            {Array.from({ length: Math.min(eventDays, 7) }, (_, dayIdx) => {
              const dayBlocks = blocks.filter(b => b.dayIndex === dayIdx).sort((a, b) => a.startTime.localeCompare(b.startTime));
              return (
                <div key={dayIdx} className="bg-white dark:bg-slate-800 rounded-xl border min-h-[300px]">
                  <div className="px-3 py-2 border-b bg-gray-50 rounded-t-xl text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Day {dayIdx + 1}</div>
                    <div className="text-sm font-bold">{getDayDate(dayIdx).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}</div>
                  </div>
                  <div className="p-2 space-y-1">
                    {dayBlocks.map(block => {
                      const bt = BLOCK_TYPES.find(t => t.value === block.blockType);
                      return (
                        <div key={block.id} className="p-2 rounded-lg text-xs group relative" style={{ backgroundColor: (block.color || bt?.color || '#6B7280') + '15', borderLeft: `3px solid ${block.color || bt?.color || '#6B7280'}` }}>
                          <div className="font-semibold">{bt?.emoji} {block.title}</div>
                          <div className="text-gray-500 dark:text-gray-400">{block.startTime}–{block.endTime}</div>
                          <button onClick={() => deleteBlock(block.id)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                    {dayBlocks.length === 0 && <p className="text-[10px] text-gray-300 text-center py-4">Empty</p>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Day View — Timeline */
          <div className="bg-white dark:bg-slate-800 rounded-xl border">
            <div className="p-4">
              {blocks.filter(b => b.dayIndex === selectedDay).sort((a, b) => a.startTime.localeCompare(b.startTime)).map(block => {
                const bt = BLOCK_TYPES.find(t => t.value === block.blockType);
                return (
                  <div key={block.id} className="flex items-stretch gap-4 mb-3 group">
                    <div className="w-20 text-right flex-shrink-0 pt-2">
                      <div className="text-sm font-bold text-gray-900 dark:text-white">{block.startTime}</div>
                      <div className="text-xs text-gray-400">{block.endTime}</div>
                    </div>
                    <div className="w-1 rounded-full flex-shrink-0" style={{ backgroundColor: block.color || bt?.color || '#6B7280' }} />
                    <div className="flex-1 p-3 rounded-lg border" style={{ borderColor: (block.color || bt?.color) + '40' }}>
                      <div className="font-semibold text-sm">{bt?.emoji} {block.title}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{bt?.label} · {block.startTime} — {block.endTime}</div>
                      {block.notes && <p className="text-xs text-gray-400 mt-1 italic">{block.notes}</p>}
                    </div>
                    <button onClick={() => deleteBlock(block.id)} className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 self-center">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
              {blocks.filter(b => b.dayIndex === selectedDay).length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No blocks scheduled for this day</p>
                </div>
              )}
            </div>
          </div>
        )}
      {/* Add Block Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowBlockModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add {BLOCK_TYPES.find(t => t.value === blockModalType)?.label || 'Block'}</h2>
              <button onClick={() => setShowBlockModal(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 text-xl">&times;</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const title = (form.elements.namedItem('blockTitle') as HTMLInputElement).value;
              const start = (form.elements.namedItem('startTime') as HTMLInputElement).value;
              const end = (form.elements.namedItem('endTime') as HTMLInputElement).value;
              const bt = BLOCK_TYPES.find(t => t.value === blockModalType);
              try {
                const res = await apiPost<{ success: boolean; data: CalBlock }>(`/boogies/${boogieId}/calendar/blocks`, {
                  title, blockType: blockModalType, dayIndex: blockModalDay, startTime: start, endTime: end, color: bt?.color,
                });
                if (res?.data) setBlocks(prev => [...prev, res.data]);
              } catch { /* API may not be available */ }
              setShowBlockModal(false);
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input name="blockTitle" required defaultValue={BLOCK_TYPES.find(t => t.value === blockModalType)?.label || ''} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-purple-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
                  <input name="startTime" type="time" required defaultValue="09:00" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Time</label>
                  <input name="endTime" type="time" required defaultValue="10:00" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowBlockModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 font-medium text-sm">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm">Add Block</button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
