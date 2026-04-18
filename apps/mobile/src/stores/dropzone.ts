import { create } from 'zustand';
import { api } from '@/lib/api';
import { subscribeToChannel, unsubscribeFromChannel } from '@/lib/socket';

export interface Dropzone {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  /** Subtitle for pickers (city/region); optional if API only sends ICAO) */
  location?: string;
  icaoCode?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  currency: string;
  windLimitKnots: number;
  status: string;
  organization: {
    id: number;
    name: string;
  };
}

export interface DropzoneState {
  dropzones: Dropzone[];
  activeDz: Dropzone | null;
  isLoading: boolean;

  fetchDropzones: () => Promise<void>;
  setActiveDz: (dz: Dropzone) => void;
}

export const useDropzoneStore = create<DropzoneState>((set, get) => ({
  dropzones: [],
  activeDz: null,
  isLoading: false,

  fetchDropzones: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/jumpers/me/dropzones');
      const dzList = Array.isArray(data) ? data : [];
      set({ dropzones: dzList, isLoading: false });
      if (dzList.length > 0 && !get().activeDz) {
        get().setActiveDz(dzList[0]);
      }
    } catch (error) {
      set({ isLoading: false });
      // Retry once after 2s if the first fetch fails (e.g. token refresh was in progress)
      setTimeout(async () => {
        try {
          const { data } = await api.get('/jumpers/me/dropzones');
          const dzList = Array.isArray(data) ? data : [];
          set({ dropzones: dzList });
          if (dzList.length > 0 && !get().activeDz) {
            get().setActiveDz(dzList[0]);
          }
        } catch {}
      }, 2000);
    }
  },

  setActiveDz: (dz) => {
    const prev = get().activeDz;
    if (prev) {
      unsubscribeFromChannel(`dz:${prev.id}:loads`);
      unsubscribeFromChannel(`dz:${prev.id}:checkins`);
      unsubscribeFromChannel(`dz:${prev.id}:weather`);
      unsubscribeFromChannel(`dz:${prev.id}:emergency`);
    }
    set({ activeDz: dz });
    subscribeToChannel(`dz:${dz.id}:loads`);
    subscribeToChannel(`dz:${dz.id}:checkins`);
    subscribeToChannel(`dz:${dz.id}:weather`);
    subscribeToChannel(`dz:${dz.id}:emergency`);
  },
}));
