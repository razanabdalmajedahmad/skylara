'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

export type LoadStatus =
  | 'OPEN' | 'FILLING' | 'LOCKED'
  | 'THIRTY_MIN' | 'TWENTY_MIN' | 'TEN_MIN'
  | 'BOARDING' | 'AIRBORNE' | 'LANDED'
  | 'COMPLETE' | 'CANCELLED';

export interface CGCheckResult {
  id: string;
  loadId: string;
  result: 'PASS' | 'FAIL' | 'MARGINAL';
  totalWeight: number;
  weightMargin: number;
  cgPosition: number;
  forwardLimit: number;
  aftLimit: number;
  fuelWeight?: number;
  checkedAt: string;
  checkedBy?: string;
}

export interface Load {
  id: string;
  aircraftId: string;
  aircraftReg: string;
  status: LoadStatus;
  callTime: string;
  exitAltitude: number;
  slots: Slot[];
  manifest: Manifest[];
  currentSlots: number;
  totalSlots: number;
  cg: {
    position: number;
    min: number;
    max: number;
  };
  cgChecks?: CGCheckResult[];
  createdAt: string;
  updatedAt: string;
}

export interface Slot {
  id: string;
  loadId: string;
  position: number;
  type: 'REGULAR' | 'TANDEM' | 'COACH' | 'CAMERA' | 'MANIFEST';
  jumper?: {
    id: string;
    name: string;
    email: string;
    weight: number;
  };
}

export interface Manifest {
  id: string;
  loadId: string;
  slotId: string;
  jumperId: string;
  boardNumber: number;
  status: string;
}

export const useLoads = () => {
  return useQuery({
    queryKey: ['loads', 'active'],
    queryFn: () => apiGet<Load[]>('/loads?status=OPEN,FILLING,LOCKED,BOARDING,AIRBORNE'),
    refetchInterval: 5000, // Refetch every 5 seconds, WebSocket will push updates
  });
};

export const useLoad = (loadId: string) => {
  return useQuery({
    queryKey: ['loads', loadId],
    queryFn: () => apiGet<Load>(`/loads/${loadId}`),
    enabled: !!loadId,
  });
};

export const useCreateLoad = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => apiPost<Load>('/loads', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
    },
  });
};

export const useUpdateLoad = (loadId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => apiPut<Load>(`/loads/${loadId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads', loadId] });
      queryClient.invalidateQueries({ queryKey: ['loads'] });
    },
  });
};

export const useAddJumperToSlot = (loadId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      userId: string;
      weight?: number;
      slotType?: string;
      position?: number;
    }) =>
      apiPost(`/loads/${loadId}/slots`, {
        userId: data.userId,
        weight: data.weight ?? 180,
        slotType: data.slotType ?? 'FUN',
        ...(data.position != null ? { position: data.position } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads', loadId] });
      queryClient.invalidateQueries({ queryKey: ['loads'] });
    },
  });
};

export const useRemoveJumperFromSlot = (loadId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slotId: string) =>
      apiDelete(`/loads/${loadId}/slots/${slotId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads', loadId] });
      queryClient.invalidateQueries({ queryKey: ['loads'] });
    },
  });
};

export const useUpdateLoadStatus = (loadId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: string) =>
      apiPut<Load>(`/loads/${loadId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads', loadId] });
      queryClient.invalidateQueries({ queryKey: ['loads'] });
    },
  });
};

export interface TransitionPayload {
  toStatus: string;
  overrideGate?: string;
  overrideReason?: string;
}

export const useTransitionLoad = (loadId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: TransitionPayload) =>
      apiPost<Load>(`/loads/${loadId}/transition`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads', loadId] });
      queryClient.invalidateQueries({ queryKey: ['loads'] });
    },
  });
};

export const useRunCGCheck = (loadId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload?: { fuelWeight?: number }) =>
      apiPost<CGCheckResult>(`/loads/${loadId}/cg-check`, payload || {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads', loadId] });
    },
  });
};

export interface ExitOrderGroup {
  group: number;
  label: string;
  slots: Array<{
    slotId: string;
    position: number;
    jumperName: string;
    weight: number;
  }>;
}

export interface ExitOrderResult {
  groups: ExitOrderGroup[];
  totalSlots: number;
}

export const useExitOrder = (loadId: string, enabled: boolean) => {
  return useQuery({
    queryKey: ['loads', loadId, 'exit-order'],
    queryFn: () => apiGet<ExitOrderResult>(`/loads/${loadId}/exit-order`),
    enabled,
  });
};

// ---------------------------------------------------------------------------
// Load Notes
// ---------------------------------------------------------------------------

export interface LoadNote {
  id: number;
  loadId: number;
  userId: number;
  userName: string | null;
  content: string;
  createdAt: string;
}

interface LoadNotesResponse {
  success: boolean;
  data: LoadNote[];
}

interface CreateNoteResponse {
  success: boolean;
  data: LoadNote;
}

export const useLoadNotes = (loadId: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['loads', loadId, 'notes'],
    queryFn: async () => {
      const res = await apiGet<LoadNotesResponse>(`/loads/${loadId}/notes`);
      return res.data;
    },
    enabled: !!loadId,
  });

  const createNote = useMutation({
    mutationFn: (payload: { content: string }) =>
      apiPost<CreateNoteResponse>(`/loads/${loadId}/notes`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads', loadId, 'notes'] });
    },
  });

  const deleteNote = useMutation({
    mutationFn: (noteId: number) =>
      apiDelete(`/loads/${loadId}/notes/${noteId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads', loadId, 'notes'] });
    },
  });

  return { ...query, createNote, deleteNote };
};
