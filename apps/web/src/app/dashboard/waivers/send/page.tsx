'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import {
  Send, Mail, MessageSquare, Smartphone, Bell, Users, Search,
  Calendar, CheckCircle2, Plus, Filter, Globe, ChevronLeft, Loader2,
} from 'lucide-react';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WaiverOption { id: string; title: string; type: string; version: number }
interface RecipientOption { id: string; name: string; email: string; phone?: string; type: string }
interface SegmentOption { id: string; name: string; count: number }

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const WAIVER_OPTIONS: WaiverOption[] = [
  { id: 'wt1', title: 'Tandem Skydive Liability Waiver', type: 'TANDEM', version: 4 },
  { id: 'wt2', title: 'AFF Student Waiver', type: 'AFF', version: 3 },
  { id: 'wt3', title: 'Experienced Jumper Waiver', type: 'EXPERIENCED', version: 2 },
  { id: 'wt4', title: 'Spectator Waiver', type: 'SPECTATOR', version: 1 },
];

const SEGMENT_OPTIONS: SegmentOption[] = [
  { id: 'seg1', name: 'Upcoming Tandem Bookings', count: 12 },
  { id: 'seg2', name: 'AFF Students - Active', count: 8 },
  { id: 'seg3', name: 'Visiting Jumpers - This Week', count: 5 },
  { id: 'seg4', name: 'Missing Waiver', count: 7 },
  { id: 'seg5', name: 'Expiring Waivers (30 days)', count: 15 },
];

const CHANNEL_OPTIONS = [
  { key: 'EMAIL', label: 'Email', icon: Mail, color: 'text-blue-500', desc: 'Send signing link via email' },
  { key: 'WHATSAPP', label: 'WhatsApp', icon: MessageSquare, color: 'text-green-500', desc: 'Send via WhatsApp message' },
  { key: 'PUSH', label: 'Push', icon: Smartphone, color: 'text-purple-500', desc: 'Mobile push notification' },
  { key: 'IN_APP', label: 'In-App', icon: Bell, color: 'text-orange-500', desc: 'In-app notification' },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function WaiverSendPage() {
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get('templateId');
  const [step, setStep] = useState(preselectedId ? 2 : 1);
  const [waiverOptions, setWaiverOptions] = useState<WaiverOption[]>(WAIVER_OPTIONS);
  const [selectedWaiver, setSelectedWaiver] = useState<string | null>(preselectedId);
  const [recipientMode, setRecipientMode] = useState<'segment' | 'manual'>('manual');
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [manualEmails, setManualEmails] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['EMAIL']);
  const [scheduleType, setScheduleType] = useState<'now' | 'later'>('now');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet<any[]>('/waivers/templates');
        const mapped = data.filter((t: any) => t.status === 'PUBLISHED').map((t: any) => ({
          id: String(t.id),
          title: t.title,
          type: t.waiverType,
          version: t.currentVersion || t.versions?.[0]?.version || 1,
        }));
        if (mapped.length) setWaiverOptions(mapped);
      } catch {}
    })();
  }, []);

  const selectedWaiverObj = waiverOptions.find((w) => w.id === selectedWaiver);
  const selectedSegmentObj = SEGMENT_OPTIONS.find((s) => s.id === selectedSegment);

  const toggleChannel = (ch: string) => {
    setSelectedChannels((prev) => prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]);
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const recipients = recipientMode === 'manual'
        ? manualEmails.split('\n').filter(Boolean).map((email) => ({ email: email.trim() }))
        : [{ name: selectedSegmentObj?.name || 'Segment' }];
      for (const ch of selectedChannels) {
        await apiPost('/waivers/send', {
          templateId: parseInt(selectedWaiver || '0'),
          channel: ch,
          recipients,
        });
      }
    } catch {}
    setSending(false);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-4">Waiver Requests Sent!</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {selectedWaiverObj?.title} has been sent to {recipientMode === 'segment' ? `${selectedSegmentObj?.count} recipients` : 'manual recipients'} via {selectedChannels.join(', ')}.
          </p>
          <div className="flex gap-3 mt-6 justify-center">
            <Link href="/dashboard/waivers" className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Back to Waivers</Link>
            <Link href="/dashboard/waivers" className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">View Waivers</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/waivers" className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><ChevronLeft className="w-5 h-5" /></Link>
            <div><h1 className="text-xl font-bold text-gray-900 dark:text-white">Send Waiver</h1><p className="text-xs text-gray-500 dark:text-gray-400">Step {step} of 4</p></div>
          </div>
          <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${(step / 4) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Step 1: Select Waiver */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Select Waiver Template</h2>
            <div className="space-y-2">
              {waiverOptions.map((w) => (
                <button key={w.id} onClick={() => { setSelectedWaiver(w.id); setStep(2); }} className={`w-full text-left p-4 rounded-xl border-2 transition-colors ${selectedWaiver === w.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-white dark:bg-slate-800 dark:bg-gray-800 hover:border-gray-300'}`}>
                  <p className="font-medium text-gray-900 dark:text-white">{w.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{w.type} &middot; v{w.version}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select Recipients */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Select Recipients</h2>
            <div className="flex gap-3">
              <button onClick={() => setRecipientMode('segment')} className={`flex-1 p-4 rounded-xl border-2 text-center ${recipientMode === 'segment' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-white dark:bg-slate-800 dark:bg-gray-800'}`}>
                <Users className="w-6 h-6 mx-auto mb-1 text-blue-500" /><p className="text-sm font-medium text-gray-900 dark:text-white">By Segment</p>
              </button>
              <button onClick={() => setRecipientMode('manual')} className={`flex-1 p-4 rounded-xl border-2 text-center ${recipientMode === 'manual' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-white dark:bg-slate-800 dark:bg-gray-800'}`}>
                <Mail className="w-6 h-6 mx-auto mb-1 text-blue-500" /><p className="text-sm font-medium text-gray-900 dark:text-white">Manual Entry</p>
              </button>
            </div>
            {recipientMode === 'segment' ? (
              <div className="space-y-2">
                {SEGMENT_OPTIONS.map((s) => (
                  <button key={s.id} onClick={() => setSelectedSegment(s.id)} className={`w-full text-left p-3 rounded-lg border ${selectedSegment === s.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-white dark:bg-slate-800 dark:bg-gray-800'} flex items-center justify-between`}>
                    <span className="text-sm text-gray-900 dark:text-white">{s.name}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{s.count}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Enter email addresses (one per line)</label>
                <textarea value={manualEmails} onChange={(e) => setManualEmails(e.target.value)} rows={5} placeholder="john@example.com&#10;jane@example.com" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Back</button>
              <button onClick={() => setStep(3)} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">Next</button>
            </div>
          </div>
        )}

        {/* Step 3: Select Channels */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Select Delivery Channels</h2>
            <div className="grid grid-cols-2 gap-3">
              {CHANNEL_OPTIONS.map((ch) => {
                const Icon = ch.icon;
                const isSelected = selectedChannels.includes(ch.key);
                return (
                  <button key={ch.key} onClick={() => toggleChannel(ch.key)} className={`p-4 rounded-xl border-2 text-left ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-white dark:bg-slate-800 dark:bg-gray-800'}`}>
                    <Icon className={`w-6 h-6 ${ch.color} mb-2`} />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{ch.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{ch.desc}</p>
                  </button>
                );
              })}
            </div>
            <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-4">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Schedule</p>
              <div className="flex gap-3">
                <button onClick={() => setScheduleType('now')} className={`flex-1 py-2 text-sm rounded-lg font-medium ${scheduleType === 'now' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>Send Now</button>
                <button onClick={() => setScheduleType('later')} className={`flex-1 py-2 text-sm rounded-lg font-medium ${scheduleType === 'later' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>Schedule Later</button>
              </div>
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Back</button>
              <button onClick={() => setStep(4)} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">Review</button>
            </div>
          </div>
        )}

        {/* Step 4: Preview & Send */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Review & Send</h2>
            <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-5 space-y-3">
              <div className="flex justify-between"><span className="text-sm text-gray-500 dark:text-gray-400">Waiver</span><span className="text-sm font-medium text-gray-900 dark:text-white">{selectedWaiverObj?.title}</span></div>
              <div className="flex justify-between"><span className="text-sm text-gray-500 dark:text-gray-400">Version</span><span className="text-sm text-gray-900 dark:text-white">v{selectedWaiverObj?.version}</span></div>
              <div className="flex justify-between"><span className="text-sm text-gray-500 dark:text-gray-400">Recipients</span><span className="text-sm text-gray-900 dark:text-white">{recipientMode === 'segment' ? `${selectedSegmentObj?.name} (${selectedSegmentObj?.count})` : `${manualEmails.split('\n').filter(Boolean).length} emails`}</span></div>
              <div className="flex justify-between"><span className="text-sm text-gray-500 dark:text-gray-400">Channels</span><span className="text-sm text-gray-900 dark:text-white">{selectedChannels.join(', ')}</span></div>
              <div className="flex justify-between"><span className="text-sm text-gray-500 dark:text-gray-400">Schedule</span><span className="text-sm text-gray-900 dark:text-white">{scheduleType === 'now' ? 'Send immediately' : 'Scheduled'}</span></div>
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep(3)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Back</button>
              <button onClick={handleSend} disabled={sending} className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"><Send className="w-4 h-4" /> {sending ? 'Sending...' : 'Send Waiver Requests'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
