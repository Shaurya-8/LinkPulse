import {
    BillingPeriod,
    FeatureKey,
    PlanType,
} from "../generated/prisma/client";
import { prisma } from '../src/config/prisma'

async function main() {
    // ------------------------
    // Plans
    // ------------------------
    await prisma.plans.createMany({
        data: [
            { name: PlanType.FREE },
            { name: PlanType.PRO },
            { name: PlanType.ENTERPRISE },
        ],
        skipDuplicates: true,
    });

    const plans = await prisma.plans.findMany();

    const planMap = Object.fromEntries(
        plans.map((p) => [p.name, p.id])
    );

    // ------------------------
    // Plan Prices
    // ------------------------
    await prisma.planPrices.createMany({
        data: [
            {
                planId: planMap[PlanType.FREE],
                billingPeriod: BillingPeriod.MONTHLY,
                price: 0,
                currency: "USD",
            },
            {
                planId: planMap[PlanType.PRO],
                billingPeriod: BillingPeriod.MONTHLY,
                price: 9.99,
                currency: "USD",
            },
            {
                planId: planMap[PlanType.PRO],
                billingPeriod: BillingPeriod.YEARLY,
                price: 99.99,
                currency: "USD",
            },
            {
                planId: planMap[PlanType.ENTERPRISE],
                billingPeriod: BillingPeriod.MONTHLY,
                price: 49.99,
                currency: "USD",
            },
            {
                planId: planMap[PlanType.ENTERPRISE],
                billingPeriod: BillingPeriod.YEARLY,
                price: 499.99,
                currency: "USD",
            },
        ],
        skipDuplicates: true,
    });

    // ------------------------
    // Feature Limits
    // ------------------------
    const limits: Record<PlanType, Record<FeatureKey, number>> = {
        [PlanType.FREE]: {
            [FeatureKey.CREATE_LINK]: 100,
            [FeatureKey.CUSTOM_ALIAS]: 0,
            [FeatureKey.PASSWORD_PROTECTION]: 0,
            [FeatureKey.LINK_EXPIRATION]: 0,
            [FeatureKey.ONE_TIME_LINKS]: 0,
            [FeatureKey.QR_CODE]: 10,
            [FeatureKey.CUSTOM_DOMAIN]: 0,
        },

        [PlanType.PRO]: {
            [FeatureKey.CREATE_LINK]: -1,
            [FeatureKey.CUSTOM_ALIAS]: -1,
            [FeatureKey.PASSWORD_PROTECTION]: -1,
            [FeatureKey.LINK_EXPIRATION]: -1,
            [FeatureKey.ONE_TIME_LINKS]: -1,
            [FeatureKey.QR_CODE]: 1000,
            [FeatureKey.CUSTOM_DOMAIN]: 5,
        },

        [PlanType.ENTERPRISE]: {
            [FeatureKey.CREATE_LINK]: -1,
            [FeatureKey.CUSTOM_ALIAS]: -1,
            [FeatureKey.PASSWORD_PROTECTION]: -1,
            [FeatureKey.LINK_EXPIRATION]: -1,
            [FeatureKey.ONE_TIME_LINKS]: -1,
            [FeatureKey.QR_CODE]: -1,
            [FeatureKey.CUSTOM_DOMAIN]: -1,
        },
    };

    const featureLimits = Object.entries(limits).flatMap(
        ([planName, features]) =>
            Object.entries(features).map(([featureKey, limitValue]) => ({
                planId: planMap[planName as PlanType],
                featureKey: featureKey as FeatureKey,
                limitValue,
            }))
    );

    await prisma.featureLimits.createMany({
        data: featureLimits,
        skipDuplicates: true,
    });

    console.log("✅ Database seeded");
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });

    // pnpm prisma db seed
// docker compose exec app pnpm prisma db seed