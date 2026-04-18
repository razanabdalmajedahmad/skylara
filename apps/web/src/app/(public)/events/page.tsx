'use client';

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/constants';
import {
  Loader2,
  Calendar,
  MapPin,
  Inbox,
} from 'lucide-react';

interface PublicEvent {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  type: string;
}

const TYPE_COLORS: Record<string, string> = {
  BOOGIE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  COMPETITION: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  CAMP: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  OPEN_DAY: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  DEFAULT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

export default function PublicEventsPage() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/public/events`);
        if (!res.ok) throw new Error('Failed to load events');
        const json = await res.json();
        setEvents(json.data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load events');
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
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
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Events</h1>

      {events.length === 0 ? (
        <div className="text-center py-16">
          <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No upcoming events</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Check back soon for new events</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((evt) => {
            const start = new Date(evt.startDate);
            const end = new Date(evt.endDate);
            const colorClass = TYPE_COLORS[evt.type] || TYPE_COLORS.DEFAULT;
            return (
              <div key={evt.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${colorClass}`}>
                    {evt.type.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{evt.title}</h3>
                {evt.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">{evt.description}</p>
                )}
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>
                      {start.toLocaleDateString()}
                      {evt.endDate && evt.endDate !== evt.startDate && ` - ${end.toLocaleDateString()}`}
                    </span>
                  </div>
                  {evt.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{evt.location}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
