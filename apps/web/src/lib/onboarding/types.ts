import type { ReactNode } from 'react';

// Shared types for Onboarding Center
export type StatusColor = 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'orange' | 'purple';

export interface Toast { id: string; message: string; type: 'success' | 'error' | 'info' }

export type FilterChip = { label: string; value: string };

export interface SubTab { id: string; label: string; icon?: ReactNode; count?: number }

export interface OverviewStats {
  inProgress: number;
  completedThisMonth: number;
  pendingApprovals: number;
  incompleteProfiles: number;
  expiringDocuments: number;
  activeTemplates: number;
  totalApplications: number;
  conversionRate: number;
}

export interface RecentActivity {
  id: string;
  text: string;
  timestamp: string;
  type: 'completed' | 'started' | 'action_needed' | 'expired' | 'approved' | 'rejected';
}

// Unified shape for all category pages (athletes, students, tandem, staff, managers)
export interface CategoryApplication {
  id: string;
  name: string;
  email: string;
  phone: string;
  template: string;
  category: string;
  status: string;
  progress: number;
  submittedAt: string | null;
  approvedAt: string | null;
  stepsCompleted: number;
  stepsTotal: number;
  documents: { title: string; status: string }[];
}

// Legacy type aliases for backwards-compatible mock fallback
export type Athlete = CategoryApplication;
export type Student = CategoryApplication;
export type TandemCustomer = CategoryApplication;
export type StaffMember = CategoryApplication;
export type ManagerApp = CategoryApplication;

export interface CoachApplication { id: string; name: string; type: string; disciplines: string[]; status: string; documentsUploaded: number; documentsRequired: number; hasExistingRating: boolean }
export interface InstructorApp { id: string; name: string; ratingType: string; issuingBody: string; status: string; totalJumps: number; submittedAt: string }
export interface ApprovalItem { id: string; personName: string; itemType: 'document' | 'waiver' | 'license' | 'application' | 'rating' | 'medical'; description: string; submittedAt: string; priority: 'normal' | 'high' | 'urgent' }
export interface OnboardingTemplate { id: string; name: string; category: string; flowKey: string; accessMode: 'PUBLIC' | 'INVITE_ONLY' | 'TOKEN' | 'INTERNAL_ONLY'; status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED'; applicationsCount: number; completionRate: number; externalSlug: string | null; version: number }
export interface NotificationItem { id: string; campaignName: string; channel: 'EMAIL' | 'WHATSAPP' | 'PUSH' | 'IN_APP'; segmentName: string; status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'PAUSED'; sentCount: number; openRate: number; createdAt: string }
export interface AutomationItem { id: string; name: string; trigger: string; category: string; active: boolean; runCount: number; lastRunAt: string | null }
export interface ReportMetric { label: string; value: string | number; change?: number; changeLabel?: string }
