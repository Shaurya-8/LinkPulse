export function formatPrice(plan: SubscriptionPlan): {
    main: string;
    sub: string;
    note?: string;
} {
    if (plan.price === null) {
        return { main: 'Custom', sub: 'Contact us for a quote' };
    }
    if (plan.price === 0) {
        return { main: '$0', sub: 'Free forever' };
    }
    if (plan.period === 'year') {
        return {
            main: `$${plan.monthlyEquivalent?.toFixed(2) ?? (plan.price / 12).toFixed(2)}`,
            sub: 'per month',
            note: `Billed $${plan.price}/year`,
        };
    }
    return {
        main: `$${plan.price}`,
        sub: `per ${plan.period}`,
    };
}