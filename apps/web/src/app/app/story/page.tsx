'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet } from '@/lib/api';
import {
  User,
  Award,
  Star,
  BookOpen,
  Loader2,
  Calendar,
  Trophy,
  Sparkles,
} from 'lucide-react';

interface StoryData {
  tagline: string | null;
  narrative: string | null;
  disciplines: string[];
  certifications: string[];
  isPublic: boolean;
}

interface Milestone {
  id: number;
  type: string;
  title: string;
  description: string | null;
  achievedAt: string;
  jumpNumber: number | null;
}

interface AchievementItem {
  id: number;
  name: string;
  description: string;
  icon: string | null;
  earnedAt: string;
}

interface FeedItem {
  id: number;
  eventType: string;
  summary: string;
  createdAt: string;
}

export default function AthleteStoryPage() {
  const { user } = useAuth();
  const [story, setStory] = useState<StoryData | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStory() {
      try {
        const [profileRes, storyRes, achieveRes, feedRes] = await Promise.all([
          apiGet('/jumpers/me').catch(() => null),
          apiGet('/social/feed?limit=5').catch(() => null),
          apiGet('/social/my-achievements').catch(() => null),
          apiGet('/social/feed?limit=10').catch(() => null),
        ]);

        setProfile(profileRes?.data);
        setStory(storyRes?.data ?? null);
        setMilestones(storyRes?.data?.milestones ?? []);
        setAchievements(achieveRes?.data?.achievements ?? []);
        setFeed(feedRes?.data?.items ?? []);
      } catch {}
      finally { setLoading(false); }
    }
    fetchStory();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 size={32} className="text-secondary-500 animate-spin" />
      </div>
    );
  }

  const name = profile ? `${profile.firstName} ${profile.lastName}` : user?.firstName ?? 'Athlete';
  const totalJumps = profile?.athlete?.totalJumps ?? 0;
  const license = profile?.athlete?.licenseLevel ?? 'NONE';

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Hero section */}
        <div className="bg-gradient-to-br from-primary-500 to-violet-600 rounded-2xl p-6 sm:p-7 text-white text-center">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
            <User size={28} />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold">{name}</h1>
          {story?.tagline && (
            <p className="text-sm opacity-85 mt-1">{story.tagline}</p>
          )}
          <div className="flex justify-center flex-wrap gap-4 mt-3.5 text-sm">
            <span className="flex items-center gap-1"><Award size={14} />{license}</span>
            <span className="flex items-center gap-1"><BookOpen size={14} />{totalJumps} jumps</span>
          </div>
        </div>

        {/* Narrative */}
        {story?.narrative && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
            <p className="text-gray-900 dark:text-gray-100 text-sm leading-relaxed">{story.narrative}</p>
          </div>
        )}

        {/* Disciplines */}
        {(story?.disciplines?.length ?? 0) > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2.5">Disciplines</h2>
            <div className="flex flex-wrap gap-2">
              {story!.disciplines.map(d => (
                <span key={d} className="bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 text-sm font-medium px-3 py-1 rounded-md">
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Achievements */}
        {achievements.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-1.5">
              <Trophy size={16} /> Achievements
            </h2>
            <div className="flex flex-wrap gap-2.5">
              {achievements.map(a => (
                <div key={a.id} className="flex items-center gap-2 px-3.5 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200/30 dark:border-amber-700/30">
                  <Star size={16} className="text-yellow-500 fill-yellow-500 shrink-0" />
                  <div>
                    <div className="font-semibold text-sm text-gray-900 dark:text-white">{a.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(a.earnedAt).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Milestones timeline */}
        {milestones.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-1.5">
              <Sparkles size={16} /> Milestones
            </h2>
            <div className="flex flex-col gap-3 pl-4 border-l-2 border-gray-200 dark:border-slate-600">
              {milestones.map(m => (
                <div key={m.id} className="relative">
                  <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-secondary-500 border-2 border-white dark:border-slate-800" />
                  <div className="font-semibold text-sm text-gray-900 dark:text-white">{m.title}</div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs flex items-center gap-1">
                    <Calendar size={11} />
                    {new Date(m.achievedAt).toLocaleDateString()}
                    {m.jumpNumber ? ` · Jump #${m.jumpNumber}` : ''}
                  </div>
                  {m.description && <div className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">{m.description}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity feed */}
        {feed.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Recent Activity</h2>
            <div className="flex flex-col divide-y divide-gray-200 dark:divide-slate-700">
              {feed.map(f => (
                <div key={f.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="text-sm text-gray-900 dark:text-gray-100">{f.summary}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{new Date(f.createdAt).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!story?.narrative && achievements.length === 0 && milestones.length === 0 && (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            <Sparkles size={48} strokeWidth={1.5} className="mx-auto mb-4" />
            <p className="text-base">Your story is just beginning.</p>
            <p className="text-sm">Milestones and achievements will appear here as you progress.</p>
          </div>
        )}
      </div>
    </div>
  );
}
