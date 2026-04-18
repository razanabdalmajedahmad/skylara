import { create } from 'zustand';
import { api } from '@/lib/api';

export interface TeamMember {
  userId: number;
  name: string;
  jumpType: string;
  paymentMethod: 'BLOCK_TICKET' | 'WALLET' | 'CARD';
  formation: string;
  isCheckedIn: boolean;
  ticketId?: number;
  weight?: number;
}

export interface Team {
  id: string;
  name: string;
  members: TeamMember[];
  createdAt: string;
}

interface ManifestState {
  teams: Team[];
  activeTeam: Team | null;
  selfManifest: TeamMember | null;

  // Team management
  createTeam: (name: string) => void;
  deleteTeam: (id: string) => void;
  setActiveTeam: (team: Team) => void;
  addMember: (member: TeamMember) => void;
  removeMember: (userId: number) => void;
  updateMember: (userId: number, updates: Partial<TeamMember>) => void;

  // Self-manifest
  setSelfManifest: (config: TeamMember) => void;
  clearSelfManifest: () => void;

  // Load operations
  submitToLoad: (dzId: number | string, loadId: number | string) => Promise<void>;
  removeFromLoad: (dzId: number | string, loadId: number | string, slotId: string) => Promise<void>;
}

export const useManifestStore = create<ManifestState>((set, get) => ({
  teams: [],
  activeTeam: null,
  selfManifest: null,

  createTeam: (name) => {
    const team: Team = {
      id: Date.now().toString(),
      name,
      members: [],
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ teams: [...s.teams, team], activeTeam: team }));
  },

  deleteTeam: (id) => {
    set((s) => ({
      teams: s.teams.filter((t) => t.id !== id),
      activeTeam: s.activeTeam?.id === id ? null : s.activeTeam,
    }));
  },

  setActiveTeam: (team) => set({ activeTeam: team }),

  addMember: (member) => {
    set((s) => {
      if (!s.activeTeam) return s;
      const updated = {
        ...s.activeTeam,
        members: [...s.activeTeam.members, member],
      };
      return {
        activeTeam: updated,
        teams: s.teams.map((t) => (t.id === updated.id ? updated : t)),
      };
    });
  },

  removeMember: (userId) => {
    set((s) => {
      if (!s.activeTeam) return s;
      const updated = {
        ...s.activeTeam,
        members: s.activeTeam.members.filter((m) => m.userId !== userId),
      };
      return {
        activeTeam: updated,
        teams: s.teams.map((t) => (t.id === updated.id ? updated : t)),
      };
    });
  },

  updateMember: (userId, updates) => {
    set((s) => {
      if (!s.activeTeam) return s;
      const updated = {
        ...s.activeTeam,
        members: s.activeTeam.members.map((m) =>
          m.userId === userId ? { ...m, ...updates } : m
        ),
      };
      return {
        activeTeam: updated,
        teams: s.teams.map((t) => (t.id === updated.id ? updated : t)),
      };
    });
  },

  setSelfManifest: (config) => set({ selfManifest: config }),
  clearSelfManifest: () => set({ selfManifest: null }),

  submitToLoad: async (dzId, loadId) => {
    const state = get();
    const members = state.activeTeam?.members || (state.selfManifest ? [state.selfManifest] : []);

    for (const member of members) {
      await api.post(`/loads/${loadId}/slots`, {
        userId: String(member.userId),
        slotType: 'FUN',
        jumpType: member.jumpType || 'FUN_JUMP',
        formation: member.formation,
        weight: member.weight || 180,
      });
    }
  },

  removeFromLoad: async (dzId, loadId, slotId) => {
    await api.delete(`/loads/${loadId}/slots/${slotId}`);
  },
}));
