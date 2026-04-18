'use client';

import { useContext } from 'react';
import { WalkthroughContext } from '@/components/walkthroughs/WalkthroughProvider';

export function useWalkthrough() {
  const context = useContext(WalkthroughContext);
  if (!context) {
    throw new Error('useWalkthrough must be used within WalkthroughProvider');
  }
  return context;
}

export function useTourProgress() {
  const { tours } = useWalkthrough();

  // In production, fetch from API
  const completedTours: string[] = [];
  const startedTours: string[] = [];

  const canReplay = (tourId: string) => {
    return completedTours.includes(tourId);
  };

  return {
    completedTours,
    startedTours,
    canReplay,
    totalTours: tours.length,
    completedCount: completedTours.length,
  };
}
