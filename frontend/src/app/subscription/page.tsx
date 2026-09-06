'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/utils';
import {
    Shield, BarChart3, Globe, Layers,
} from 'lucide-react';

import { CurrentPlanBanner } from './currentPlanBanner';
import { PlanCard } from './planCard';
import { SUBSCRIPTION_PLANS } from './constant';

function getPlanIdForRole(role: PlanType): string {
    const match = SUBSCRIPTION_PLANS.find((p) => p.planType.includes(role));
    return match?.id ?? 'free';
}

export default function SubscriptionPage() {
    const { user, isLoading, isAuthenticated, initialized } = useAuthStore();
    const router = useRouter();
    const role: PlanType = (user?.planType as PlanType) ?? 'FREE';

    const currentPlanId = getPlanIdForRole(role);
    const currentPlan =
        SUBSCRIPTION_PLANS.find((p) => p.id === currentPlanId) ?? SUBSCRIPTION_PLANS[0];
        
    useEffect(() => {
        if (initialized && !isLoading && !isAuthenticated) {
            router.replace('/login');
        }
    }, [isLoading, isAuthenticated, router]);

    if (initialized && !isLoading && !isAuthenticated) return null;

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            {/* ── Page header ── */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Manage your plan and billing. Upgrade or downgrade at any time.
                </p>
            </div>

            {/* ── Current plan banner ── */}
            <CurrentPlanBanner plan={currentPlan} />

            {/* ── Plans grid ── */}
            <div id="plans" className="scroll-mt-8">
                <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h2 className="text-base font-semibold text-gray-900">Available Plans</h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                            All plans include a 14-day free trial on first upgrade.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 border border-border rounded-lg px-3 py-2">
                        <Shield className="h-3.5 w-3.5 text-gray-400" />
                        Secure payments via Stripe · Cancel anytime
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 items-start">
                    {SUBSCRIPTION_PLANS.map((plan) => (
                        <PlanCard
                            key={plan.id}
                            plan={plan}
                            isCurrentPlan={plan.id === currentPlanId}
                        />
                    ))}
                </div>
            </div>

            {/* ── Feature comparison note ── */}
            <div className="mt-10 rounded-xl border border-border bg-gray-50 p-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {[
                        {
                            icon: BarChart3,
                            title: 'Advanced Analytics',
                            desc: 'Real-time click data, geographic breakdown, device analytics, and CSV export on Pro plans.',
                        },
                        {
                            icon: Globe,
                            title: 'Smart Routing',
                            desc: 'Route visitors by device, location, language, or time of day with A/B testing on Pro plans.',
                        },
                        {
                            icon: Layers,
                            title: 'Team & API Access',
                            desc: 'Full REST API, bulk creation, and team collaboration tools on Pro and Enterprise plans.',
                        },
                    ].map(({ icon: Icon, title, desc }) => (
                        <div key={title} className="flex items-start gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100">
                                <Icon className="h-4 w-4 text-brand-600" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-800">{title}</p>
                                <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Footer note ── */}
            <p className="mt-6 text-center text-xs text-gray-400">
                Prices shown in USD. Taxes may apply.{' '}
                <a href="/privacy" className="text-brand-600 hover:underline">Privacy Policy</a>
                {' · '}
                <a href="/terms" className="text-brand-600 hover:underline">Terms of Service</a>
            </p>
        </div>
    );
}
