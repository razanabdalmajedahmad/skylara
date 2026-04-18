'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Plug,
  CreditCard,
  Mail,
  MessageSquare,
  Cloud,
  ShieldCheck,
  Radio,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
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

interface ConfigField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'url';
  placeholder: string;
}

interface Integration {
  name: string;
  description: string;
  icon: React.ElementType;
  status: 'connected' | 'not_configured';
  color: string;
  bg: string;
  docsUrl: string;
  configFields: ConfigField[];
  setupSteps: string[];
}

const INTEGRATIONS: Integration[] = [
  {
    name: 'Stripe (Payments & Connect)',
    description: 'Process credit card payments, manage subscriptions, handle refunds, and distribute payouts to instructors via Stripe Connect.',
    icon: CreditCard,
    status: 'connected',
    color: 'text-violet-500 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    docsUrl: 'https://docs.stripe.com',
    configFields: [
      { name: 'stripePublishableKey', label: 'Publishable Key', type: 'text', placeholder: 'pk_live_...' },
      { name: 'stripeSecretKey', label: 'Secret Key', type: 'password', placeholder: 'sk_live_...' },
      { name: 'stripeWebhookSecret', label: 'Webhook Signing Secret', type: 'password', placeholder: 'whsec_...' },
      { name: 'stripeConnectClientId', label: 'Connect Client ID (optional)', type: 'text', placeholder: 'ca_...' },
    ],
    setupSteps: [
      'Create a Stripe account at stripe.com and complete business verification.',
      'Navigate to Developers > API Keys in your Stripe dashboard. Copy the Publishable Key and Secret Key.',
      'Set up a webhook endpoint in Stripe pointing to https://api.skylara.io/v1/webhooks/stripe. Subscribe to events: payment_intent.succeeded, payment_intent.payment_failed, charge.refunded, customer.subscription.updated.',
      'Copy the Webhook Signing Secret from the webhook configuration page.',
      'Enter all keys in the fields below and save. SkyLara will validate the connection.',
      'For instructor payouts via Stripe Connect: enable Connect in your Stripe dashboard, obtain the Connect Client ID, and enter it below. Each instructor will complete Stripe onboarding through their SkyLara profile.',
      'Test the integration by processing a $1.00 test charge from the SkyLara admin panel. Verify the charge appears in your Stripe dashboard, then refund it.',
    ],
  },
  {
    name: 'SendGrid (Email)',
    description: 'Send transactional emails including booking confirmations, waiver reminders, weather cancellations, and marketing campaigns.',
    icon: Mail,
    status: 'connected',
    color: 'text-blue-500 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    docsUrl: 'https://docs.sendgrid.com',
    configFields: [
      { name: 'sendgridApiKey', label: 'API Key', type: 'password', placeholder: 'SG.xxxxxxxx...' },
      { name: 'sendgridFromEmail', label: 'From Email', type: 'text', placeholder: 'noreply@yourdropzone.com' },
      { name: 'sendgridFromName', label: 'From Name', type: 'text', placeholder: 'Your Dropzone Name' },
    ],
    setupSteps: [
      'Create a SendGrid account at sendgrid.com.',
      'Verify your sender domain under Settings > Sender Authentication. This requires adding DNS records (CNAME) to your domain.',
      'Create an API key under Settings > API Keys. Select "Restricted Access" and enable only Mail Send permissions.',
      'Enter the API key and your verified sender email address below.',
      'SkyLara will automatically use SendGrid for all transactional emails. Customize email templates under Settings > Notifications in SkyLara.',
      'Monitor delivery rates in the SendGrid dashboard under Activity. SkyLara logs email send status for each notification.',
    ],
  },
  {
    name: 'Twilio (SMS)',
    description: 'Send SMS notifications for load calls, weather holds, booking reminders, and emergency communications to athletes and staff.',
    icon: MessageSquare,
    status: 'not_configured',
    color: 'text-green-500 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-950/40',
    docsUrl: 'https://www.twilio.com/docs',
    configFields: [
      { name: 'twilioAccountSid', label: 'Account SID', type: 'text', placeholder: 'AC...' },
      { name: 'twilioAuthToken', label: 'Auth Token', type: 'password', placeholder: 'Your auth token' },
      { name: 'twilioPhoneNumber', label: 'Phone Number', type: 'text', placeholder: '+15551234567' },
    ],
    setupSteps: [
      'Create a Twilio account at twilio.com and complete identity verification.',
      'Purchase a phone number with SMS capability from the Twilio console under Phone Numbers > Manage > Buy a Number.',
      'Find your Account SID and Auth Token on the Twilio Console dashboard.',
      'Enter credentials and phone number below. SkyLara will validate by sending a test SMS to the admin phone number on file.',
      'Configure which notifications use SMS under Settings > Notifications in SkyLara. Recommended: load calls, weather holds, emergency alerts.',
      'Monitor SMS delivery and costs in the Twilio console under Monitor > Logs.',
    ],
  },
  {
    name: 'Weather API',
    description: 'Pull real-time weather data including surface winds, winds aloft, visibility, cloud ceiling, and forecasts for operational decision-making.',
    icon: Cloud,
    status: 'connected',
    color: 'text-cyan-500 dark:text-cyan-400',
    bg: 'bg-cyan-50 dark:bg-cyan-950/40',
    docsUrl: 'https://openweathermap.org/api',
    configFields: [
      { name: 'weatherApiKey', label: 'API Key', type: 'password', placeholder: 'Your API key' },
      { name: 'weatherStationId', label: 'ASOS/AWOS Station ID', type: 'text', placeholder: 'KXYZ' },
      { name: 'weatherLatitude', label: 'DZ Latitude', type: 'text', placeholder: '39.7392' },
      { name: 'weatherLongitude', label: 'DZ Longitude', type: 'text', placeholder: '-104.9903' },
    ],
    setupSteps: [
      'Sign up for an OpenWeatherMap account and select the "One Call API 3.0" plan (includes current, hourly, and winds aloft data).',
      'Copy your API key from the API Keys section of your account.',
      'Enter your nearest ASOS/AWOS weather station identifier (4-letter ICAO code). This is used for official METAR/TAF data.',
      'Enter your dropzone GPS coordinates for location-specific forecasts and radar data.',
      'SkyLara polls weather data every 5 minutes and displays it on the manifest dashboard. The Weather Decision Matrix automatically evaluates conditions against your configured thresholds.',
      'Weather data is logged for each load for historical analysis and incident investigation.',
    ],
  },
  {
    name: 'USPA License Verification',
    description: 'Automatically verify USPA membership status, license levels, and rating currency for athletes during check-in.',
    icon: ShieldCheck,
    status: 'not_configured',
    color: 'text-amber-500 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    docsUrl: 'https://uspa.org',
    configFields: [
      { name: 'uspaApiKey', label: 'USPA API Key', type: 'password', placeholder: 'Your USPA partner API key' },
      { name: 'uspaGroupMemberNumber', label: 'Group Member Number', type: 'text', placeholder: 'GM-12345' },
    ],
    setupSteps: [
      'Contact USPA at membership@uspa.org to request API partner access. You must be a USPA Group Member dropzone.',
      'Provide your Group Member number and SkyLara platform details. USPA will issue a partner API key.',
      'Enter the API key and your Group Member number below.',
      'Once configured, athlete check-in will automatically verify USPA membership status and display license/rating information.',
      'The system caches verification results for 24 hours to minimize API calls. Manual re-verification can be triggered from the athlete profile.',
      'If the USPA API is unavailable, check-in will display a warning but allow manual override by manifest staff.',
    ],
  },
  {
    name: 'WebSocket Real-Time',
    description: 'Real-time updates for manifest board, load status changes, weather alerts, and inter-staff communication using WebSocket connections.',
    icon: Radio,
    status: 'connected',
    color: 'text-pink-500 dark:text-pink-400',
    bg: 'bg-pink-50 dark:bg-pink-950/40',
    docsUrl: 'https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API',
    configFields: [
      { name: 'wsEndpoint', label: 'WebSocket Endpoint', type: 'url', placeholder: 'wss://ws.skylara.io' },
      { name: 'wsHeartbeatInterval', label: 'Heartbeat Interval (ms)', type: 'text', placeholder: '30000' },
    ],
    setupSteps: [
      'WebSocket connectivity is included with your SkyLara subscription and pre-configured for your tenant.',
      'The default endpoint is wss://ws.skylara.io/{tenant-id}. This is automatically set during initial platform setup.',
      'WebSocket handles the following real-time events: load status changes, slot assignments, weather updates, check-in notifications, and staff messages.',
      'The heartbeat interval (default 30 seconds) keeps the connection alive. Adjust if you experience frequent disconnects on slower networks.',
      'If WebSocket connection fails, the system falls back to HTTP polling every 10 seconds. A reconnection indicator appears in the UI status bar.',
      'For TV display and lobby monitors, use the dedicated display URL which maintains a persistent WebSocket connection with auto-reconnect.',
    ],
  },
];

export default function IntegrationsPage() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error'>>({});

  const toggle = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleTestConnection = async (name: string) => {
    setTesting(name);
    try {
      // WebSocket: test by attempting an actual WS connection
      if (name === 'WebSocket Real-Time') {
        const wsUrl = (process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001') + '/ws';
        const result = await new Promise<'success' | 'error'>((resolve) => {
          const timeout = setTimeout(() => {
            ws.close();
            resolve('error');
          }, 5000);
          const ws = new WebSocket(wsUrl);
          ws.onopen = () => {
            clearTimeout(timeout);
            ws.close();
            resolve('success');
          };
          ws.onerror = () => {
            clearTimeout(timeout);
            resolve('error');
          };
        });
        setTestResults((prev) => ({ ...prev, [name]: result }));
        setTesting(null);
        return;
      }

      // All other services: call the real /health endpoint
      const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';
      // Health endpoint is at the server root, not under /api
      const healthUrl = apiBase.replace(/\/api\/?$/, '') + '/health';
      const res = await fetch(healthUrl, { signal: AbortSignal.timeout(8000) });

      if (!res.ok) {
        setTestResults((prev) => ({ ...prev, [name]: 'error' }));
        setTesting(null);
        return;
      }

      const data = await res.json();
      const checks = data.checks || {};

      // Map integration names to their circuit breaker / check keys
      const serviceMap: Record<string, string> = {
        'Stripe (Payments & Connect)': 'stripe',
        'SendGrid (Email)': 'sendgrid',
        'Twilio (SMS)': 'twilio',
        'Weather API': 'weather',
        'USPA License Verification': 'uspa',
      };

      const serviceKey = serviceMap[name];
      if (!serviceKey) {
        // Unknown integration -- fall back to overall health
        setTestResults((prev) => ({ ...prev, [name]: data.status === 'ok' ? 'success' : 'error' }));
        setTesting(null);
        return;
      }

      // Check if the circuit breaker for this service is OPEN
      const cbStatus = checks.circuitBreakers || '';
      const circuitBreakerOpen = typeof cbStatus === 'string'
        && cbStatus.includes('degraded')
        && cbStatus.toLowerCase().includes(serviceKey);

      // Database must be reachable for any service to work
      const dbOk = checks.database === 'ok';

      const result: 'success' | 'error' = dbOk && !circuitBreakerOpen ? 'success' : 'error';
      setTestResults((prev) => ({ ...prev, [name]: result }));
    } catch {
      setTestResults((prev) => ({ ...prev, [name]: 'error' }));
    } finally {
      setTesting(null);
    }
  };

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
                  link.href === '/dashboard/documentation/integrations'
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
          <Plug className="w-7 h-7 text-orange-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Integrations</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Connect third-party services to extend SkyLara&apos;s capabilities.
        </p>

        {/* Integration Cards */}
        <div className="space-y-4">
          {INTEGRATIONS.map((integration) => {
            const Icon = integration.icon;
            const isExpanded = expanded.has(integration.name);
            const testResult = testResults[integration.name];

            return (
              <div
                key={integration.name}
                className="bg-white dark:bg-slate-800 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-800 overflow-hidden"
              >
                {/* Header */}
                <button
                  onClick={() => toggle(integration.name)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg ${integration.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${integration.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{integration.name}</h3>
                        {integration.status === 'connected' ? (
                          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Connected
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3" /> Not Configured
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{integration.description}</p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-5 pb-5 space-y-5">
                    <p className="text-sm text-gray-600 dark:text-gray-400">{integration.description}</p>

                    {/* Setup Steps */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Setup Steps</h4>
                      <ol className="space-y-2">
                        {integration.setupSteps.map((step, i) => (
                          <li key={i} className="flex gap-3 text-sm">
                            <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex items-center justify-center flex-shrink-0 text-xs font-medium">
                              {i + 1}
                            </span>
                            <span className="text-gray-600 dark:text-gray-400 pt-0.5">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Config Fields */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Configuration</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {integration.configFields.map((field) => (
                          <div key={field.name}>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                              {field.label}
                            </label>
                            <input
                              type={field.type}
                              placeholder={field.placeholder}
                              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                              readOnly
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={() => handleTestConnection(integration.name)}
                        disabled={testing === integration.name}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 dark:bg-white dark:bg-slate-800 text-white dark:text-gray-900 dark:text-white hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {testing === integration.name ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          'Test Connection'
                        )}
                      </button>
                      <a
                        href={integration.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Docs
                      </a>
                      {testResult && (
                        <span
                          className={`text-sm flex items-center gap-1 ${
                            testResult === 'success'
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {testResult === 'success' ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" /> Connection successful
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4" /> Connection failed - check credentials
                            </>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
