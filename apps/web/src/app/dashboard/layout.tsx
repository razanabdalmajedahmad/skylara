'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { SyncIndicator } from '@/components/SyncIndicator';
import { PortalAssistant } from '@/components/PortalAssistant';
import { WalkthroughProvider } from '@/components/walkthroughs/WalkthroughProvider';
import { AssistantProvider } from '@/contexts/AssistantContext';
import { PageLoading } from '@repo/ui';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading || !isAuthenticated) {
    return <PageLoading message="Loading SkyLara..." />;
  }

  return (
    <AssistantProvider>
      <WalkthroughProvider>
        <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950">
          <Sidebar />
          <div className="flex-1 lg:ml-64 flex flex-col min-h-screen min-w-0">
            <TopBar />
            <main className="flex-1 overflow-auto">
              <div className="p-4 lg:p-6">
                {children}
              </div>
            </main>
            {/* SyncIndicator moved to bottom-left to avoid overlap with PortalAssistant */}
            <SyncIndicator position="bottom-left" />
          </div>
          <PortalAssistant />
        </div>
      </WalkthroughProvider>
    </AssistantProvider>
  );
}
