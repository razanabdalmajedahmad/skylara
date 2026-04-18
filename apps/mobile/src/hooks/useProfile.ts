/**
 * React Query hooks for user profile management
 * Handles profile updates, avatar uploads, and license information
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { Waiver } from '@/types';

/**
 * Mutation for updating user profile information
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const refreshUser = useAuthStore((s) => s.refreshUser);

  return useMutation({
    mutationFn: async (profileData: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      weight?: number;
      dateOfBirth?: string;
      nationality?: string;
      emergencyContactName?: string;
      emergencyContactPhone?: string;
      bio?: string;
    }) => {
      const { data } = await api.patch('/jumpers/me', profileData);
      return data;
    },
    onSuccess: () => {
      refreshUser();
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}

/**
 * Mutation for uploading a new avatar image
 * Sends the image as multipart form data
 *
 * @example
 * const { mutate } = useUpdateAvatar();
 * mutate('file:///path/to/image.jpg');
 */
export function useUpdateAvatar() {
  const refreshUser = useAuthStore((s) => s.refreshUser);

  return useMutation({
    mutationFn: async (imageUri: string) => {
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'avatar.jpg';

      formData.append('avatar', {
        uri: imageUri,
        name: filename,
        type: 'image/jpeg',
      } as any);

      const { data } = await api.post('/jumpers/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      return data;
    },
    onSuccess: () => {
      refreshUser();
    },
  });
}

/**
 * Mutation for updating athlete/license information
 */
export function useUpdateLicense() {
  const refreshUser = useAuthStore((s) => s.refreshUser);

  return useMutation({
    mutationFn: async (licenseData: {
      licenseLevel: string;
      uspaMemberId?: string;
      totalJumps?: number;
      disciplines?: string[];
    }) => {
      const { data } = await api.patch('/jumpers/me/athlete', licenseData);
      return data;
    },
    onSuccess: () => {
      refreshUser();
    },
  });
}

/**
 * Query for fetching waivers for a specific dropzone
 *
 * @param dzId - The dropzone ID (undefined = skip query)
 */
export function useWaivers(dzId: number | undefined) {
  return useQuery<Waiver[]>({
    queryKey: ['waivers', dzId],
    queryFn: async () => {
      if (!dzId) return [];
      const { data } = await api.get(`/dropzones/${dzId}/waivers/me`);
      return data;
    },
    enabled: !!dzId,
  });
}

/**
 * Mutation for signing a waiver
 */
export function useSignWaiver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (waiverData: { waiverId: number; dzId: number }) => {
      const { data } = await api.post(`/dropzones/${waiverData.dzId}/waivers/${waiverData.waiverId}/sign`, {});
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['waivers', variables.dzId] });
    },
  });
}

/**
 * Query for checking if user has all required waivers for a dropzone
 *
 * @param dzId - The dropzone ID (undefined = skip query)
 */
export function useRequiredWaivers(dzId: number | undefined) {
  return useQuery<{ required: Waiver[]; signed: Waiver[] }>({
    queryKey: ['requiredWaivers', dzId],
    queryFn: async () => {
      if (!dzId) return { required: [], signed: [] };
      const { data } = await api.get(`/dropzones/${dzId}/waivers/required`);
      return data;
    },
    enabled: !!dzId,
  });
}

/**
 * Mutation for updating emergency contact information
 */
export function useUpdateEmergencyContact() {
  const queryClient = useQueryClient();
  const refreshUser = useAuthStore((s) => s.refreshUser);

  return useMutation({
    mutationFn: async (contactData: {
      emergencyContactName: string;
      emergencyContactPhone: string;
    }) => {
      const { data } = await api.patch('/jumpers/me', contactData);
      return data;
    },
    onSuccess: () => {
      refreshUser();
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}
