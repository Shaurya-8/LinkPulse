// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type BadgeVariant = 'success' | 'purple' | 'warning' | 'info' | 'default';
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type CtaAction = 'current' | 'upgrade' | 'contact' | 'downgrade';
type UserRole = 'USER' | 'ADMIN';
type PlanType = 'FREE' | 'PRO' | 'ENTERPRISE';

interface PlanFeature {
    label: string;
    included: boolean;
    note?: string;
}

interface PlanBadge {
    label: string;
    variant: BadgeVariant;
}

interface PlanCta {
    label: string;
    variant: ButtonVariant;
    action: CtaAction;
}

interface SubscriptionPlan {
    id: string;
    name: string;
    tagline: string;
    description: string;
    price: number | null;
    period: 'month' | 'year' | null;
    monthlyEquivalent?: number;
    badge?: PlanBadge;
    featured?: boolean;
    icon: React.ElementType;
    planType: PlanType;
    // roleMatch: UserRole[];
    cta: PlanCta;
    features: PlanFeature[];
}
// ─────────────────────────────────────────────────────────────────────────────
// PlanCard Component
// ─────────────────────────────────────────────────────────────────────────────

interface PlanCardProps {
    plan: SubscriptionPlan;
    isCurrentPlan: boolean;
}
