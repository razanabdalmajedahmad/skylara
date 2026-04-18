'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Calendar, MapPin, Users, Globe, Clock, Shield, ChevronRight,
  MessageCircle, CalendarPlus, Share2, CheckCircle, Zap, Package,
  AlertTriangle, Star, Phone, Mail,
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import Link from 'next/link';

export default function PublicEventPage() {
  const params = useParams();
  const boogieId = params?.id as string;
  const [boogie, setBoogie] = useState<any>(null);
  const [packages, setPackages] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    async function load() {
      const [bRes, pRes] = await Promise.all([
        apiGet<{ success: boolean; data: any }>(`/boogies/${boogieId}`).catch(() => null),
        apiGet<{ success: boolean; data: any[] }>(`/boogies/${boogieId}/packages`).catch(() => null),
      ]);
      if (bRes?.data) setBoogie(bRes.data);
      if (pRes?.data) setPackages(pRes.data);
    }
    load();
  }, [boogieId]);

  if (!boogie) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading event...</div>;

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const daysUntil = Math.max(0, Math.ceil((new Date(boogie.startDate).getTime() - Date.now()) / 86400000));
  const eventDays = Math.max(1, Math.ceil((new Date(boogie.endDate).getTime() - new Date(boogie.startDate).getTime()) / 86400000) + 1);
  const spotsLeft = boogie.maxParticipants - boogie.currentParticipants;
  const fillPct = Math.round((boogie.currentParticipants / boogie.maxParticipants) * 100);

  const generateIcs = () => {
    const start = new Date(boogie.startDate).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const end = new Date(boogie.endDate).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//SkyLara//Events//EN\nBEGIN:VEVENT\nDTSTART:${start}\nDTEND:${end}\nSUMMARY:${boogie.title}\nLOCATION:${boogie.city || ''}, ${boogie.country || ''}\nDESCRIPTION:${(boogie.subtitle || boogie.shortDescription || '').replace(/\n/g, '\\n')}\nURL:${typeof window !== 'undefined' ? window.location.href : ''}\nEND:VEVENT\nEND:VCALENDAR`;
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${boogie.title.replace(/\s+/g, '-')}.ics`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-800">
      {/* HERO */}
      <div className="relative bg-gradient-to-br from-purple-800 via-indigo-800 to-blue-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative max-w-5xl mx-auto px-4 py-12 lg:py-20">
          {/* Countdown */}
          {daysUntil > 0 && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-6">
              <Clock className="h-4 w-4 text-purple-300" />
              <span className="text-sm font-medium">{daysUntil} days to go</span>
            </div>
          )}

          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20">{boogie.eventType?.replace(/_/g, ' ')}</span>
            {boogie.discipline && <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20">{boogie.discipline}</span>}
          </div>

          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight">{boogie.title}</h1>
          {boogie.subtitle && <p className="text-xl text-purple-200 mt-3 max-w-2xl">{boogie.subtitle}</p>}

          <div className="flex flex-wrap gap-4 mt-6 text-sm">
            <span className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg"><Calendar className="h-4 w-4" /> {formatDate(boogie.startDate)}</span>
            <span className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg"><Clock className="h-4 w-4" /> {eventDays} days</span>
            {boogie.city && <span className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg"><MapPin className="h-4 w-4" /> {boogie.city}, {boogie.country}</span>}
            {boogie.organizerName && <span className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg"><Globe className="h-4 w-4" /> {boogie.organizerName}</span>}
          </div>

          {/* CTA Row */}
          <div className="flex flex-wrap gap-3 mt-8">
            <Link href={`/dashboard/boogies/${boogieId}/register`} className="px-6 py-3 bg-white dark:bg-slate-800 text-purple-800 rounded-xl font-bold text-sm hover:bg-purple-50 transition-colors shadow-lg flex items-center gap-2">
              <Zap className="h-5 w-5" /> Register Now {spotsLeft <= 20 && spotsLeft > 0 && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{spotsLeft} spots left</span>}
            </Link>
            {spotsLeft <= 0 && boogie.waitlistEnabled && (
              <Link href={`/dashboard/boogies/${boogieId}/register`} className="px-6 py-3 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 flex items-center gap-2">
                <Users className="h-5 w-5" /> Join Waitlist
              </Link>
            )}
            <a href={`https://wa.me/?text=${encodeURIComponent(`Hi! I'd like to know more about ${boogie.title}`)}`} target="_blank" rel="noopener noreferrer"
              className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 flex items-center gap-2">
              <MessageCircle className="h-5 w-5" /> Ask on WhatsApp
            </a>
            <button onClick={generateIcs} className="px-6 py-3 bg-white/20 text-white rounded-xl font-bold text-sm hover:bg-white/30 flex items-center gap-2 backdrop-blur-sm">
              <CalendarPlus className="h-5 w-5" /> Add to Calendar
            </button>
            <button onClick={() => { navigator.share?.({ title: boogie.title, url: window.location.href }).catch(() => { navigator.clipboard.writeText(window.location.href); showToast('Link copied!'); }); }}
              className="px-6 py-3 bg-white/20 text-white rounded-xl font-bold text-sm hover:bg-white/30 flex items-center gap-2 backdrop-blur-sm">
              <Share2 className="h-5 w-5" /> Share
            </button>
          </div>

          {/* Capacity bar */}
          <div className="mt-8 max-w-md">
            <div className="flex justify-between text-xs text-purple-300 mb-1">
              <span>{boogie.currentParticipants} registered</span>
              <span>{spotsLeft > 0 ? `${spotsLeft} spots left` : 'FULL — Waitlist open'}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div className={`h-2 rounded-full ${fillPct >= 90 ? 'bg-red-400' : fillPct >= 70 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(100, fillPct)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            {(boogie.fullDescription || boogie.shortDescription) && (
              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">About This Event</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{boogie.fullDescription || boogie.shortDescription}</p>
              </section>
            )}

            {/* Requirements */}
            {(boogie.minJumps || boogie.minLicense || boogie.aadRequired) && (
              <section className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                <h2 className="text-xl font-bold text-amber-900 mb-4 flex items-center gap-2"><Shield className="h-5 w-5" /> Requirements</h2>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {boogie.minLicense && <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-amber-600" /> Min License: <strong>{boogie.minLicense}</strong></div>}
                  {boogie.minJumps && <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-amber-600" /> Min Jumps: <strong>{boogie.minJumps}</strong></div>}
                  {boogie.minTunnelHours && <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-amber-600" /> Min Tunnel: <strong>{boogie.minTunnelHours}h</strong></div>}
                  {boogie.aadRequired && <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-amber-600" /> AAD Required</div>}
                  {boogie.ownRigRequired && <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> Own Rig Required</div>}
                  {boogie.rentalAvailable && <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-600" /> Rental Gear Available</div>}
                </div>
              </section>
            )}

            {/* Packages */}
            {packages.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Package className="h-5 w-5" /> Packages & Pricing</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {packages.map((pkg: any) => (
                    <div key={pkg.id} className="border border-gray-200 dark:border-slate-700 rounded-xl p-5 hover:shadow-md transition-shadow">
                      <h3 className="font-bold text-gray-900 dark:text-white">{pkg.name}</h3>
                      <p className="text-3xl font-extrabold text-purple-600 mt-2">{(pkg.priceCents / 100).toFixed(0)} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">{pkg.currency}</span></p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{pkg.packageType?.replace(/_/g, ' ')}</p>
                      {pkg.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{pkg.description}</p>}
                      <Link href={`/dashboard/boogies/${boogieId}/register`} className="mt-4 block text-center py-2 bg-purple-600 text-white rounded-lg font-semibold text-sm hover:bg-purple-700">
                        Select Package
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Terms */}
            {(boogie.termsText || boogie.cancellationPolicy) && (
              <section className="border-t pt-8">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Terms & Cancellation</h2>
                {boogie.termsText && <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap mb-4">{boogie.termsText}</div>}
                {boogie.cancellationPolicy && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Cancellation Policy</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{boogie.cancellationPolicy}</p>
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info Card */}
            <div className="bg-gray-50 rounded-xl p-6 border sticky top-4">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Event Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3"><Calendar className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="font-medium">{formatDate(boogie.startDate)}</div><div className="text-gray-500 dark:text-gray-400">to {formatDate(boogie.endDate)}</div></div></div>
                {boogie.city && <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-gray-400" /> {boogie.city}, {boogie.country}</div>}
                {boogie.organizerName && <div className="flex items-center gap-3"><Globe className="h-4 w-4 text-gray-400" /> {boogie.organizerName}</div>}
                <div className="flex items-center gap-3"><Users className="h-4 w-4 text-gray-400" /> {boogie.currentParticipants}/{boogie.maxParticipants} participants</div>
                <div className="flex items-center gap-3"><Zap className="h-4 w-4 text-gray-400" /> {boogie.eventType?.replace(/_/g, ' ')}</div>
              </div>

              <div className="mt-6 space-y-3">
                <Link href={`/dashboard/boogies/${boogieId}/register`} className="block text-center py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700">
                  Register Now
                </Link>
                <a href={`https://wa.me/?text=${encodeURIComponent(`I'm interested in ${boogie.title}`)}`} target="_blank" rel="noopener noreferrer"
                  className="block text-center py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700">
                  Ask on WhatsApp
                </a>
                <button onClick={generateIcs} className="w-full py-3 bg-gray-100 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 flex items-center justify-center gap-2">
                  <CalendarPlus className="h-4 w-4" /> Add to Calendar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm rounded-lg shadow-lg animate-fade-in">
          <CheckCircle className="h-4 w-4 text-emerald-400" /> {toast}
        </div>
      )}

      {/* FOOTER CTA */}
      <div className="bg-purple-900 text-white py-8 px-4 text-center">
        <h2 className="text-2xl font-bold mb-2">Ready to join?</h2>
        <p className="text-purple-300 mb-6">{spotsLeft > 0 ? `${spotsLeft} spots remaining — secure yours now` : 'Event is full — join the waitlist'}</p>
        <Link href={`/dashboard/boogies/${boogieId}/register`} className="inline-flex items-center gap-2 px-8 py-3 bg-white dark:bg-slate-800 text-purple-900 rounded-xl font-bold hover:bg-purple-50 shadow-lg">
          <Zap className="h-5 w-5" /> {spotsLeft > 0 ? 'Register Now' : 'Join Waitlist'}
        </Link>
      </div>
    </div>
  );
}
