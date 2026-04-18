'use client';

import Link from 'next/link';
import {
  Users,
  Award,
  Building2,
  ArrowRight,
  Shield,
  Globe,
  CheckCircle,
  Plane,
} from 'lucide-react';

const flows = [
  {
    title: 'Coach Registration',
    description: 'Apply as a skydiving coach. Share your disciplines, experience, and availability to join events and boogies worldwide.',
    href: '/onboarding/coaches/register',
    icon: Users,
    color: 'from-purple-600 to-indigo-700',
    iconBg: 'bg-purple-100 text-purple-700',
    features: ['Discipline selection', 'Language preferences', 'Tunnel & canopy coaching', 'Availability calendar'],
  },
  {
    title: 'Instructor Registration',
    description: 'Apply as a tandem instructor (TI), AFF instructor (AFFI), or rated instructor. Provide your credentials for verification.',
    href: '/onboarding/instructors/register',
    icon: Award,
    color: 'from-blue-600 to-cyan-700',
    iconBg: 'bg-blue-100 text-blue-700',
    features: ['TI / AFFI / Coach ratings', 'License verification', 'Insurance confirmation', 'Rating details'],
  },
  {
    title: 'Dropzone Partnership',
    description: 'Register your dropzone as a SkyLara partner. Set up aircraft, disciplines, facilities, and go live with digital manifest.',
    href: '/onboarding/dropzones/register',
    icon: Building2,
    color: 'from-emerald-600 to-teal-700',
    iconBg: 'bg-emerald-100 text-emerald-700',
    features: ['Aircraft & altitude setup', 'Discipline support', 'Facility configuration', 'Payment & manifest readiness'],
  },
];

export default function OnboardingLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-blue-400 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-400 rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-sm">
              <Plane className="h-4 w-4" />
              SkyLara Partner Onboarding
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Join the SkyLara Network
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-blue-100">
              Whether you're a coach, instructor, or dropzone operator — register once and connect with events, boogies, and jumpers worldwide.
            </p>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-blue-200">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Verified credentials</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span>10+ languages supported</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>USPA & BPA aligned</span>
            </div>
          </div>
        </div>
      </div>

      {/* Registration Cards */}
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Choose Your Registration Path</h2>
          <p className="mt-3 text-gray-600">Select the option that best describes your role. You can always update your profile later.</p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {flows.map((flow) => {
            const Icon = flow.icon;
            return (
              <Link
                key={flow.href}
                href={flow.href}
                className="group relative flex flex-col rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1"
              >
                {/* Icon */}
                <div className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl ${flow.iconBg}`}>
                  <Icon className="h-7 w-7" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-gray-900">{flow.title}</h3>
                <p className="mt-3 flex-1 text-sm text-gray-600 leading-relaxed">{flow.description}</p>

                {/* Features */}
                <ul className="mt-6 space-y-2">
                  {flow.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className={`mt-8 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${flow.color} px-6 py-3 font-semibold text-white transition-all group-hover:shadow-lg`}>
                  Get Started
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Already registered */}
        <div className="mt-16 text-center">
          <p className="text-gray-600">
            Already have a SkyLara account?{' '}
            <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
              Sign in here
            </Link>{' '}
            — your data will be prefilled automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
