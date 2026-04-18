'use client';

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/constants';
import {
  Loader2,
  Briefcase,
  MapPin,
  Clock,
  Inbox,
} from 'lucide-react';

interface PublicJob {
  id: string;
  title: string;
  description: string;
  location: string;
  type: string;
  postedAt: string;
  department: string;
}

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: 'Full Time',
  PART_TIME: 'Part Time',
  SEASONAL: 'Seasonal',
  CONTRACT: 'Contract',
  VOLUNTEER: 'Volunteer',
};

export default function PublicJobsPage() {
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/public/jobs`);
        if (!res.ok) throw new Error('Failed to load jobs');
        const json = await res.json();
        setJobs(json.data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load jobs');
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
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
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Job Board</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">Join our team and be part of the skydiving community</p>

      {jobs.length === 0 ? (
        <div className="text-center py-16">
          <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No open positions</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Check back soon for new opportunities</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => (
            <div key={job.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="w-4 h-4 text-blue-600" />
                {job.department && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">{job.department}</span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{job.title}</h3>
              {job.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">{job.description}</p>
              )}
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                {job.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{job.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>{JOB_TYPE_LABELS[job.type] || job.type}</span>
                </div>
                {job.postedAt && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Posted {new Date(job.postedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
