'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useWalkthrough } from '@/hooks/useWalkthrough';
import { getMenuForRoles, getGroupedMenuForRoles } from '@/lib/constants';
import type { MenuItem, MenuSection } from '@/lib/constants';
import {
  HelpCircle, Lightbulb, Menu, X, LogOut, MessageSquare, ChevronDown,
  LayoutDashboard, Clipboard, QrCode, Users, Calendar, Wallet, DollarSign,
  UserCog, Plane, Cloud, GraduationCap, BookOpen, AlertTriangle, BarChart3,
  AlertCircle, ClipboardCheck, Tag, Gift, Palette, Briefcase, Megaphone,
  Home, Globe, TrendingUp, UserCheck, Bell, Award, Building2, UserPlus,
  Bot, Shield, Settings, FolderOpen, FileSignature, PartyPopper, Warehouse, ClipboardList, type LucideIcon,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, Clipboard, QrCode, Users, Calendar, Wallet, DollarSign,
  UserCog, Plane, Cloud, GraduationCap, BookOpen, AlertTriangle, BarChart3,
  AlertCircle, ClipboardCheck, Tag, Gift, Palette, Briefcase, Megaphone,
  Home, Globe, TrendingUp, UserCheck, Bell, Award, Building2, UserPlus,
  Bot, Shield, Settings, FolderOpen, FileSignature, PartyPopper, MessageSquare, Warehouse, ClipboardList,
  Backpack: Gift, // fallback — lucide doesn't have Backpack
};

function NavIcon({ name }: { name: string }) {
  const Icon = ICON_MAP[name];
  if (!Icon) return null;
  return <Icon size={16} className="shrink-0" />;
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { startTour } = useWalkthrough();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!user) return null;

  const flatItems = getMenuForRoles(user.roles || []);
  const groupedSections = getGroupedMenuForRoles(user.roles || []);
  const dz = (user as any).dz || 'SkyHigh DZ';
  const dzLocation = (user as any).dzLocation || 'Perris';
  const roleName = (user.roles || [])[0] || 'User';

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const isSectionActive = (section: MenuSection) =>
    section.items.some(item => isActive(item.href));

  const toggleSection = (group: string) => {
    setCollapsed(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const handleLogout = async () => { await logout(); };
  const handleLinkClick = () => { if (mobileOpen) setMobileOpen(false); };

  const linkClasses = (href: string) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
      isActive(href)
        ? 'bg-[#2E86C1] text-white shadow-md'
        : 'text-blue-100 hover:bg-[#164063] hover:text-white'
    }`;

  const renderLink = (item: MenuItem) => (
    <Link key={item.href} href={item.href} onClick={handleLinkClick} className={linkClasses(item.href)}>
      <NavIcon name={item.icon} />
      {item.label}
    </Link>
  );

  const renderGroupedNav = (sections: MenuSection[]) => (
    <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
      {sections.map((section) => {
        const isOpen = !collapsed[section.group] || isSectionActive(section);
        const showItems = !section.collapsible || isOpen;

        return (
          <div key={section.group}>
            {section.collapsible ? (
              <button
                onClick={() => toggleSection(section.group)}
                className="w-full flex items-center justify-between px-3 py-1.5 mt-2 mb-0.5 text-[10px] uppercase tracking-wider font-bold text-blue-300 hover:text-blue-100 transition-colors"
              >
                {section.group}
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}
                />
              </button>
            ) : (
              <p className="px-3 py-1.5 mb-0.5 text-[10px] uppercase tracking-wider font-bold text-blue-300">
                {section.group}
              </p>
            )}
            {showItems && (
              <div className="space-y-0.5">
                {section.items.map(renderLink)}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  const renderFlatNav = (items: MenuItem[]) => (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
      {items.map(renderLink)}
    </nav>
  );

  const sidebarContent = (
    <>
      {/* Logo and DZ Name */}
      <div className="p-5 border-b border-[#0F3A52] flex items-center justify-between bg-gradient-to-b from-[#1B4F72] to-[#0F3A52]">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-bold text-[#1B4F72] shadow-sm">
              S
            </div>
            <h1 className="text-lg font-bold text-white">SkyLara</h1>
          </div>
          <p className="text-xs text-blue-200 mt-1.5 truncate">{dz} — {dzLocation}</p>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1 text-blue-200 hover:text-white transition-colors"
          aria-label="Close sidebar"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation */}
      {groupedSections ? renderGroupedNav(groupedSections) : renderFlatNav(flatItems)}

      {/* Support Section */}
      <div className="px-3 py-3 border-t border-[#0F3A52] space-y-0.5">
        <p className="text-[10px] uppercase tracking-wider font-bold text-blue-300 px-3 mb-2">
          Support
        </p>
        <Link href="/dashboard/help" onClick={handleLinkClick} data-tour="help-link" className={linkClasses('/dashboard/help')}>
          <HelpCircle size={16} className="shrink-0" />
          Help Center
        </Link>
        <Link href="/dashboard/ideas" onClick={handleLinkClick} data-tour="ideas-link" className={linkClasses('/dashboard/ideas')}>
          <Lightbulb size={16} className="shrink-0" />
          Ideas & Notes
        </Link>
        <Link href="/dashboard/portal-assistant" onClick={handleLinkClick} className={linkClasses('/dashboard/portal-assistant')}>
          <MessageSquare size={16} className="shrink-0" />
          Portal Assistant
        </Link>
      </div>

      {/* User Info and Logout */}
      <div className="border-t border-[#0F3A52] p-4 space-y-3 bg-[#0F3A52]">
        <div className="bg-[#164063] rounded-lg p-3">
          <p className="text-[10px] text-blue-300 mb-1 uppercase tracking-wide">Logged in as</p>
          <p className="text-sm font-semibold text-white">{user.firstName} {user.lastName}</p>
          <div className="mt-2 pt-2 border-t border-[#1B4F72]">
            <span className="inline-block px-2 py-1 bg-[#2E86C1] text-blue-100 text-xs font-semibold rounded">
              {roleName}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-white text-sm font-semibold shadow-md"
          aria-label="Logout"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2.5 bg-[#1B4F72] text-white rounded-lg shadow-lg hover:bg-[#164063] transition-colors"
        aria-label="Open sidebar"
      >
        <Menu size={24} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30 transition-opacity duration-300"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar (slide-in) */}
      <aside
        className={`lg:hidden fixed left-0 top-0 w-72 bg-[#1B4F72] text-white h-screen flex flex-col z-40 transform transition-transform duration-300 ease-in-out shadow-2xl ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar (always visible) */}
      <aside className="hidden lg:flex w-64 bg-[#1B4F72] text-white h-screen flex-col fixed left-0 top-0 z-30 shadow-lg">
        {sidebarContent}
      </aside>
    </>
  );
}
