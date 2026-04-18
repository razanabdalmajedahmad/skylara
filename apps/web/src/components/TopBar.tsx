'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineStatus } from '@/hooks/useOffline';
import { useTheme } from '@/contexts/ThemeContext';
import { useAssistantModal } from '@/contexts/AssistantContext';
import { apiGet } from '@/lib/api';
import {
  Bell,
  Search,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Wifi,
  WifiOff,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { ROLE_LABELS } from '@/lib/constants';

export function TopBar() {
  const { user, logout } = useAuth();
  const { isOnline } = useOfflineStatus();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { openAssistant } = useAssistantModal();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread notification count from API
  useEffect(() => {
    let mounted = true;
    const fetchNotifications = async () => {
      try {
        const res = await apiGet<{ success: boolean; data: { unreadCount?: number; notifications?: any[] } }>(
          '/notifications?unreadOnly=true&limit=1'
        );
        if (mounted && res?.success && res?.data) {
          const count = res.data.unreadCount ?? res.data.notifications?.length ?? 0;
          setUnreadCount(count);
        }
      } catch {
        // Fallback: keep 0
      }
    };
    fetchNotifications();
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!user) return null;

  const displayRole = ROLE_LABELS[(user.roles || [])[0]] || (user.roles || [])[0] || 'User';
  const dz = (user as any).dz || 'SkyHigh DZ';
  const dzLocation = (user as any).dzLocation || 'Perris';
  const userInitials = `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase();

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
  };

  const themeOptions = [
    { value: 'light' as const, icon: Sun, label: 'Light' },
    { value: 'dark' as const, icon: Moon, label: 'Dark' },
    { value: 'system' as const, icon: Monitor, label: 'System' },
  ];

  const CurrentThemeIcon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <>
      {/* Offline indicator */}
      {!isOnline && (
        <div className="bg-amber-500 text-white flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium shadow-sm">
          <WifiOff size={16} />
          Offline Mode — Changes will sync when connection restored
        </div>
      )}

      {/* Top bar header */}
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center justify-between h-16 pl-16 pr-4 lg:pl-6 lg:pr-6">
          {/* Left side — DZ and role info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
              {dz} — {dzLocation}
            </h2>
            <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">
              <span className="inline-block px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-[#1B4F72] dark:text-blue-300 rounded text-xs font-semibold">
                {displayRole}
              </span>
            </p>
          </div>

          {/* Right side — icons and user menu */}
          <div className="flex items-center gap-1.5 lg:gap-3 ml-4">
            {/* Search icon - open assistant */}
            <button
              onClick={() => openAssistant()}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors hidden sm:flex items-center justify-center"
              aria-label="Search"
              title="Search help and features"
            >
              <Search size={20} />
            </button>

            {/* Theme toggle */}
            <div className="relative">
              <button
                onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center"
                aria-label="Toggle theme"
                title="Theme"
              >
                <CurrentThemeIcon size={20} />
              </button>

              {themeMenuOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-50">
                  {themeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setTheme(opt.value);
                        setThemeMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                        theme === opt.value
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <opt.icon size={16} />
                      {opt.label}
                      {theme === opt.value && (
                        <span className="ml-auto text-blue-500 text-xs">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications */}
            <Link
              href="/dashboard/notifications"
              className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center"
              aria-label="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-2 py-1 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors group"
                aria-label="User menu"
              >
                <div className="w-9 h-9 lg:w-10 lg:h-10 bg-[#1B4F72] rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:bg-[#164063] transition-colors">
                  {userInitials}
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{displayRole}</p>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-gray-400 hidden lg:block transition-transform duration-200 ${
                    userMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown menu */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-2 z-50">
                  {/* User info section */}
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {user.email || 'user@example.com'}
                    </p>
                    <div className="mt-2">
                      <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-[#1B4F72] dark:text-blue-300 rounded text-xs font-semibold">
                        {displayRole}
                      </span>
                    </div>
                  </div>

                  {/* Menu items */}
                  <Link
                    href="/dashboard/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-sm"
                  >
                    <User size={16} />
                    Profile
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-sm"
                  >
                    <Settings size={16} />
                    Settings
                  </Link>

                  {/* Connection status */}
                  <div className="px-4 py-2 border-t border-gray-200 dark:border-slate-700 flex items-center gap-2">
                    {isOnline ? (
                      <>
                        <Wifi size={14} className="text-green-600 dark:text-green-400" />
                        <span className="text-xs text-green-700 dark:text-green-400 font-medium">Connected</span>
                      </>
                    ) : (
                      <>
                        <WifiOff size={14} className="text-amber-600 dark:text-amber-400" />
                        <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">Offline</span>
                      </>
                    )}
                  </div>

                  {/* Logout button */}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium border-t border-gray-200 dark:border-slate-700"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Click outside to close menus */}
      {(userMenuOpen || themeMenuOpen) && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setUserMenuOpen(false);
            setThemeMenuOpen(false);
          }}
          aria-hidden="true"
        />
      )}
    </>
  );
}
