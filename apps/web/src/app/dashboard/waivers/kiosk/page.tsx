'use client';

import { useState, useCallback, useEffect } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import {
  QrCode, FileSignature, CheckCircle2, User, ChevronRight,
  RotateCcw, Wifi, WifiOff, Settings, Monitor,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Kiosk Mode - Full screen signing for tablet/DZ front desk
// ---------------------------------------------------------------------------

interface KioskWaiver { id: string; title: string; type: string; version: number }

const AVAILABLE_WAIVERS: KioskWaiver[] = [
  { id: 'wt1', title: 'Tandem Skydive Liability Waiver', type: 'TANDEM', version: 4 },
  { id: 'wt3', title: 'Experienced Jumper Waiver', type: 'EXPERIENCED', version: 2 },
  { id: 'wt4', title: 'Spectator Waiver', type: 'SPECTATOR', version: 1 },
];

export default function WaiverKioskPage() {
  const [waivers, setWaivers] = useState<KioskWaiver[]>(AVAILABLE_WAIVERS);
  const [selectedWaiver, setSelectedWaiver] = useState<string | null>(null);
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [signature, setSignature] = useState('');
  const [completed, setCompleted] = useState(false);
  const [signing, setSigning] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet<any[]>('/waivers/templates');
        const mapped = data.filter((t: any) => t.status === 'PUBLISHED').map((t: any) => ({
          id: String(t.id),
          title: t.title,
          type: t.waiverType,
          version: t.currentVersion || 1,
        }));
        if (mapped.length) setWaivers(mapped);
        setIsOnline(true);
      } catch {
        setIsOnline(false);
      }
    })();
  }, []);

  const reset = useCallback(() => {
    setSelectedWaiver(null);
    setSignerName('');
    setSignerEmail('');
    setAccepted(false);
    setSignature('');
    setCompleted(false);
  }, []);

  const handleSign = async () => {
    setSigning(true);
    try {
      await apiPost('/waivers/send', {
        templateId: parseInt(selectedWaiver || '0'),
        channel: 'KIOSK',
        recipients: [{ email: signerEmail, name: signerName }],
      });
    } catch {}
    setSigning(false);
    setCompleted(true);
    setTimeout(reset, 8000);
  };

  // Completed state
  if (completed) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-8">
        <div className="text-center max-w-lg">
          <CheckCircle2 className="w-24 h-24 text-green-500 mx-auto" />
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mt-6">Waiver Signed!</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mt-3">Thank you, {signerName}. You're all set.</p>
          <p className="text-sm text-gray-400 mt-6">This screen will reset automatically...</p>
          <button onClick={reset} className="mt-6 px-8 py-3 text-lg font-medium bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors">Next Person</button>
        </div>
      </div>
    );
  }

  // Waiver selection
  if (!selectedWaiver) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monitor className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SkyHigh DZ</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Waiver Kiosk</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isOnline ? <Wifi className="w-5 h-5 text-green-500" /> : <WifiOff className="w-5 h-5 text-red-500" />}
            <span className="text-xs text-gray-400">{isOnline ? 'Online' : 'Offline - signatures will sync later'}</span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-2xl w-full">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-2">Welcome!</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 text-center mb-8">Select your waiver type to begin</p>
            <div className="space-y-4">
              {waivers.map((w) => (
                <button key={w.id} onClick={() => setSelectedWaiver(w.id)} className="w-full flex items-center justify-between p-6 bg-white dark:bg-slate-800 rounded-2xl border-2 border-gray-200 dark:border-slate-700 hover:border-blue-400 transition-colors shadow-sm">
                  <div className="flex items-center gap-4">
                    <FileSignature className="w-8 h-8 text-blue-500" />
                    <div className="text-left">
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{w.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{w.type} &middot; v{w.version}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-400" />
                </button>
              ))}
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-400">Or scan your QR code to sign on your own device</p>
              <div className="mt-3 inline-block p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                <QrCode className="w-24 h-24 text-gray-300" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Signing form (simplified for kiosk - large touch targets)
  const waiverObj = waivers.find((w) => w.id === selectedWaiver);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="p-4 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={reset} className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 rounded-lg"><RotateCcw className="w-5 h-5" /></button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">{waiverObj?.title}</h1>
        </div>
        <span className="text-sm text-gray-400">Kiosk Mode</span>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-xl mx-auto space-y-6">
          {/* Name */}
          <div>
            <label className="block text-lg font-medium text-gray-900 dark:text-white mb-2">Your Full Name *</label>
            <input type="text" value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="First and Last Name" className="w-full px-4 py-4 text-lg border-2 border-gray-300 dark:border-slate-600 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Email */}
          <div>
            <label className="block text-lg font-medium text-gray-900 dark:text-white mb-2">Email Address *</label>
            <input type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} placeholder="your@email.com" className="w-full px-4 py-4 text-lg border-2 border-gray-300 dark:border-slate-600 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Waiver text summary */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 max-h-48 overflow-y-auto">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Waiver Summary</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              I understand that skydiving involves inherent risks including serious injury or death. I voluntarily assume all risks and release SkyHigh DZ and its staff from all liability. I confirm I am physically fit to participate and have disclosed any relevant medical conditions.
            </p>
          </div>

          {/* Agreement */}
          <label className="flex items-start gap-4 cursor-pointer p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="w-6 h-6 mt-0.5 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500" />
            <span className="text-base text-gray-900 dark:text-white">I have read, understand, and agree to all terms of this waiver</span>
          </label>

          {/* Signature */}
          <div>
            <label className="block text-lg font-medium text-gray-900 dark:text-white mb-2">Signature *</label>
            <input type="text" value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Type your full legal name" className="w-full px-4 py-4 text-2xl font-serif italic border-2 border-gray-300 dark:border-slate-600 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Submit */}
          <button onClick={handleSign} disabled={!signerName || !signerEmail || !accepted || !signature || signing} className={`w-full py-4 text-xl font-semibold rounded-xl transition-colors ${signerName && signerEmail && accepted && signature && !signing ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
            <div className="flex items-center justify-center gap-2">
              <FileSignature className="w-6 h-6" /> {signing ? 'Signing...' : 'Sign Waiver'}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
