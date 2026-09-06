'use client';

import { useState } from 'react';

import { cn } from '@/lib/utils';
import { Button, Badge, toast } from '@/components/ui';
import {
    Check, X, Sparkles, ArrowRight,
} from 'lucide-react';

import { formatPrice } from './utils';
import { useRouter } from 'next/navigation';




export function PlanCard({ plan, isCurrentPlan }: PlanCardProps) {

    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const price = formatPrice(plan);
    const PlanIcon = plan.icon;

    const isCurrent = isCurrentPlan;
    const isLoading = actionLoading === plan.id;
    const isCtaDisabled = isCurrent && plan.cta.action === 'current';

    const ctaVariant: ButtonVariant = isCurrent ? 'secondary' : plan.cta.variant;
    const ctaLabel = isCurrent ? 'Current Plan' : plan.cta.label;

    // Resolve badge: "Current Plan" badge overrides the plan's badge when active
    const badgeToShow: PlanBadge | undefined = isCurrent
        ? { label: 'Current Plan', variant: 'success' }
        : plan.badge;


    const {} = useMutation({
        mutationFn: async () => {
            // Simulate async — swap for real Stripe / billing API call     
    },
  
    // ── Handle CTA clicks ────────────────────────────────────────────────────────
    async function handlePlanAction(plan: SubscriptionPlan) {
        if (plan.cta.action === 'current') return;

        setActionLoading(plan.id);

        // Simulate async — swap for real Stripe / billing API call
        await new Promise((res) => setTimeout(res, 900));

        if (plan.cta.action === 'contact') {
            toast.info('Opening contact form… our sales team will reach out within 24 hours.');
        } else if (plan.cta.action === 'upgrade') {
            toast.success(`Redirecting to checkout for ${plan.name} (${plan.tagline})…`);
            router.push('/checkout?plan=' + plan.id)
        } else if (plan.cta.action === 'downgrade') {
            toast.warning('Downgrade scheduled for the end of your billing period.');
        }

        setActionLoading(null);
    }



    return (
        <div
            className={cn(
                'relative flex flex-col rounded-xl border bg-white transition-all duration-200',
                plan.featured && !isCurrent
                    ? 'border-brand-400 shadow-lg shadow-brand-100 ring-1 ring-brand-200'
                    : 'border-border shadow-sm hover:shadow-md hover:border-gray-300',
                isCurrent && 'border-green-300 ring-1 ring-green-200',
            )}
        >
            {/* Featured top accent bar */}
            {plan.featured && (
                <div className="absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r from-brand-500 to-purple-500" />
            )}

            <div className="flex flex-col flex-1 p-6 pt-7">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-5">
                    <div className="flex items-center gap-3">
                        <div
                            className={cn(
                                'flex h-10 w-10 items-center justify-center rounded-xl shrink-0',
                                plan.featured
                                    ? 'bg-gradient-to-br from-brand-500 to-purple-600 text-white'
                                    : isCurrent
                                        ? 'bg-green-100 text-green-600'
                                        : 'bg-gray-100 text-gray-600',
                            )}
                        >
                            <PlanIcon className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-base font-bold text-gray-900">{plan.name}</p>
                            <p className="text-xs text-gray-400">{plan.tagline}</p>
                        </div>
                    </div>

                    {badgeToShow && (
                        <Badge variant={badgeToShow.variant} className="shrink-0 mt-0.5 text-xs">
                            {badgeToShow.label}
                        </Badge>
                    )}
                </div>

                {/* Price */}
                <div className="mb-5">
                    <div className="flex items-end gap-1.5">
                        <span
                            className={cn(
                                'text-4xl font-extrabold tracking-tight',
                                plan.featured ? 'text-brand-700' : 'text-gray-900',
                            )}
                        >
                            {price.main}
                        </span>
                        {price.sub && (
                            <span className="mb-1.5 text-sm text-gray-400">{price.sub}</span>
                        )}
                    </div>
                    {price.note && (
                        <p className="mt-0.5 text-xs text-gray-400">{price.note}</p>
                    )}
                    {plan.period === 'year' && (
                        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700 border border-green-200">
                            <Sparkles className="h-3 w-3" />
                            Save 17% vs monthly
                        </span>
                    )}
                </div>

                {/* Description */}
                <p className="mb-6 text-sm text-gray-500 leading-relaxed">{plan.description}</p>

                {/* CTA Button */}
                <Button
                    variant={ctaVariant}
                    className="w-full"
                    disabled={isCtaDisabled}
                    loading={isLoading}
                    onClick={() => !isCtaDisabled && handlePlanAction(plan)}
                    icon={
                        !isCurrent && plan.cta.action !== 'contact'
                            ? <ArrowRight className="h-4 w-4" />
                            : undefined
                    }
                >
                    {ctaLabel}
                </Button>

                {/* Feature divider */}
                <div className="my-6 border-t border-gray-100" />

                {/* Features */}
                <ul className="flex-1 space-y-3">
                    {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                            {feature.included ? (
                                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-100">
                                    <Check className="h-2.5 w-2.5 text-green-600" strokeWidth={3} />
                                </span>
                            ) : (
                                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gray-100">
                                    <X className="h-2.5 w-2.5 text-gray-400" strokeWidth={3} />
                                </span>
                            )}
                            <span
                                className={cn(
                                    'text-sm leading-snug',
                                    feature.included ? 'text-gray-700' : 'text-gray-400',
                                )}
                            >
                                {feature.label}
                                {feature.note && (
                                    <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
                                        {feature.note}
                                    </span>
                                )}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}