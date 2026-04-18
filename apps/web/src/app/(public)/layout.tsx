'use client';

import Link from 'next/link';
import { Plane, Menu, X } from 'lucide-react';
import { useState } from 'react';

const NAV_LINKS = [
  { label: 'Events', href: '/events' },
  { label: 'Jobs', href: '/jobs' },
  { label: 'Stays', href: '/stays' },
  { label: 'Courses', href: '/courses' },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-gray-950/95 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Plane className="w-6 h-6 text-blue-600" />
              <span className="text-lg font-bold text-gray-900 dark:text-white">SkyLara</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-6">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sign In
              </Link>
            </nav>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden text-gray-600 dark:text-gray-300"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
          {mobileMenuOpen && (
            <div className="sm:hidden pb-4 space-y-2">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Plane className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">SkyLara</span>
            </div>
            <nav className="flex items-center gap-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Powered by SkyLara
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
