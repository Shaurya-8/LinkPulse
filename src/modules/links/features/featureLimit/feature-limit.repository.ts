import {
    FeatureKey,
    Prisma,
    PrismaClient,
} from "../../../../../generated/prisma/client";
import { DbClient } from "../../../../config/prisma";
import { PlanId } from "../../../../types";

export class FeatureLimitRepository {
    constructor(
        private readonly prisma: PrismaClient
    ) { }


    findById(
        id: string,
        tx: DbClient = this.prisma
    ) {
        return tx.featureLimits.findUnique({
            where: {
                id,
            },
            include: {
                feature: true,
                plan: true,
            },
        });
    }

    findByPlanAndFeature(
        planId: PlanId,
        featureKey: FeatureKey,
        tx: DbClient = this.prisma
    ) {
        return tx.featureLimits.findUnique({
            where: {
                planId_featureKey: {
                    planId,
                    featureKey,
                },
            },
        });
    }

    findByPlan(
        planId: PlanId,
        tx: DbClient = this.prisma
    ) {
        return tx.featureLimits.findMany({
            where: {
                planId,
            },
            orderBy: {
                featureKey: "asc",

            },
        });
    }
    findFeatureKey(
        planId: PlanId,
        tx: DbClient = this.prisma
    ) {
        return tx.featureLimits.findMany({
            where: {
                planId,
            },
            select: {
                featureKey: true
            },
            orderBy: {
                featureKey: "asc",
            },
        });
    }

    create(
        data: Prisma.FeatureLimitsUncheckedCreateInput,
        tx: DbClient = this.prisma
    ) {
        return tx.featureLimits.create({
            data,
        });
    }

    createMany(
        data: Prisma.FeatureLimitsCreateManyInput[],
        tx: DbClient = this.prisma
    ) {
        return tx.featureLimits.createMany({
            data,
            skipDuplicates: true,
        });
    }

    update(
        id: string,
        data: Prisma.FeatureLimitsUpdateInput,
        tx: DbClient = this.prisma
    ) {
        return tx.featureLimits.update({
            where: {
                id,
            },
            data,
        });
    }

    delete(
        id: string,
        tx: DbClient = this.prisma
    ) {
        return tx.featureLimits.delete({
            where: {
                id,
            },
        });
    }

    deleteByPlan(
        planId: PlanId,
        tx: DbClient = this.prisma
    ) {
        return tx.featureLimits.deleteMany({
            where: {
                planId,
            },
        });
    }

    upsert(
        planId: PlanId,
        featureKey: FeatureKey,
        limitValue: number,
        tx: DbClient = this.prisma
    ) {
        return tx.featureLimits.upsert({
            where: {
                planId_featureKey: {
                    planId,
                    featureKey,
                },
            },
            create: {
                planId,
                featureKey,
                limitValue,
            },
            update: {
                limitValue,
            },
        });
    }
}