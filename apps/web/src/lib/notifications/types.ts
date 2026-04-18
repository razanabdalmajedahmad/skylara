// Shared types for Notification Center
export interface NotifOverview { totalSent: number; delivered: number; opened: number; failed: number; activeSegments: number; activeCampaigns: number; activeAutomations: number; channelBreakdown?: { email: number; push: number; sms: number; inApp: number; whatsapp: number } }

export const EMPTY_NOTIF_OVERVIEW: NotifOverview = {
  totalSent: 0,
  delivered: 0,
  opened: 0,
  failed: 0,
  activeSegments: 0,
  activeCampaigns: 0,
  activeAutomations: 0,
};
export interface Recommendation { id: string; type: string; title: string; description: string; priority: string; action: string }
export interface Campaign { id: string; name: string; channels: string[]; segmentName: string; status: string; triggerType: string; sent: number; opened: number; clicked: number; failed: number; createdAt: string }
export interface NotifTemplate { id: string; name: string; eventType: string; channel: string; language: string; subject: string; active: boolean }
export interface Segment { id: string; name: string; description: string; memberCount: number; active: boolean; rulesCount: number }
export interface DeliveryLogItem { id: string; user: string; channel: string; eventType: string; status: string; sentAt: string }
export interface FailureItem { id: string; user: string; channel: string; eventType: string; failureReason: string; attempts: number; lastAttempt: string }
export interface TransactionalEvent { id: string; user: string; eventType: string; channel: string; status: string; sentAt: string; metadata: string }
export interface PushEvent { id: string; user: string; platform: 'iOS' | 'Android'; token: string; lastSent: string; status: string; appVersion: string }
export interface EmailEvent { id: string; user: string; subject: string; status: string; sentAt: string; openedAt: string | null; bouncedReason: string | null }
export interface WhatsAppEvent { id: string; user: string; phone: string; templateName: string; status: string; sentAt: string; consentStatus: string }
