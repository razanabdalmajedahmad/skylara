import { useCallback } from 'react';
import { Alert } from 'react-native';
import { api } from '@/lib/api';
import {
  useOnboardingStore,
  PERSONA_TO_ROLE,
  type Persona,
  type StepData,
} from '@/stores/onboarding';

/**
 * Hook for onboarding API integration.
 * Bridges the local Zustand store with the backend /onboarding/* endpoints.
 */
export function useOnboarding() {
  const store = useOnboardingStore();

  /** Start a new onboarding session on the backend */
  const startSession = useCallback(async (persona: Persona) => {
    store.setSubmitting(true);
    try {
      const role = PERSONA_TO_ROLE[persona];
      const res = await api.post('/onboarding/start', { role });
      const session = res.data?.session;
      if (session?.id) {
        store.setSessionId(session.id);
      }
      return res.data;
    } catch (error: any) {
      const msg = error?.response?.data?.error || error.message || 'Failed to start onboarding';
      Alert.alert('Error', msg);
      throw error;
    } finally {
      store.setSubmitting(false);
    }
  }, [store]);

  /** Submit step data to the backend and advance locally */
  const submitStep = useCallback(async (step: number, data: StepData) => {
    store.setSubmitting(true);
    store.setStepData(step, data);

    try {
      const res = await api.patch('/onboarding/step', { step, data });
      store.nextStep();
      return res.data;
    } catch (error: any) {
      const errors = error?.response?.data?.errors;
      const msg = errors
        ? errors.join('\n')
        : error?.response?.data?.error || error.message || 'Failed to save step';
      Alert.alert('Validation Error', msg);
      throw error;
    } finally {
      store.setSubmitting(false);
    }
  }, [store]);

  /** Complete the onboarding */
  const completeOnboarding = useCallback(async () => {
    store.setSubmitting(true);
    try {
      const res = await api.post('/onboarding/complete');
      store.markComplete();
      return res.data;
    } catch (error: any) {
      const msg = error?.response?.data?.error || error.message || 'Failed to complete onboarding';
      Alert.alert('Error', msg);
      throw error;
    } finally {
      store.setSubmitting(false);
    }
  }, [store]);

  /** Abandon the current onboarding */
  const abandonOnboarding = useCallback(async () => {
    try {
      await api.post('/onboarding/abandon');
    } catch {
      // Non-critical — just reset locally
    }
    store.reset();
  }, [store]);

  /** Resume a previous incomplete onboarding session */
  const resumeOnboarding = useCallback(async () => {
    try {
      const res = await api.post('/onboarding/resume');
      const session = res.data?.session;
      if (session) {
        store.setSessionId(session.id);
        store.goToStep(session.currentStep || 1);
        return true;
      }
    } catch {
      // No session to resume
    }
    return false;
  }, [store]);

  return {
    ...store,
    startSession,
    submitStep,
    completeOnboarding,
    abandonOnboarding,
    resumeOnboarding,
  };
}
