'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { string, z } from 'zod';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { linksApi, LinkData, authApi } from '@/lib/api';
import { copyToClipboard, formatNumber, useAuthStore } from '@/lib/utils';
import {
  Link2, Zap, Shield, BarChart3, Copy, Check, ExternalLink,
  QrCode, Globe, ArrowRight, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui';

const shortenSchema = z.object({
  longUrl: z.string().url('Please enter a valid URL (include https://)'),
  customAlias: z
    .string()
    .regex(/^[a-zA-Z0-9_-]*$/, 'Only letters, numbers, hyphens and underscores')
    .max(64)
    .optional()
    .or(z.literal('')),
});
type ShortenForm = z.infer<typeof shortenSchema>;

const STATS = [
  { label: 'Links Shortened', value: '2.4M+' },
  { label: 'Clicks Tracked', value: '18B+' },
  { label: 'Countries', value: '190+' },
  { label: 'Uptime', value: '99.9%' },
];

const FEATURES = [
  {
    icon: Zap,
    title: 'Instant Shortening',
    description: 'Create short links in milliseconds. No sign-up required for basic use.',
  },
  {
    icon: BarChart3,
    title: 'Deep Analytics',
    description: 'Track clicks, geo data, devices, browsers, and referrers in real time.',
  },
  {
    icon: Shield,
    title: 'Security First',
    description: 'Malicious URL detection, rate limiting, bot filtering, and IP blocking.',
  },
  {
    icon: QrCode,
    title: 'Dynamic QR Codes',
    description: 'Auto-generate branded QR codes that update when you change the destination.',
  },
  {
    icon: Globe,
    title: 'Smart Routing',
    description: 'Route visitors based on device, location, language, or time of day.',
  },
  {
    icon: Sparkles,
    title: 'A/B Testing',
    description: 'Split traffic between destinations and find what converts best.',
  },
];

export default function LandingPage() {
  const [copied, setCopied] = useState(false);

  const [result, setResult] = useState<{
    url: string;
    expiresAt?: Date;
  } | null>(null);
  const isAthenicated = useAuthStore((s) => s.isAuthenticated);
  const loading = useAuthStore((state) => state.isLoading);
  const { clearVerification } = useAuthStore((state) => state);


  const { mutate: logoutUser, isPending: isLoggingOut } = useMutation({
    mutationFn: () => authApi.logout(),

    onSuccess: () => {
      clearVerification();
      window.location.href = "/";
    },

    onError: () => {
      clearVerification();
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ShortenForm>({ resolver: zodResolver(shortenSchema) });

  const { mutate: shortenUrl, isPending, error: mutationError } = useMutation({
    mutationFn: (data: ShortenForm) =>
      linksApi.create({
        longUrl: data.longUrl,
        ...(data.customAlias && { customAlias: data.customAlias }),
      }),
    onSuccess: (response) => {
      setResult(response.data.data);
      reset();
    },
  });

  async function handleCopy(url: string) {
    await copyToClipboard(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
                <Link2 className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">LinkPulse</span>
            </Link>
            <div className="flex items-center gap-3">
              {
                !loading ? (

                  isAthenicated ? (<>
                    <Link
                      href="/dashboard"
                      className="btn-secondary px-4 py-2 text-sm font-medium"
                    >
                      Dashboard
                    </Link>
                    <Button onClick={() => logoutUser()} disabled={isLoggingOut}>Logout</Button>
                  </>) : (<>
                    <Link href="/login" className="btn-ghost text-sm">Sign in</Link>
                    <Link href="/register" className="btn-primary text-sm">
                      Get started free
                    </Link></>
                  )
                ) : null
              }
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50/60 via-white to-white pt-20 pb-24">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-brand-100 opacity-40 blur-3xl" />
          <div className="absolute -bottom-20 -left-40 h-80 w-80 rounded-full bg-purple-100 opacity-30 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 text-sm font-medium text-brand-700">
            <Sparkles className="h-3.5 w-3.5" />
            Advanced URL Management Platform
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-gray-900 leading-[1.1]">
            Short links that
            <br />
            <span className="gradient-text">work smarter</span>
          </h1>

          <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Shorten URLs, track every click, generate branded QR codes, and route
            traffic intelligently — all from one powerful platform.
          </p>

          {/* Shortener Widget */}
          <div className="mt-10 max-w-2xl mx-auto">
            <form
              onSubmit={handleSubmit((data) => shortenUrl(data))}
              className="card p-4 shadow-lg border-brand-100"
            >
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    {...register('longUrl')}
                    type="url"
                    placeholder="Paste your long URL here..."
                    className="input h-12 text-base"
                    autoFocus
                  />
                  {errors.longUrl && (
                    <p className="mt-1 text-xs text-red-500">{errors.longUrl.message}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary h-12 px-6 text-base shrink-0"
                >
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Shortening...
                    </span>
                  ) : (
                    <>Shorten <ArrowRight className="h-4 w-4" /></>
                  )}
                </button>
              </div>

              {/* Optional custom alias */}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-gray-500 shrink-0">Custom alias:</span>
                <input
                  {...register('customAlias')}
                  type="text"
                  placeholder="my-link (optional)"
                  className="input h-8 text-sm"
                />
              </div>

              {mutationError && (
                <p className="mt-2 text-sm text-red-500">
                  {(mutationError as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to shorten URL. Please try again.'}
                </p>
              )}
            </form>

            {/* Result */}
            {result && (
              <div className="mt-3 card border-brand-200 bg-brand-50/50 animate-slide-up">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-1">Your short link is ready:</p>
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1.5 truncate"
                    >
                      {result.url}
                      <ExternalLink className="h-4 w-4 shrink-0" />
                    </a>
                  </div>
                  <button
                    onClick={() => handleCopy(result.url)}
                    className="btn-secondary shrink-0"
                  >
                    {copied ? (
                      <><Check className="h-4 w-4 text-green-500" /> Copied!</>
                    ) : (
                      <><Copy className="h-4 w-4" /> Copy</>
                    )}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  <Link href="/register" className="text-brand-600 font-medium hover:underline">
                    Create an account
                  </Link>{' '}
                  to track analytics, add a password, set an expiry, and more.
                </p>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-6">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-extrabold text-gray-900">{stat.value}</div>
                <div className="text-sm text-gray-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              Everything you need to manage links
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              From simple shortening to enterprise-grade traffic routing and analytics.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="card hover:shadow-md hover:border-brand-200 transition-all">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100">
                  <Icon className="h-5 w-5 text-brand-600" />
                </div>
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-brand-600 to-purple-700">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Ready to take control of your links?
          </h2>
          <p className="mt-4 text-lg text-brand-100">
            Join thousands of teams using LinkPulse to manage, track, and optimise their links.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-semibold text-brand-700 shadow hover:bg-brand-50 transition-all"
            >
              Start for free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-white/30 px-6 py-3 text-base font-semibold text-white hover:border-white/60 transition-all"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-10">
        <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600">
              <Link2 className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900">LinkPulse</span>
          </div>
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} LinkPulse. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
