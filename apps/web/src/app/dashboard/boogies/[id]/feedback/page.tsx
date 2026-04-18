'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Star, CheckCircle, MessageSquare, ChevronLeft } from 'lucide-react';
import { apiPost } from '@/lib/api';
import Link from 'next/link';

export default function FeedbackPage() {
  const params = useParams();
  const router = useRouter();
  const boogieId = params?.id as string;

  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const RATING_QUESTIONS = [
    { key: 'overall', label: 'Overall Experience' },
    { key: 'organization', label: 'Organization & Communication' },
    { key: 'coaching', label: 'Coaching Quality' },
    { key: 'safety', label: 'Safety Standards' },
    { key: 'accommodation', label: 'Accommodation & Logistics' },
    { key: 'value', label: 'Value for Money' },
  ];

  const TEXT_QUESTIONS = [
    { key: 'highlight', label: 'What was the highlight of the event?' },
    { key: 'improve', label: 'What could be improved?' },
    { key: 'recommend', label: 'Would you recommend this event? Why?' },
    { key: 'other', label: 'Any other feedback or suggestions?' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiPost(`/boogies/${boogieId}/announcements`, {
        title: `Feedback submission`,
        body: JSON.stringify({ ratings, answers, submittedAt: new Date().toISOString() }),
        channel: 'FEEDBACK',
        triggerType: 'FEEDBACK_SUBMITTED',
      });
      setSubmitted(true);
    } catch {
      console.error('Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Thank You!</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Your feedback helps us make future events even better.</p>
          <button onClick={() => router.push('/dashboard/boogies')} className="px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold">
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <Link href={`/dashboard/boogies/${boogieId}`} className="text-purple-600 text-sm flex items-center gap-1 mb-4">
          <ChevronLeft className="h-4 w-4" /> Back to Event
        </Link>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 lg:p-8">
          <div className="text-center mb-8">
            <MessageSquare className="h-10 w-10 text-purple-600 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Event Feedback</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Help us improve future events — your feedback matters</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Star Ratings */}
            <div className="space-y-4">
              <h2 className="font-bold text-gray-900 dark:text-white">Rate your experience</h2>
              {RATING_QUESTIONS.map(q => (
                <div key={q.key} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{q.label}</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatings(prev => ({ ...prev, [q.key]: star }))}
                        className="p-0.5"
                      >
                        <Star className={`h-6 w-6 ${(ratings[q.key] || 0) >= star ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Text Questions */}
            <div className="space-y-4 border-t pt-6">
              <h2 className="font-bold text-gray-900 dark:text-white">Tell us more</h2>
              {TEXT_QUESTIONS.map(q => (
                <div key={q.key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{q.label}</label>
                  <textarea
                    value={answers[q.key] || ''}
                    onChange={e => setAnswers(prev => ({ ...prev, [q.key]: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    rows={3}
                    placeholder="Type your answer..."
                  />
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
