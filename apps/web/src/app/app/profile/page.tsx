'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet } from '@/lib/api';
import {
  User,
  Award,
  Mail,
  Phone,
  MapPin,
  Loader2,
  FileText,
  AlertCircle,
} from 'lucide-react';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  licenseLevel: string;
  totalJumps: number;
  uspaMemberId: string | null;
  homeDropzone: string | null;
  disciplines: string[];
}

export default function AthleteProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await apiGet('/jumpers/me');
        const d = res?.data;
        setProfile({
          firstName: d?.firstName ?? user?.firstName ?? '',
          lastName: d?.lastName ?? user?.lastName ?? '',
          email: d?.email ?? '',
          phone: d?.phone ?? null,
          licenseLevel: d?.athlete?.licenseLevel ?? 'NONE',
          totalJumps: d?.athlete?.totalJumps ?? 0,
          uspaMemberId: d?.athlete?.uspaMemberId ?? null,
          homeDropzone: d?.athlete?.homeDropzone?.name ?? null,
          disciplines: d?.athlete?.disciplines ?? [],
        });
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 size={32} className="text-secondary-500 animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-5">
        {/* Avatar + name */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 text-center">
          <div className="w-[72px] h-[72px] rounded-full bg-primary-500/10 dark:bg-primary-400/20 flex items-center justify-center mx-auto mb-3">
            <User size={32} className="text-primary-500 dark:text-primary-400" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {profile.firstName} {profile.lastName}
          </h1>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-3">
            <span className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-semibold px-3 py-1 rounded-md inline-flex items-center gap-1">
              <Award size={13} />
              {profile.licenseLevel} License
            </span>
            <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-semibold px-3 py-1 rounded-md">
              {profile.totalJumps} jumps
            </span>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Contact</h2>
          <div className="flex flex-col gap-2.5 text-sm">
            <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-300">
              <Mail size={16} className="text-gray-400 dark:text-gray-500 shrink-0" /> {profile.email}
            </div>
            {profile.phone && (
              <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-300">
                <Phone size={16} className="text-gray-400 dark:text-gray-500 shrink-0" /> {profile.phone}
              </div>
            )}
            {profile.homeDropzone && (
              <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-300">
                <MapPin size={16} className="text-gray-400 dark:text-gray-500 shrink-0" /> {profile.homeDropzone}
              </div>
            )}
          </div>
        </div>

        {/* Credentials */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Credentials</h2>
          <div className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-300">
            {profile.uspaMemberId ? (
              <div className="flex items-center gap-2.5">
                <FileText size={16} className="text-gray-400 dark:text-gray-500 shrink-0" /> USPA: {profile.uspaMemberId}
              </div>
            ) : (
              <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
                <AlertCircle size={16} className="shrink-0" /> USPA member ID not set
              </div>
            )}
          </div>
        </div>

        {/* Disciplines */}
        {profile.disciplines.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Disciplines</h2>
            <div className="flex flex-wrap gap-2">
              {profile.disciplines.map((d) => (
                <span key={d} className="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-sm px-3 py-1 rounded-md">
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
