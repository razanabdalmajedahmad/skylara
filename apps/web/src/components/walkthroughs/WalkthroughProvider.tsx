'use client';

import { createContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { WalkthroughOverlay } from './WalkthroughOverlay';

interface WalkthroughStep {
  title: string;
  description: string;
  targetSelector: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface WalkthroughDefinition {
  id: string;
  title: string;
  steps: WalkthroughStep[];
}

export interface WalkthroughContextType {
  isActive: boolean;
  currentStep: number;
  currentTour: WalkthroughDefinition | null;
  startTour: (slug: string) => Promise<void>;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  restartTour: () => void;
  tours: WalkthroughDefinition[];
}

export const WalkthroughContext = createContext<WalkthroughContextType | undefined>(undefined);

// Mock tour definitions - in production, fetch from API
const MOCK_TOURS: Record<string, WalkthroughDefinition> = {
  'dashboard-intro': {
    id: 'dashboard-intro',
    title: 'Dashboard Walkthrough',
    steps: [
      {
        title: 'Welcome to SkyLara',
        description: 'This is your main dashboard where you can see an overview of all operations.',
        targetSelector: '[data-tour="dashboard-title"]',
        position: 'bottom',
      },
      {
        title: 'Sidebar Navigation',
        description: 'Use the sidebar to navigate between different modules. Click on any item to explore.',
        targetSelector: 'aside',
        position: 'right',
      },
      {
        title: 'Help Center',
        description: 'Need help? Click the question mark icon to browse our help articles.',
        targetSelector: '[data-tour="help-link"]',
        position: 'right',
      },
      {
        title: 'Ideas & Feedback',
        description: 'Have an idea for improvement? Share it with the team using the Ideas board.',
        targetSelector: '[data-tour="ideas-link"]',
        position: 'right',
      },
    ],
  },
  'manifest-basics': {
    id: 'manifest-basics',
    title: 'Manifest Basics',
    steps: [
      {
        title: 'Create a Manifest',
        description: 'Click the New Manifest button to start planning your jump.',
        targetSelector: '[data-tour="new-manifest"]',
        position: 'bottom',
      },
      {
        title: 'Select Aircraft',
        description: 'Choose the aircraft that will be used for this jump.',
        targetSelector: '[data-tour="aircraft-select"]',
        position: 'bottom',
      },
      {
        title: 'Add Jumpers',
        description: 'Scan QR codes or search to add jumpers to the manifest.',
        targetSelector: '[data-tour="add-jumpers"]',
        position: 'bottom',
      },
    ],
  },
};

export function WalkthroughProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentTour, setCurrentTour] = useState<WalkthroughDefinition | null>(null);
  const [completedTours, setCompletedTours] = useState<string[]>([]);
  const [tours] = useState<WalkthroughDefinition[]>(Object.values(MOCK_TOURS));

  // Check if user should see intro tour on first login
  useEffect(() => {
    const checkFirstLogin = async () => {
      try {
        const progress = await apiGet<{ completedTours: string[] }>('/tours/progress');
        setCompletedTours(progress?.completedTours || []);

        // Auto-trigger dashboard intro if never seen
        if (!progress?.completedTours?.includes('dashboard-intro')) {
          // Don't auto-trigger for now - let user manually start
          // startTour('dashboard-intro');
        }
      } catch (err) {
        console.error('Failed to load tour progress:', err);
      }
    };

    checkFirstLogin();
  }, []);

  const startTour = useCallback(async (slug: string) => {
    const tour = MOCK_TOURS[slug];
    if (!tour) {
      console.error(`Tour not found: ${slug}`);
      return;
    }

    setCurrentTour(tour);
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const skipTour = useCallback(async () => {
    if (currentTour) {
      try {
        await apiPost('/tours/progress', {
          tourId: currentTour.id,
          completed: true,
        });
        setCompletedTours((prev) => [...prev, currentTour.id]);
      } catch (err) {
        console.error('Failed to save tour progress:', err);
      }
    }

    setIsActive(false);
    setCurrentTour(null);
    setCurrentStep(0);
  }, [currentTour]);

  const nextStep = useCallback(() => {
    if (currentTour && currentStep < currentTour.steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      skipTour();
    }
  }, [currentTour, currentStep, skipTour]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const restartTour = useCallback(() => {
    if (currentTour) {
      setCurrentStep(0);
      setIsActive(true);
    }
  }, [currentTour]);

  const value: WalkthroughContextType = {
    isActive,
    currentStep,
    currentTour,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    restartTour,
    tours,
  };

  return (
    <WalkthroughContext.Provider value={value}>
      {children}
      <WalkthroughOverlay />
    </WalkthroughContext.Provider>
  );
}
