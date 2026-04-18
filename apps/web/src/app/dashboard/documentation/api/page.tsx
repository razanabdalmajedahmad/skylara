'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Lock,
  Code2,
  Copy,
  Check,
  X,
} from 'lucide-react';

const NAV_LINKS = [
  { href: '/dashboard/documentation', label: 'Overview' },
  { href: '/dashboard/documentation/user-guides', label: 'User Guides' },
  { href: '/dashboard/documentation/operations', label: 'Operations' },
  { href: '/dashboard/documentation/api', label: 'API Reference' },
  { href: '/dashboard/documentation/integrations', label: 'Integrations' },
  { href: '/dashboard/documentation/process-flows', label: 'Process Flows' },
  { href: '/dashboard/documentation/troubleshooting', label: 'Troubleshooting' },
  { href: '/dashboard/documentation/changelog', label: 'Changelog' },
];

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  POST: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  PUT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  PATCH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
};

interface Endpoint {
  method: string;
  path: string;
  description: string;
  auth: boolean;
  request?: string;
  response: string;
}

interface ApiGroup {
  name: string;
  endpoints: Endpoint[];
}

const API_GROUPS: ApiGroup[] = [
  {
    name: 'Auth',
    endpoints: [
      { method: 'POST', path: '/api/auth/login', description: 'Authenticate user and receive JWT token pair', auth: false, request: '{\n  "email": "admin@skydive.com",\n  "password": "securePassword123"\n}', response: '{\n  "accessToken": "eyJhbGciOiJIUzI1NiIs...",\n  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",\n  "expiresIn": 3600,\n  "user": {\n    "id": "usr_abc123",\n    "email": "admin@skydive.com",\n    "role": "admin"\n  }\n}' },
      { method: 'POST', path: '/api/auth/refresh', description: 'Refresh an expired access token using a valid refresh token', auth: false, request: '{\n  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."\n}', response: '{\n  "accessToken": "eyJhbGciOiJIUzI1NiIs...",\n  "expiresIn": 3600\n}' },
      { method: 'POST', path: '/api/auth/logout', description: 'Invalidate the current refresh token', auth: true, response: '{\n  "success": true\n}' },
      { method: 'POST', path: '/api/auth/forgot-password', description: 'Send password reset email', auth: false, request: '{\n  "email": "user@example.com"\n}', response: '{\n  "message": "Reset email sent if account exists"\n}' },
    ],
  },
  {
    name: 'Users',
    endpoints: [
      { method: 'GET', path: '/api/users', description: 'List all users with pagination and role filtering', auth: true, response: '{\n  "data": [\n    {\n      "id": "usr_abc123",\n      "email": "admin@skydive.com",\n      "firstName": "John",\n      "lastName": "Smith",\n      "role": "admin",\n      "status": "active",\n      "createdAt": "2026-01-15T08:00:00Z"\n    }\n  ],\n  "total": 45,\n  "page": 1,\n  "limit": 20\n}' },
      { method: 'GET', path: '/api/users/:id', description: 'Get a single user by ID with full profile details', auth: true, response: '{\n  "id": "usr_abc123",\n  "email": "admin@skydive.com",\n  "firstName": "John",\n  "lastName": "Smith",\n  "role": "admin",\n  "phone": "+15551234567",\n  "status": "active",\n  "lastLogin": "2026-04-09T14:30:00Z"\n}' },
      { method: 'PUT', path: '/api/users/:id', description: 'Update user profile fields', auth: true, request: '{\n  "firstName": "John",\n  "lastName": "Smith",\n  "phone": "+15559876543"\n}', response: '{\n  "id": "usr_abc123",\n  "email": "admin@skydive.com",\n  "firstName": "John",\n  "lastName": "Smith",\n  "phone": "+15559876543",\n  "updatedAt": "2026-04-09T15:00:00Z"\n}' },
      { method: 'PATCH', path: '/api/users/:id/role', description: 'Change a user role (admin only)', auth: true, request: '{\n  "role": "instructor"\n}', response: '{\n  "id": "usr_abc123",\n  "role": "instructor",\n  "updatedAt": "2026-04-09T15:00:00Z"\n}' },
    ],
  },
  {
    name: 'Loads',
    endpoints: [
      { method: 'GET', path: '/api/loads', description: 'List loads with status, date, and aircraft filters', auth: true, response: '{\n  "data": [\n    {\n      "id": "load_001",\n      "aircraft": "N208SK",\n      "altitude": 14000,\n      "status": "OPEN",\n      "capacity": 18,\n      "filled": 12,\n      "pilot": "usr_pilot01",\n      "callTime": "2026-04-09T10:00:00Z"\n    }\n  ],\n  "total": 8,\n  "page": 1\n}' },
      { method: 'POST', path: '/api/loads', description: 'Create a new load with aircraft and altitude assignment', auth: true, request: '{\n  "aircraftId": "ac_caravan01",\n  "altitude": 14000,\n  "pilotId": "usr_pilot01",\n  "scheduledTime": "2026-04-09T10:00:00Z"\n}', response: '{\n  "id": "load_002",\n  "aircraft": "N208SK",\n  "altitude": 14000,\n  "status": "OPEN",\n  "capacity": 18,\n  "filled": 0,\n  "createdAt": "2026-04-09T08:30:00Z"\n}' },
      { method: 'PATCH', path: '/api/loads/:id/status', description: 'Update load status (OPEN, CALLED, BOARDING, etc.)', auth: true, request: '{\n  "status": "CALLED"\n}', response: '{\n  "id": "load_001",\n  "status": "CALLED",\n  "calledAt": "2026-04-09T09:45:00Z"\n}' },
      { method: 'POST', path: '/api/loads/:id/slots', description: 'Add a jumper to a load slot', auth: true, request: '{\n  "athleteId": "ath_123",\n  "jumpType": "sport",\n  "altitude": 14000\n}', response: '{\n  "slotId": "slot_abc",\n  "loadId": "load_001",\n  "athleteId": "ath_123",\n  "jumpType": "sport",\n  "position": 13\n}' },
      { method: 'DELETE', path: '/api/loads/:id/slots/:slotId', description: 'Remove a jumper from a load slot', auth: true, response: '{\n  "success": true,\n  "loadId": "load_001",\n  "freedSlot": 13\n}' },
    ],
  },
  {
    name: 'Manifest',
    endpoints: [
      { method: 'GET', path: '/api/manifest/board', description: 'Get the current manifest board with all active loads', auth: true, response: '{\n  "loads": [\n    {\n      "id": "load_001",\n      "status": "OPEN",\n      "aircraft": "N208SK",\n      "slots": [...],\n      "departureEst": "2026-04-09T10:15:00Z"\n    }\n  ],\n  "weather": {\n    "status": "green",\n    "windSpeed": 8,\n    "windDirection": 270\n  }\n}' },
      { method: 'GET', path: '/api/manifest/waitlist', description: 'Get the current jump waitlist', auth: true, response: '{\n  "data": [\n    {\n      "id": "wl_001",\n      "athleteId": "ath_456",\n      "jumpType": "sport",\n      "requestedAltitude": 14000,\n      "addedAt": "2026-04-09T08:00:00Z"\n    }\n  ]\n}' },
      { method: 'POST', path: '/api/manifest/checkin', description: 'Check in an athlete for the day', auth: true, request: '{\n  "athleteId": "ath_123"\n}', response: '{\n  "athleteId": "ath_123",\n  "checkedInAt": "2026-04-09T07:30:00Z",\n  "waiverStatus": "valid",\n  "membershipStatus": "current",\n  "accountBalance": 250.00\n}' },
    ],
  },
  {
    name: 'Bookings',
    endpoints: [
      { method: 'GET', path: '/api/bookings', description: 'List bookings with date range and status filters', auth: true, response: '{\n  "data": [\n    {\n      "id": "bk_001",\n      "athleteId": "ath_789",\n      "jumpType": "tandem",\n      "date": "2026-04-12",\n      "timeSlot": "10:00",\n      "status": "confirmed",\n      "amount": 269.00\n    }\n  ],\n  "total": 24\n}' },
      { method: 'POST', path: '/api/bookings', description: 'Create a new booking', auth: true, request: '{\n  "athleteId": "ath_789",\n  "jumpType": "tandem",\n  "date": "2026-04-12",\n  "timeSlot": "10:00",\n  "addons": ["video", "photos"]\n}', response: '{\n  "id": "bk_002",\n  "status": "confirmed",\n  "amount": 349.00,\n  "confirmationCode": "SKY-2026-ABC"\n}' },
      { method: 'PATCH', path: '/api/bookings/:id', description: 'Update booking details or reschedule', auth: true, request: '{\n  "date": "2026-04-15",\n  "timeSlot": "14:00"\n}', response: '{\n  "id": "bk_002",\n  "date": "2026-04-15",\n  "timeSlot": "14:00",\n  "status": "confirmed"\n}' },
      { method: 'DELETE', path: '/api/bookings/:id', description: 'Cancel a booking and process refund per policy', auth: true, response: '{\n  "id": "bk_002",\n  "status": "cancelled",\n  "refundAmount": 349.00,\n  "refundMethod": "original_payment"\n}' },
    ],
  },
  {
    name: 'Payments',
    endpoints: [
      { method: 'POST', path: '/api/payments/charge', description: 'Process a payment for a jump or merchandise', auth: true, request: '{\n  "athleteId": "ath_123",\n  "amount": 2500,\n  "currency": "usd",\n  "description": "Sport jump - 14000ft",\n  "paymentMethod": "pm_card_visa"\n}', response: '{\n  "id": "pay_001",\n  "status": "succeeded",\n  "amount": 2500,\n  "currency": "usd",\n  "stripePaymentIntentId": "pi_abc123"\n}' },
      { method: 'POST', path: '/api/payments/refund', description: 'Issue a full or partial refund', auth: true, request: '{\n  "paymentId": "pay_001",\n  "amount": 2500,\n  "reason": "weather_cancellation"\n}', response: '{\n  "id": "ref_001",\n  "paymentId": "pay_001",\n  "amount": 2500,\n  "status": "succeeded"\n}' },
      { method: 'GET', path: '/api/payments/transactions', description: 'List financial transactions with filters', auth: true, response: '{\n  "data": [\n    {\n      "id": "txn_001",\n      "type": "charge",\n      "amount": 2500,\n      "athleteId": "ath_123",\n      "description": "Sport jump",\n      "createdAt": "2026-04-09T10:00:00Z"\n    }\n  ],\n  "total": 156\n}' },
      { method: 'POST', path: '/api/payments/wallet/credit', description: 'Add credit to an athlete wallet', auth: true, request: '{\n  "athleteId": "ath_123",\n  "amount": 50000,\n  "source": "cash",\n  "note": "Pre-loaded for weekend"\n}', response: '{\n  "athleteId": "ath_123",\n  "newBalance": 75000,\n  "transactionId": "txn_002"\n}' },
    ],
  },
  {
    name: 'Waivers',
    endpoints: [
      { method: 'GET', path: '/api/waivers/:athleteId', description: 'Get waiver status for an athlete', auth: true, response: '{\n  "athleteId": "ath_123",\n  "status": "valid",\n  "signedAt": "2026-01-15T12:00:00Z",\n  "expiresAt": "2027-01-15T12:00:00Z",\n  "version": "2.1",\n  "signatureType": "drawn"\n}' },
      { method: 'POST', path: '/api/waivers/sign', description: 'Submit a signed digital waiver', auth: true, request: '{\n  "athleteId": "ath_123",\n  "templateId": "waiver_v2.1",\n  "signature": "data:image/png;base64,...",\n  "agreedToTerms": true,\n  "ipAddress": "192.168.1.100"\n}', response: '{\n  "id": "wvr_001",\n  "status": "valid",\n  "signedAt": "2026-04-09T07:00:00Z",\n  "expiresAt": "2027-04-09T07:00:00Z"\n}' },
    ],
  },
  {
    name: 'Events',
    endpoints: [
      { method: 'GET', path: '/api/events', description: 'List upcoming events and boogies', auth: true, response: '{\n  "data": [\n    {\n      "id": "evt_001",\n      "name": "Spring Boogie 2026",\n      "startDate": "2026-05-15",\n      "endDate": "2026-05-18",\n      "registrations": 85,\n      "capacity": 150\n    }\n  ]\n}' },
      { method: 'POST', path: '/api/events', description: 'Create a new event', auth: true, request: '{\n  "name": "Summer Solstice Boogie",\n  "startDate": "2026-06-20",\n  "endDate": "2026-06-22",\n  "capacity": 200,\n  "registrationFee": 7500,\n  "description": "3-day boogie with organizers"\n}', response: '{\n  "id": "evt_002",\n  "name": "Summer Solstice Boogie",\n  "status": "published",\n  "registrationUrl": "https://book.skydive.com/events/evt_002"\n}' },
      { method: 'POST', path: '/api/events/:id/register', description: 'Register an athlete for an event', auth: true, request: '{\n  "athleteId": "ath_123",\n  "ticketType": "full_event"\n}', response: '{\n  "registrationId": "reg_001",\n  "eventId": "evt_002",\n  "status": "confirmed",\n  "confirmationCode": "EVT-2026-XYZ"\n}' },
    ],
  },
  {
    name: 'Reports',
    endpoints: [
      { method: 'GET', path: '/api/reports/daily', description: 'Get daily operations summary', auth: true, response: '{\n  "date": "2026-04-09",\n  "loadsFlown": 12,\n  "totalJumps": 187,\n  "revenue": {\n    "total": 28450,\n    "tandems": 16200,\n    "sport": 8750,\n    "aff": 2500,\n    "video": 1000\n  },\n  "weather": {\n    "hoursOperational": 8.5,\n    "weatherHolds": 1\n  }\n}' },
      { method: 'GET', path: '/api/reports/revenue', description: 'Revenue report with date range and breakdown', auth: true, response: '{\n  "startDate": "2026-04-01",\n  "endDate": "2026-04-09",\n  "totalRevenue": 185600,\n  "byJumpType": {\n    "tandem": 98500,\n    "sport": 52300,\n    "aff": 24800,\n    "coach": 10000\n  },\n  "byPaymentMethod": {\n    "card": 142000,\n    "cash": 28600,\n    "wallet": 15000\n  }\n}' },
      { method: 'GET', path: '/api/reports/athletes', description: 'Athlete statistics and engagement metrics', auth: true, response: '{\n  "totalRegistered": 1247,\n  "activeThisMonth": 312,\n  "newThisMonth": 48,\n  "retentionRate": 0.72,\n  "averageJumpsPerAthlete": 4.2,\n  "topJumpType": "sport"\n}' },
      { method: 'POST', path: '/api/reports/custom', description: 'Generate a custom report from query parameters', auth: true, request: '{\n  "metrics": ["revenue", "jumps", "athletes"],\n  "dateRange": {\n    "start": "2026-01-01",\n    "end": "2026-04-09"\n  },\n  "groupBy": "month",\n  "filters": {\n    "jumpType": ["tandem", "sport"]\n  }\n}', response: '{\n  "id": "rpt_001",\n  "status": "generated",\n  "downloadUrl": "/api/reports/rpt_001/download",\n  "expiresAt": "2026-04-10T08:30:00Z"\n}' },
    ],
  },
];

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      {label && (
        <div className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 mb-1 font-medium">{label}</div>
      )}
      <div className="bg-gray-900 dark:bg-gray-950 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 dark:bg-gray-900 border-b border-gray-700">
          <span className="text-xs text-gray-400">JSON</span>
          <button
            onClick={handleCopy}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
        <pre className="p-3 text-xs text-green-300 dark:text-green-400 overflow-x-auto font-mono leading-relaxed">
          {code}
        </pre>
      </div>
    </div>
  );
}

export default function ApiPage() {
  const [search, setSearch] = useState('');
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(new Set());
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const toggleEndpoint = (key: string) => {
    setExpandedEndpoints((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filteredGroups = useMemo(() => {
    let groups = API_GROUPS;
    if (activeGroup) {
      groups = groups.filter((g) => g.name === activeGroup);
    }
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups
      .map((group) => ({
        ...group,
        endpoints: group.endpoints.filter(
          (e) =>
            e.path.toLowerCase().includes(q) ||
            e.description.toLowerCase().includes(q) ||
            e.method.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.endpoints.length > 0);
  }, [search, activeGroup]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-800 bg-white dark:bg-slate-800 dark:bg-gray-900 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                  link.href === '/dashboard/documentation/api'
                    ? 'bg-gray-900 text-white dark:bg-white dark:bg-slate-800 dark:text-gray-900'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-2">
          <Code2 className="w-7 h-7 text-violet-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">API Reference</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          RESTful API documentation for the SkyLara platform. Base URL: <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded font-mono">https://api.skylara.io/v1</code>
        </p>

        {/* Auth Info Box */}
        <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-violet-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-violet-900 dark:text-violet-300 mb-1">Authentication</h3>
              <p className="text-sm text-violet-700 dark:text-violet-400 mb-2">
                Most endpoints require a valid JWT access token. Include it in the Authorization header:
              </p>
              <code className="text-xs bg-violet-100 dark:bg-violet-900/50 px-2 py-1 rounded font-mono text-violet-800 dark:text-violet-300">
                Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
              </code>
              <p className="text-xs text-violet-600 dark:text-violet-400 mt-2">
                Access tokens expire in 1 hour. Use the /auth/refresh endpoint to obtain a new token.
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search endpoints (e.g. POST, /loads, booking)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-white dark:bg-slate-800 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-400">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Module Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveGroup(null)}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
              !activeGroup
                ? 'bg-gray-900 text-white dark:bg-white dark:bg-slate-800 dark:text-gray-900'
                : 'bg-white dark:bg-slate-800 dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-700 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            All Modules
          </button>
          {API_GROUPS.map((g) => (
            <button
              key={g.name}
              onClick={() => setActiveGroup(activeGroup === g.name ? null : g.name)}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                activeGroup === g.name
                  ? 'bg-gray-900 text-white dark:bg-white dark:bg-slate-800 dark:text-gray-900'
                  : 'bg-white dark:bg-slate-800 dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-700 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>

        {/* Endpoint Groups */}
        {filteredGroups.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-800">
            <Code2 className="w-10 h-10 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No endpoints match your search.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredGroups.map((group) => (
              <div key={group.name} className="bg-white dark:bg-slate-800 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-800 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">{group.name}</h2>
                  <span className="text-xs text-gray-400">{group.endpoints.length} endpoints</span>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {group.endpoints.map((ep) => {
                    const key = `${ep.method}-${ep.path}`;
                    const isExpanded = expandedEndpoints.has(key);
                    return (
                      <div key={key}>
                        <button
                          onClick={() => toggleEndpoint(key)}
                          className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          )}
                          <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono w-16 text-center flex-shrink-0 ${METHOD_COLORS[ep.method]}`}>
                            {ep.method}
                          </span>
                          <code className="text-sm font-mono text-gray-700 dark:text-gray-300 flex-shrink-0">{ep.path}</code>
                          <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline truncate">{ep.description}</span>
                          {ep.auth && <Lock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 ml-auto" />}
                        </button>
                        {isExpanded && (
                          <div className="px-5 pb-4 ml-9 space-y-3">
                            <p className="text-sm text-gray-600 dark:text-gray-400">{ep.description}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-400">
                              {ep.auth && (
                                <span className="flex items-center gap-1">
                                  <Lock className="w-3 h-3" /> Auth Required
                                </span>
                              )}
                            </div>
                            {ep.request && <CodeBlock code={ep.request} label="Request Body" />}
                            <CodeBlock code={ep.response} label="Response" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
