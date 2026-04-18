'use client';

import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';
import { unwrapObject } from '@/lib/onboarding/api-helpers';

export interface SegmentContextPayload {
  documents: Array<{
    id: number;
    applicationId?: number;
    /** PROFILE = stored Document rows; DECLARATION = derived from application answers */
    source?: 'PROFILE' | 'DECLARATION';
    name: string;
    type: string;
    status: string;
    expiryDate: string | null;
    uploadedAt: string;
  }>;
  waivers: Array<{
    id: number;
    name: string;
    templateName: string;
    signedAt: string | null;
    status: string;
    version: number;
  }>;
  licenses: Array<{
    id: number;
    type: string;
    number: string;
    issuingBody: string;
    issueDate: string;
    expiryDate: string | null;
    status: string;
  }>;
  skills: Array<{
    type: string;
    selfLevel: string;
    verifiedLevel: string | null;
    interest: string;
  }>;
  athleteInterests: Record<string, boolean> | null;
  coachInterests: Record<string, boolean> | null;
  rules: Array<{
    id: number;
    name: string;
    conditions: string;
    active: boolean;
    requiredReviewers: number;
  }>;
  notifications: Array<{
    id: number;
    channel: string;
    subject: string;
    status: string;
    sentAt: string | null;
  }>;
  history: Array<{
    id: number;
    action: string;
    actor: string;
    timestamp: string;
    details: string;
  }>;
  medical: { declared: boolean; riskFlags: string[]; reviewedBy: string | null } | null;
}

export function useSegmentContext(segment: string) {
  const [ctx, setCtx] = useState<SegmentContextPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiGet<SegmentContextPayload>(`/onboarding/segment/${segment}/context`)
      .then((r) => {
        const o = unwrapObject<SegmentContextPayload>(r);
        if (!cancelled) setCtx(o ?? (r as SegmentContextPayload));
      })
      .catch(() => {
        if (!cancelled) {
          setCtx(null);
          setError('Could not load onboarding data for this section.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [segment]);

  return { ctx, loading, error };
}
