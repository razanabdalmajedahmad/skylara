'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { API_BASE_URL } from '@/lib/constants';
import {
  Loader2,
  Users,
  Target,
  Clock,
  MapPin,
  Inbox,
} from 'lucide-react';

interface AboutData {
  name: string;
  description: string;
  history: string | null;
  mission: string | null;
  address: string | null;
  team: { name: string; role: string; bio: string | null; avatarUrl: string | null }[];
}

export default function AboutPage() {
  const [data, setData] = useState<AboutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAbout = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/public/home`);
        if (!res.ok) throw new Error('Failed to load');
        const json = await res.json();
        setData(json.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load about page');
      } finally {
        setLoading(false);
      }
    };
    fetchAbout();
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
          About {data?.name || 'Our Dropzone'}
        </h1>
        {data?.description && (
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">{data.description}</p>
        )}
        {data?.address && (
          <p className="flex items-center justify-center gap-2 text-sm text-gray-400 dark:text-gray-500 mt-3">
            <MapPin className="w-4 h-4" /> {data.address}
          </p>
        )}
      </div>

      {/* Mission */}
      {data?.mission && (
        <section className="mb-12">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-8 text-white">
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-6 h-6" />
              <h2 className="text-xl font-bold">Our Mission</h2>
            </div>
            <p className="text-blue-100 leading-relaxed">{data.mission}</p>
          </div>
        </section>
      )}

      {/* History */}
      {data?.history && (
        <section className="mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Our History</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{data.history}</p>
          </div>
        </section>
      )}

      {/* Team */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Meet the Team</h2>
        </div>
        {!data?.team || data.team.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 text-center py-12 px-6">
            <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No team members listed yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Team profiles will appear here once added by the dropzone.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.team.map((member, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                  {member.avatarUrl ? (
                    <Image
                      src={member.avatarUrl}
                      alt={member.name}
                      width={64}
                      height={64}
                      unoptimized
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <Users className="w-8 h-8 text-blue-600" />
                  )}
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{member.name}</h3>
                <p className="text-sm text-blue-600 dark:text-blue-400 mb-2">{member.role}</p>
                {member.bio && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3">{member.bio}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
