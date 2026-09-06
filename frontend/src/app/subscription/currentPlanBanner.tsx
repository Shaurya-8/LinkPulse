
import { Badge } from '@/components/ui';
import { Sparkles } from 'lucide-react';
import { formatPrice } from './utils';

// ─────────────────────────────────────────────────────────────────────────────
// Current Plan Summary Banner
// ─────────────────────────────────────────────────────────────────────────────

export function CurrentPlanBanner({
    plan,
}: {
    plan: SubscriptionPlan;
}) {
    const PlanIcon = plan.icon;
    const price = formatPrice(plan);

    const planTypeLabel: Record<PlanType, string> = {
        FREE: 'Free',
        PRO: 'Pro',
        ENTERPRISE: 'Enterprise',
    };

    return (
        <div className="card mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-gradient-to-r from-brand-50 via-white to-purple-50 border-brand-100">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100">
                <PlanIcon className="h-6 w-6 text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">
                        You're on the <span className="text-brand-700">{planTypeLabel[plan.planType]}</span> plan
                    </p>
                    <Badge variant="success" dot>Active</Badge>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                    {plan.price === 0
                        ? 'Free forever — upgrade anytime to unlock advanced features.'
                        : plan.price === null
                            ? 'Enterprise plan — contact your account manager for changes.'
                            : `${price.main} ${price.sub} · ${price.note ?? ''}`}
                </p>
            </div>
            {plan.planType[0] === 'FREE' && (
                <a
                    href="#plans"
                    className="btn-primary text-sm shrink-0"
                >
                    <Sparkles className="h-3.5 w-3.5" />
                    See upgrade options
                </a>
            )}
        </div>
    );
}