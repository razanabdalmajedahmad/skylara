import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Persona types matching Figma's 5 onboarding flows.
 * Mapped to backend OnboardingRole values.
 */
export type Persona =
  | 'coach'
  | 'videographer'
  | 'tunnel'
  | 'beginner'
  | 'organizer';

/** Backend role mapping */
export const PERSONA_TO_ROLE: Record<Persona, string> = {
  coach: 'COACH',
  videographer: 'FUN_JUMPER',
  tunnel: 'FUN_JUMPER',
  beginner: 'TANDEM_STUDENT',
  organizer: 'DZ_MANAGER',
};

export const PERSONA_LABELS: Record<Persona, string> = {
  coach: 'Coach / Instructor',
  videographer: 'Videographer',
  tunnel: 'Tunnel Flyer',
  beginner: 'Beginner / Non-Skydiver',
  organizer: 'Organizer',
};

export const TOTAL_STEPS = 7;

export interface StepData {
  [key: string]: any;
}

interface OnboardingState {
  /** Selected persona */
  persona: Persona | null;
  /** Current step (1-7) */
  currentStep: number;
  /** Data accumulated across all steps */
  stepData: Record<number, StepData>;
  /** Backend session ID (once started) */
  sessionId: number | null;
  /** Whether onboarding is complete */
  isComplete: boolean;
  /** Whether we're currently submitting */
  isSubmitting: boolean;

  // Actions
  setPersona: (persona: Persona) => void;
  setStepData: (step: number, data: StepData) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  setSessionId: (id: number) => void;
  markComplete: () => void;
  setSubmitting: (v: boolean) => void;
  reset: () => void;
  persist: () => Promise<void>;
  restore: () => Promise<boolean>;
}

const STORAGE_KEY = 'skylara_onboarding_state';

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  persona: null,
  currentStep: 1,
  stepData: {},
  sessionId: null,
  isComplete: false,
  isSubmitting: false,

  setPersona: (persona) => {
    set({ persona, currentStep: 1, stepData: {}, sessionId: null, isComplete: false });
    get().persist();
  },

  setStepData: (step, data) => {
    const prev = get().stepData;
    set({ stepData: { ...prev, [step]: { ...(prev[step] || {}), ...data } } });
    get().persist();
  },

  nextStep: () => {
    const { currentStep } = get();
    if (currentStep < TOTAL_STEPS) {
      set({ currentStep: currentStep + 1 });
      get().persist();
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 1) {
      set({ currentStep: currentStep - 1 });
      get().persist();
    }
  },

  goToStep: (step) => {
    if (step >= 1 && step <= TOTAL_STEPS) {
      set({ currentStep: step });
      get().persist();
    }
  },

  setSessionId: (id) => {
    set({ sessionId: id });
    get().persist();
  },

  markComplete: () => {
    set({ isComplete: true });
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  },

  setSubmitting: (v) => set({ isSubmitting: v }),

  reset: () => {
    set({
      persona: null,
      currentStep: 1,
      stepData: {},
      sessionId: null,
      isComplete: false,
      isSubmitting: false,
    });
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  },

  persist: async () => {
    const { persona, currentStep, stepData, sessionId } = get();
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ persona, currentStep, stepData, sessionId })
      );
    } catch {
      // Silent — non-critical
    }
  },

  restore: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const { persona, currentStep, stepData, sessionId } = JSON.parse(stored);
        if (persona) {
          set({ persona, currentStep, stepData, sessionId });
          return true;
        }
      }
    } catch {
      // Corrupted state — start fresh
    }
    return false;
  },
}));
