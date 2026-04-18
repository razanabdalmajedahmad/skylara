'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/constants';
import {
  Loader2,
  ArrowRight,
  Cloud,
  Wind,
  Thermometer,
  Calendar,
  Users,
  GraduationCap,
  Plane,
} from 'lucide-react';

interface HomeData {
  name: string;
  tagline: string;
  description: string;
  services: { title: string; description: string; icon: string }[];
  upcomingEvents: { id: string; title: string; date: string; type: string }[];
  weather: { temperature: number; windSpeed: number; conditions: string } | null;
}

const SERVICE_ICONS: Record<string, any> = {
  tandem: Users,
  aff: GraduationCap,
  coaching: Plane,
};

export default function PublicHomePage() {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHome = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/public/home`);
        if (!res.ok) throw new Error('Failed to load');
        const json = await res.json();
        setData(json.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load homepage');
      } finally {
        setLoading(false);
      }
    };
    fetchHome();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              {data?.name || 'Welcome to SkyLara'}
            </h1>
            <p className="mt-4 text-lg sm:text-xl text-blue-100">
              {data?.tagline || 'Experience the thrill of skydiving'}
            </p>
            {data?.description && (
              <p className="mt-3 text-sm text-blue-200 max-w-lg">{data.description}</p>
            )}
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/events"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-700 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
              >
                Book a Tandem <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 px-6 py-3 border-2 border-white/40 text-white font-semibold rounded-lg hover:bg-white/10 transition-colors"
              >
                Learn to Skydive
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      {data?.services && data.services.length > 0 && (
        <section className="py-16 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-10">Our Services</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.services.map((svc, i) => {
                const Icon = SERVICE_ICONS[svc.icon] || Plane;
                return (
                  <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
                    <div className="w-12 h-12 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{svc.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{svc.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Upcoming Events */}
      {data?.upcomingEvents && data.upcomingEvents.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Upcoming Events</h2>
              <Link href="/events" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.upcomingEvents.slice(0, 3).map((evt) => (
                <div key={evt.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(evt.date).toLocaleDateString()}</span>
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {evt.type}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{evt.title}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Weather Widget */}
      {data?.weather && (
        <section className="py-12 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 max-w-md mx-auto">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Cloud className="w-4 h-4 text-blue-600" /> Current Conditions
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <Thermometer className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{data.weather.temperature}&#176;F</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Temperature</p>
                </div>
                <div>
                  <Wind className="w-5 h-5 text-teal-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{data.weather.windSpeed} mph</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Wind</p>
                </div>
                <div>
                  <Cloud className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-900 dark:text-white capitalize">{data.weather.conditions}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Conditions</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
