import { prisma } from "../../config/prisma";
export class Resolver {
    // ─────────────────────────────────────────────
    // Redirect Resolution
    // ─────────────────────────────────────────────
    async resolveRedirectTarget(link, context) {
        if (link.redirectRules?.length) {
            for (const rule of link.redirectRules) {
                if (!rule.isActive)
                    continue;
                if (this.evaluateCondition(rule, context))
                    return { url: rule.targetUrl };
            }
        }
        const activeTest = link.abTests?.find((t) => t.isActive);
        if (activeTest?.variants?.length) {
            const variant = this.selectVariantByWeight(activeTest.variants);
            if (variant) {
                prisma.aBTestVariant.update({ where: { id: variant.id }, data: { clicks: { increment: 1 } } }).catch(() => { });
                return { url: variant.url, variantId: variant.id };
            }
        }
        return { url: link.longUrl };
    }
    evaluateCondition(rule, context) {
        try {
            const condition = JSON.parse(rule.conditionValue);
            const { values } = condition;
            switch (rule.conditionType) {
                case 'DEVICE': return values.includes(context.device ?? '');
                case 'GEO': return values.map((v) => v.toLowerCase()).includes((context.country ?? '').toLowerCase());
                case 'LANGUAGE': return values.some((v) => (context.language ?? '').toLowerCase().startsWith(v.toLowerCase()));
                case 'TIME_OF_DAY': {
                    const [s, e] = values.map(Number);
                    return context.hour >= s && context.hour < e;
                }
                case 'DAY_OF_WEEK': return values.map(Number).includes(context.dayOfWeek);
                case 'DATE_RANGE': return context.date >= values[0] && context.date <= values[1];
                default: return false;
            }
        }
        catch {
            return false;
        }
    }
    selectVariantByWeight(variants) {
        const total = variants.reduce((s, v) => s + v.weight, 0);
        if (total === 0)
            return null;
        let random = Math.random() * total;
        for (const v of variants) {
            random -= v.weight;
            if (random <= 0)
                return v;
        }
        return variants[variants.length - 1] ?? null;
    }
}
//# sourceMappingURL=Resolver.js.map