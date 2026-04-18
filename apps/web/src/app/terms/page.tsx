import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Terms of Service</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          By using SkyLara, you agree to comply with all applicable laws and regulations governing
          skydiving operations, dropzone management, and safety protocols. These terms are subject to
          update as the platform evolves.
        </p>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Full terms of service documentation is maintained by your dropzone operator and available
          through the Documentation Center within the platform.
        </p>
        <Link href="/register" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
          &larr; Back to Registration
        </Link>
      </div>
    </div>
  );
}
