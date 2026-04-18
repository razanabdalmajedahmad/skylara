import { create } from 'zustand';
import { api } from '@/lib/api';

export interface CoachSessionSummary {
  id: string;
  type: 'TANDEM' | 'AFF' | 'COACHING';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduledAt: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    level?: string;
    totalJumps?: number;
  };
  rating?: number;
}

export interface AssignedJumper {
  id: string;
  firstName: string;
  lastName: string;
  level: string;
  totalJumps: number;
  nextSessionDate?: string;
}

interface CoachState {
  todaySessions: CoachSessionSummary[];
  upcomingSessions: CoachSessionSummary[];
  assignedJumpers: AssignedJumper[];
  isLoadingSessions: boolean;
  isLoadingAssignments: boolean;

  fetchTodaySessions: () => Promise<void>;
  fetchUpcomingSessions: () => Promise<void>;
  fetchAssignments: () => Promise<void>;
}

export const useCoachStore = create<CoachState>((set) => ({
  todaySessions: [],
  upcomingSessions: [],
  assignedJumpers: [],
  isLoadingSessions: false,
  isLoadingAssignments: false,

  fetchTodaySessions: async () => {
    set({ isLoadingSessions: true });
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await api.get('/coaching/sessions', { params: { date: today } });
      set({ todaySessions: data as CoachSessionSummary[] });
    } catch {
      // error handled by caller
    } finally {
      set({ isLoadingSessions: false });
    }
  },

  fetchUpcomingSessions: async () => {
    try {
      const { data } = await api.get('/coaching/sessions', { params: { status: 'SCHEDULED' } });
      set({ upcomingSessions: data as CoachSessionSummary[] });
    } catch {
      // error handled by caller
    }
  },

  fetchAssignments: async () => {
    set({ isLoadingAssignments: true });
    try {
      const { data } = await api.get('/training/instructors/me/assignments');
      set({ assignedJumpers: data as AssignedJumper[] });
    } catch {
      // error handled by caller
    } finally {
      set({ isLoadingAssignments: false });
    }
  },
}));
