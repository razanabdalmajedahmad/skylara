'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, ThumbsUp, ThumbsDown, MapPin } from 'lucide-react';
import { apiPost } from '@/lib/api';

// Mock article content - in production, fetch from API
const ARTICLE_CONTENT: Record<string, any> = {
  'how-to-create-manifest': {
    title: 'How to Create a Manifest',
    category: 'Manifest',
    shortAnswer: 'A manifest is a list of skydivers and their gear for a specific jump. To create one, navigate to the Manifest tab and follow the form.',
    steps: [
      'Navigate to the Manifest tab in the sidebar',
      'Click the "New Manifest" button in the top right',
      'Select your aircraft from the dropdown',
      'Enter jump details (altitude, exit point, weather conditions)',
      'Add jumpers by scanning their QR codes or searching by name',
      'Confirm gear assignments and weight distribution',
      'Review all details and click "Create Manifest"',
      'Manifest is now ready for check-in',
    ],
    roles: ['admin', 'dzo', 'jump_master'],
    relatedActions: [
      { title: 'View Manifest', route: '/dashboard/manifest' },
      { title: 'Check-in Athletes', route: '/dashboard/checkin' },
    ],
    relatedArticles: [
      { title: 'Understanding Manifest Status', slug: 'manifest-status' },
      { title: 'Adding Athletes to Manifest', slug: 'adding-athletes' },
    ],
  },
  'checking-in-athletes': {
    title: 'Checking In Athletes',
    category: 'Check-in',
    shortAnswer: 'Check-in is the process of verifying athlete attendance and assigning them to a manifest jump.',
    steps: [
      'Go to the Check-in section from the sidebar',
      'Select an active manifest from the dropdown',
      'Athlete can scan their own QR code or staff can scan for them',
      'Verify the athlete details on screen',
      'Confirm equipment assignment (parachute, jumpsuit, etc.)',
      'Click "Check In" to complete the process',
      'Athlete appears in the manifest boarding list',
    ],
    roles: ['admin', 'dzo', 'jump_master'],
    relatedActions: [
      { title: 'Go to Check-in', route: '/dashboard/checkin' },
      { title: 'View Manifest', route: '/dashboard/manifest' },
    ],
    relatedArticles: [
      { title: 'Understanding QR Codes', slug: 'qr-codes' },
      { title: 'Manifest Status Changes', slug: 'manifest-status' },
    ],
  },
  'understanding-wallet': {
    title: 'Understanding Wallet',
    category: 'Wallet',
    shortAnswer: 'The Wallet module tracks athlete credits, charges for jumps, and refunds in the system.',
    steps: [
      'Navigate to the Wallet section',
      'View your credit balance at the top of the page',
      'Transaction history shows all charges, payments, and refunds',
      'Click any transaction to view details',
      'Request a refund by selecting a transaction and clicking "Request Refund"',
      'Admins and DZOs can add credits to athlete accounts',
      'All transactions are recorded for audit purposes',
    ],
    roles: ['admin', 'dzo', 'athlete'],
    relatedActions: [
      { title: 'Go to Wallet', route: '/dashboard/wallet' },
    ],
    relatedArticles: [
      { title: 'Pricing Structure', slug: 'pricing' },
      { title: 'Refund Policy', slug: 'refund-policy' },
    ],
  },
};

export default function HelpArticlePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [helpful, setHelpful] = useState<boolean | null>(null);

  const article = ARTICLE_CONTENT[slug] || ARTICLE_CONTENT['how-to-create-manifest'];

  const handleHelpful = async (value: boolean) => {
    setHelpful(value);
    // Submit helpfulness feedback to API
    try {
      await apiPost(`/help-center/articles/${article?.id}/feedback`, { helpful: value });
    } catch {
      // Feedback submission will be retried
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-transparent">
      {/* Breadcrumb */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 text-sm mb-4">
          <Link href="/dashboard/help" className="text-[#2E86C1] hover:text-[#1B4F72]">
            Help Center
          </Link>
          <ChevronLeft size={16} className="text-gray-400 transform rotate-180" />
          <span className="text-gray-600 dark:text-gray-400 dark:text-gray-300">{article.category}</span>
          <ChevronLeft size={16} className="text-gray-400 transform rotate-180" />
          <span className="text-gray-900 dark:text-white font-semibold">{article.title}</span>
        </div>
      </div>

      <div className="flex">
        {/* Main Content */}
        <main className="flex-1 p-8 max-w-4xl">
          {/* Title */}
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">{article.title}</h1>

          {/* Short Answer Box */}
          <div className="bg-blue-50 border-l-4 border-[#2E86C1] p-6 rounded-lg mb-8">
            <p className="text-gray-900 dark:text-white text-lg">{article.shortAnswer}</p>
          </div>

          {/* Steps */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Steps</h2>
            <ol className="space-y-4">
              {article.steps.map((step: string, idx: number) => (
                <li key={idx} className="flex gap-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-[#2E86C1] text-white rounded-full flex-shrink-0 font-semibold">
                    {idx + 1}
                  </div>
                  <div className="pt-1">
                    <p className="text-gray-900 dark:text-white">{step}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Roles */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">
              Roles that can access this
            </h3>
            <div className="flex gap-2 flex-wrap">
              {article.roles.map((role: string) => (
                <span
                  key={role}
                  className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>

          {/* Related Actions */}
          {article.relatedActions?.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Go to Feature</h3>
              <div className="flex gap-3">
                {article.relatedActions.map((action: any, idx: number) => (
                  <Link
                    key={idx}
                    href={action.route}
                    className="flex items-center gap-2 px-4 py-2 bg-[#2E86C1] text-white rounded-lg hover:bg-[#1B4F72] transition-colors"
                  >
                    <MapPin size={18} />
                    {action.title}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Related Articles */}
          {article.relatedArticles?.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Related Articles</h3>
              <ul className="space-y-2">
                {article.relatedArticles.map((related: any, idx: number) => (
                  <li key={idx}>
                    <Link
                      href={`/dashboard/help/${related.slug}`}
                      className="text-[#2E86C1] hover:text-[#1B4F72] hover:underline"
                    >
                      {related.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Helpful Section */}
          <div className="border-t border-gray-200 dark:border-slate-700 dark:border-gray-700 pt-8 mt-12">
            <p className="text-gray-900 dark:text-white font-semibold mb-4">Was this helpful?</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleHelpful(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  helpful === true
                    ? 'bg-[#27AE60] text-white'
                    : 'bg-gray-200 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
                }`}
              >
                <ThumbsUp size={18} />
                Yes
              </button>
              <button
                onClick={() => handleHelpful(false)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  helpful === false
                    ? 'bg-[#E74C3C] text-white'
                    : 'bg-gray-200 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
                }`}
              >
                <ThumbsDown size={18} />
                No
              </button>
            </div>
          </div>
        </main>

        {/* Sidebar */}
        <aside className="w-64 p-8 sticky top-0 h-screen overflow-y-auto">
          <Link
            href="/dashboard/help"
            className="flex items-center gap-2 text-[#2E86C1] hover:text-[#1B4F72] mb-8 font-semibold"
          >
            <ChevronLeft size={20} />
            Back to Help
          </Link>

          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Need more help?</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Can't find what you're looking for?
            </p>
            <Link
              href="/dashboard/ideas/new"
              className="inline-block w-full text-center px-3 py-2 bg-[#2E86C1] text-white rounded-lg hover:bg-[#1B4F72] transition-colors text-sm font-medium"
            >
              Submit an Idea
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
